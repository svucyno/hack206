# Coastal Guard AI — Backend

A simple Node.js + Express REST API for the Coastal Guard AI platform.

---

## 🚀 How to Run (Step by Step)

### 1. Open a terminal in the `backend` folder
```bash
cd backend
```

### 2. Install dependencies (only needed once)
```bash
npm install
```

### 3. Start the server
```bash
node server.js
```

You should see:
```
🛡️  Coastal Guard AI Backend is running!
🌐  API URL: http://localhost:4000
```

> **Tip:** Use `npm run dev` instead to auto-restart when you edit files.

---

## 📡 API Endpoints

| Method | URL | What it does |
|--------|-----|-------------|
| GET | `/api/health` | Check if server is running |
| GET | `/api/weather` | Get current weather data |
| GET | `/api/risk` | Get AI-computed risk level |
| GET | `/api/family` | Get family member statuses |
| PATCH | `/api/family/:id` | Update a member's status |
| GET | `/api/gas` | Get gas distributor list |
| PATCH | `/api/gas/:id` | Update gas stock level |
| GET | `/api/shelters` | Get shelters & danger zones |
| GET | `/api/reports` | Get community reports |
| POST | `/api/reports` | Submit a new report |
| GET | `/api/sos` | Get active SOS requests |
| POST | `/api/sos` | Create a new SOS request |

---

## 📁 File Structure

```
backend/
├── server.js        ← All the API code (start here!)
├── package.json     ← Project config and dependencies
└── data/
    ├── weather.json     ← Weather data
    ├── family.json      ← Family member statuses
    ├── gas.json         ← Gas distributor data
    ├── shelters.json    ← Shelter & danger zone locations
    ├── reports.json     ← Community reports (grows as users submit)
    └── sos.json         ← SOS rescue requests (grows as users submit)
```

---

## 💡 How it Works (for Beginners)

1. **Express** handles incoming requests (like a post office that sorts mail)
2. **Routes** decide what to do with each request (e.g. GET /api/weather → read weather.json)
3. **JSON files** store the data (like a simple spreadsheet saved as a file)
4. **CORS** lets the frontend (port 3000) talk to the backend (port 4000)

---

## 🧪 Test the API

Open your browser and visit:
- http://localhost:4000/api/health
- http://localhost:4000/api/weather
- http://localhost:4000/api/risk

Or test POST endpoints with a tool like **Postman** or **Thunder Client** (VS Code extension).
