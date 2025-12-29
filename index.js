const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const { query, initDb } = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Initialize Database
initDb().catch(err => console.error('DB Init Error:', err));

// Helper to get current time (deterministic if TEST_MODE=1)
const getCurrentTime = (req) => {
  if (process.env.TEST_MODE === '1' && req.headers['x-test-now-ms']) {
    return new Date(parseInt(req.headers['x-test-now-ms']));
  }
  return new Date();
};

// Health Check
app.get('/api/healthz', async (req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Database connection failed' });
  }
});

// Create a Paste
app.post('/api/pastes', async (req, res) => {
  try {
    const { content, ttl_seconds, max_views } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'content is required and must be a non-empty string' });
    }

    if (ttl_seconds !== undefined) {
      if (!Number.isInteger(ttl_seconds) || ttl_seconds < 1) {
        return res.status(400).json({ error: 'ttl_seconds must be an integer >= 1' });
      }
    }

    if (max_views !== undefined) {
      if (!Number.isInteger(max_views) || max_views < 1) {
        return res.status(400).json({ error: 'max_views must be an integer >= 1' });
      }
    }

    const id = nanoid();
    const now = getCurrentTime(req);
    let expiresAt = null;
    if (ttl_seconds) {
      expiresAt = new Date(now.getTime() + ttl_seconds * 1000);
    }

    await query(
      'INSERT INTO pastes (id, content, expires_at, max_views, remaining_views) VALUES ($1, $2, $3, $4, $5)',
      [id, content, expiresAt, max_views || null, max_views || null]
    );

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['host'];
    const url = `${protocol}://${host}/p/${id}`;

    res.status(201).json({ id, url });
  } catch (err) {
    console.error('Error creating paste:', err);
    res.status(500).json({ error: 'Failed to create paste' });
  }
});

// Fetch a Paste (API)
app.get('/api/pastes/:id', async (req, res) => {
  const { id } = req.params;
  const now = getCurrentTime(req);

  try {
    // Use a transaction or a single atomic update to handle concurrency
    const result = await query(
      `UPDATE pastes 
       SET remaining_views = CASE WHEN remaining_views IS NOT NULL THEN remaining_views - 1 ELSE NULL END
       WHERE id = $1 
         AND (expires_at IS NULL OR expires_at > $2)
         AND (max_views IS NULL OR remaining_views > 0)
       RETURNING content, remaining_views, expires_at`,
      [id, now]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paste not found or unavailable' });
    }

    const paste = result.rows[0];
    res.status(200).json({
      content: paste.content,
      remaining_views: paste.remaining_views,
      expires_at: paste.expires_at ? paste.expires_at.toISOString() : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// View a Paste (HTML)
app.get('/p/:id', async (req, res) => {
  const { id } = req.params;
  const now = getCurrentTime(req);

  try {
    // Similar check as API, but for HTML view
    const result = await query(
      `UPDATE pastes 
       SET remaining_views = CASE WHEN remaining_views IS NOT NULL THEN remaining_views - 1 ELSE NULL END
       WHERE id = $1 
         AND (expires_at IS NULL OR expires_at > $2)
         AND (max_views IS NULL OR remaining_views > 0)
       RETURNING content, remaining_views, expires_at`,
      [id, now]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('<h1>404 - Paste not found or unavailable</h1>');
    }

    const paste = result.rows[0];
    // Escape HTML to prevent XSS
    const escapedContent = paste.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>View Paste | Pastebin-Lite</title>
          <style>
            :root {
              --primary: #6366f1;
              --bg: #f8fafc;
              --card-bg: #ffffff;
              --text: #1e293b;
              --border: #e2e8f0;
            }
            body { 
              font-family: 'Inter', system-ui, sans-serif; 
              padding: 2rem; 
              background-color: var(--bg); 
              color: var(--text);
              display: flex;
              flex-direction: column;
              align-items: center;
              min-height: 100vh;
              margin: 0;
            }
            .container {
              max-width: 800px;
              width: 100%;
              background: var(--card-bg);
              padding: 2.5rem;
              border-radius: 1rem;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            h1 { color: var(--primary); margin-top: 0; font-size: 1.875rem; }
            pre { 
              background: #f1f5f9; 
              padding: 1.5rem; 
              border-radius: 0.5rem; 
              border: 1px solid var(--border); 
              white-space: pre-wrap; 
              word-wrap: break-word; 
              font-family: 'Fira Code', monospace;
              font-size: 0.9375rem;
              line-height: 1.6;
              color: #334155;
            }
            .meta {
              margin-top: 1.5rem;
              font-size: 0.875rem;
              color: #64748b;
              display: flex;
              gap: 1.5rem;
              padding: 1rem;
              background: #f8fafc;
              border-radius: 0.5rem;
              margin-bottom: 1rem;
            }
            .back-link {
              margin-top: 2rem;
              color: var(--primary);
              text-decoration: none;
              font-weight: 600;
              font-size: 0.875rem;
            }
            .back-link:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>View Paste</h1>
            <div class="meta">
              <span>Remaining Views: ${paste.remaining_views !== null ? paste.remaining_views : 'Unlimited'}</span>
              <span>Expires At: ${paste.expires_at ? new Date(paste.expires_at).toLocaleString() : 'Never'}</span>
            </div>
            <pre>${escapedContent}</pre>
          </div>
          <a href="/" class="back-link">← Create New Paste</a>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

// Start Server
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

