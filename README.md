# HTTPBin Monitor

**Real-time monitoring application for httpbin.org with intelligent anomaly detection**

---

## 📋 Purpose

A full-stack monitoring system that automatically pings `httpbin.org/anything` every 5 minutes, stores response metrics, and provides real-time visualization with statistical anomaly detection. Built to demonstrate modern TypeScript, React, Node.js, and WebSocket practices.

---

## 🏗️ Architecture

### **Backend** (Node.js + Express + TypeScript)
- **Express Server** - REST API on port 8001
- **Socket.io** - WebSocket for real-time updates
- **SQLite** - Database with indexed queries (timestamp, status_code, response_time)
- **Services:**
  - `PingService` - Periodic HTTP requests to httpbin.org with random JSON payloads
  - `AnomalyDetectionService` - Z-score statistical analysis (runs every 10 minutes)
  - `DatabaseService` - CRUD operations with filtering and pagination
- **Middleware:** Helmet, CORS, Compression, Morgan logging, Joi validation
- **Logging:** Winston (structured logs to `logs/` directory)

### **Frontend** (Next.js + React + TypeScript)
- **Next.js 14** - React framework with SSR
- **Components:**
  - `Dashboard` - Main monitoring interface
  - `StatsCards` - Total requests, avg response time, success rate
  - `ResponseTimeChart` - Recharts visualization
  - `DataTable` - Filterable/paginated request history
  - `AnomalyAlerts` - Real-time anomaly notifications
- **WebSocket Hook** - `useWebSocket` for live updates
- **Styling:** Tailwind CSS with responsive design

---

## 📁 Repo Layout (Demo)

- `frontend/` - Next.js app (Vercel)
- `backend/` - Express API + Socket.io (Render)
- Root scripts run both for local development

---

## ⚙️ How It Works

1. **Backend Startup:**
   - Initializes SQLite database with indexes
   - Starts ping service (immediate + every 5 min)
   - Starts anomaly detection (immediate + every 10 min)

2. **Ping Flow:**
   - Generates random JSON payload
   - POSTs to `https://httpbin.org/anything`
   - Records: timestamp, status code, response time, payload, response data
   - Stores in SQLite
   - Broadcasts via WebSocket to connected clients

3. **Anomaly Detection:**
   - Analyzes last 24 hours of data
   - **Response Time:** Z-score > 2.5 standard deviations + >5000ms
   - **Error Rate:** >30% errors in any hour
   - **Status Codes:** 3+ errors in last 20 requests
   - Broadcasts anomalies with severity (low/medium/high)

4. **Frontend:**
   - Loads initial data (last hour records + 24h stats)
   - Connects to WebSocket for live updates
   - Refreshes stats every 30 seconds
   - Displays real-time charts and alerts

---

## 🔌 API Endpoints

- `GET /health` - Health check
- `GET /api/pings` - Paginated records (filters: statusCode, min/maxResponseTime, startTime/endTime)
- `GET /api/recent?minutes=60` - Recent records
- `GET /api/stats?hours=24` - Statistics (total, avg response time, success rate, status distribution)
- `GET /api/anomaly-stats` - Current anomaly detection stats
- `POST /api/ping` - Trigger manual ping

**WebSocket Events:**
- `newPingRecord` - New ping data
- `anomaly` - Anomaly detected

---

## 🧪 Testing

### **Backend Tests:**
- **Unit Tests:** `database.test.ts`, `ping.test.ts` (Jest)
- **Integration Tests:** `api.test.ts` (Supertest)
- **Coverage:** Run with `npm run test:coverage`

### **Frontend Tests:**
- **Component Tests:** `StatsCards.test.tsx` (React Testing Library)

### **Performance Tests:**
- **Load Testing:** Artillery config (`frontend/tests/performance/load-test.yml`)
  - Warm-up: 10 req/s for 60s
  - Load: 50 req/s for 120s
  - Stress: 100 req/s for 60s
- **Lighthouse CI:** Performance, accessibility, SEO checks (`lighthouserc.js`)

---

## 🚀 CI/CD & Deployment

### **CI Pipeline (GitHub Actions):**
- `.github/workflows/ci.yml` runs lint, tests, and build for both apps
- **📖 Detailed Documentation:** See [CI_CD_DOCUMENTATION.md](./CI_CD_DOCUMENTATION.md) for complete pipeline description, test coverage, and validation checks

### **Root Package.json:**
- Orchestrates frontend + backend scripts
- `npm run dev` - Runs both concurrently
- `npm test` - Runs all tests
- `npm run build` - Builds both apps

### **Deployment:**
- **Backend (Render):** deployed from `backend/` (set envs on Render)
- **Frontend (Vercel):** deployed from `frontend/` (set envs on Vercel)
- **Docker:** `docker-compose.yml` for containerized deployment
  - Backend: Node 18 Alpine, exposes 8001
  - Frontend: Node 18 Alpine, exposes 3000
  - Health checks and volume mounts configured

### **Environment Variables:**

**Backend (.env):**
```env
PORT=8001
DB_PATH=./data/monitoring.db
FRONTEND_URL=http://localhost:3000
PING_INTERVAL=300000
HTTPBIN_URL=https://httpbin.org/anything
ANALYSIS_INTERVAL=600000
Z_SCORE_THRESHOLD=2.5
RESPONSE_TIME_THRESHOLD=5000
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_WS_URL=http://localhost:8001
```

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Start both services
npm run dev

# Or individually
npm run dev:backend   # Port 8001
npm run dev:frontend  # Port 3000

# Run tests
npm test

# Build for production
npm run build

# Docker deployment
docker-compose up -d
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- Health Check: http://localhost:8001/health

---

## 📊 Database Schema

```sql
CREATE TABLE ping_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  request_payload TEXT NOT NULL,
  response_data TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time INTEGER NOT NULL,
  content_type TEXT,
  content_length INTEGER,
  request_type TEXT DEFAULT 'auto'
);

-- Indexes for performance
CREATE INDEX idx_timestamp ON ping_records(timestamp);
CREATE INDEX idx_status_code ON ping_records(status_code);
CREATE INDEX idx_response_time ON ping_records(response_time);
```

---

## 🛠️ Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express, TypeScript, Socket.io, SQLite, Winston, Joi |
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts, Socket.io Client |
| **Testing** | Jest, Supertest, React Testing Library, Artillery |
| **CI/CD** | Render (backend), Vercel (frontend), Docker, Lighthouse CI |
| **Dev Tools** | ESLint, Prettier, Nodemon, Concurrently |


---

## 🔍 Key Features Implemented

✅ **Automatic Monitoring** - Scheduled pings every 5 minutes  
✅ **Real-time Updates** - WebSocket live data streaming  
✅ **Anomaly Detection** - Statistical z-score analysis  
✅ **Data Visualization** - Interactive response time charts  
✅ **Advanced Filtering** - Multi-criteria request filtering  
✅ **Pagination** - Efficient large dataset handling  
✅ **Manual Ping** - On-demand testing  
✅ **Health Checks** - System monitoring endpoints  
✅ **Structured Logging** - Winston with file rotation  
✅ **Type Safety** - Full TypeScript coverage  
✅ **Testing** - Unit, integration, load tests  
✅ **Docker Support** - Containerized deployment  
✅ **CI/CD Ready** - Railway + Vercel configs  


---

**Built with modern web technologies for real-time monitoring and anomaly detection** 🚀
