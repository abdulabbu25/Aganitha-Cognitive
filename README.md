# Pastebin-Lite

A modern, secure, and persistent "Pastebin"-like application built with React, Node.js, and PostgreSQL.

## 🚀 Features

- **Secure Paste Creation**: Create text pastes with high-performance unique IDs.
- **Persistence**: Built on PostgreSQL (Neon-compatible) for reliable storage.
- **Constraints**:
  - **Time-based Expiry (TTL)**: Pastes automatically become unavailable after a set duration.
  - **View Count Limits**: Restrict how many times a paste can be accessed.
- **Safety First**: Content is escaped on the server to prevent XSS attacks.
- **Responsive UI**: Modern, clean interface with instant feedback.
- **Deterministic Testing**: Support for `TEST_MODE` to verify time-sensitive logic.

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, Plain CSS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (pg)
- **Deployment**: Vercel (recommended)

## 💻 Local Setup

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd <your-repo-name>

# Install all dependencies
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

### 3. Environment Variables
Create a `.env` file in the `server` directory:
```env
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/db_name
TEST_MODE=0
```

### 4. Database Initialization
The application automatically initializes the database schema on startup if it doesn't exist.

### 5. Run the App
```bash
npm run dev
```
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/healthz` | Health check & DB connectivity |
| `POST` | `/api/pastes` | Create a new paste |
| `GET` | `/api/pastes/:id` | Fetch paste JSON (counts as a view) |
| `GET` | `/p/:id` | View paste HTML (counts as a view) |

## 🧪 Testing Expiry
Set `TEST_MODE=1` in your environment. Send the `x-test-now-ms` header with the desired timestamp (milliseconds since epoch) to simulate different times.

## 🚀 Deployment
This project is configured for easy deployment on **Vercel** using the included `vercel.json`.

**Please give the public URL for testing**
`https://your-pastebin-lite.vercel.app`

**Video demonstration link**
`https://drive.google.com/file/d/your-id/view`
