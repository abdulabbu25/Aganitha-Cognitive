import { useState } from 'react';
import './App.css';

function App() {
  const [content, setContent] = useState('');
  const [ttl, setTtl] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [copySuccess, setCopySuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setCopySuccess(false);

    // Client-side validation
    if (!content.trim()) {
      setError('Content cannot be empty');
      setLoading(false);
      return;
    }

    const body = {
      content,
      ttl_seconds: ttl ? parseInt(ttl) : undefined,
      max_views: maxViews ? parseInt(maxViews) : undefined,
    };

    try {
      const response = await fetch('/api/pastes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create paste');
      }

      setResult(data);
      setContent('');
      setTtl('');
      setMaxViews('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result.url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="container">
      <h1>Pastebin-Lite</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="content">Paste Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder="Write or paste your text here..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ttl">Expiry (Seconds)</label>
            <input
              type="number"
              id="ttl"
              value={ttl}
              onChange={(e) => setTtl(e.target.value)}
              min="1"
              placeholder="e.g. 3600"
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxViews">Max Views</label>
            <input
              type="number"
              id="maxViews"
              value={maxViews}
              onChange={(e) => setMaxViews(e.target.value)}
              min="1"
              placeholder="e.g. 5"
            />
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating Paste...' : 'Create Secure Paste'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result">
          <h3>Paste Created Successfully!</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Your paste is now live. Share the link below:</p>
          <div className="url-box">
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              {result.url}
            </a>
            <button onClick={copyToClipboard}>
              {copySuccess ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
          {copySuccess && <div className="copy-success">Link copied to clipboard!</div>}
        </div>
      )}
    </div>
  );
}

export default App;
