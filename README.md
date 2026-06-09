# Campus Notification System

AffordMed Campus Hiring Evaluation - Full Stack Submission

A notification dashboard system that pulls notifications from the evaluation API, prioritizes them based on type (Placement > Result > Event) and age, and shows them on a responsive React frontend built with Material UI.

## Screenshots

- **Notifications Feed:** See `screenshots/notifications-page.png`
- **Priority Inbox:** See `screenshots/priority-page.png`
- **Mobile View:** See `screenshots/mobile-view.png`

## Project Structure

- `notification_system_design.md`: Design document answering stage questions
- `schema.sql`: Database schema with indexes
- `backend/`: Node.js Express server
- `frontend/`: React + Vite + Material UI app
- `screenshots/`: App preview screenshots

## How to Run

### 1. Start the Backend API
```bash
cd backend
npm install
npm run dev
```
The server will run on `http://localhost:3001`

### 2. Start the Frontend App
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`

### 3. Environment Variables (Optional)
If you want to configure the API variables, create a `.env` file in `backend/`:
```env
PORT=3001
API_URL=http://4.224.186.213/evaluation-service/notifications
AUTH_TOKEN=your_auth_token
```
If the backend cannot reach the API (e.g. status 401), it automatically uses the fallback sample dataset.

## Implementation Details

- **Priority Algorithm:** Computes score based on weights (Placement = 1.0, Result = 0.7, Event = 0.4), recency (decayed exponentially with a 24-hour half-life), and keyword matches.
- **Top-K Retrieval:** Uses a custom Min Heap to keep track of the top 10 items in O(N log K) time.
- **Logging Middleware:** Integrated a custom request logging middleware to track incoming requests.
- **Read/Unread Status:** Persisted locally using browser localStorage.
