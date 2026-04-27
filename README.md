# 🌸 JananiCare AI
## Smart Maternal Risk Prediction & Emergency Care Coordination Platform

> **Predict Early. Protect Mothers.**

JananiCare AI is an AI-powered full-stack healthcare web application that helps detect high-risk pregnancies early using machine learning, and improves maternal healthcare through reminders, nutrition guidance, and emergency alerts — especially for rural and underserved communities.

---

## 🏗️ Project Structure

```
jananicare-ai/
├── frontend/          # React.js frontend
│   └── src/
│       ├── pages/     # All page components
│       ├── components/# Reusable components (Navbar)
│       ├── context/   # Auth context
│       └── services/  # API service
├── backend/           # Node.js + Express backend
│   ├── models/        # MongoDB models
│   ├── routes/        # API routes
│   ├── middleware/    # Auth middleware
│   └── scripts/       # Seed data script
└── ai-api/            # Python + Flask AI prediction API
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB (local or Atlas)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env   # Edit with your MongoDB URI
npm run dev            # Starts on port 5000
```

### 2. AI API Setup
```bash
cd ai-api
pip install -r requirements.txt
python app.py          # Starts on port 5001
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start              # Starts on port 3000
```

### 4. Seed Demo Data (Optional)
```bash
node backend/scripts/seedData.js
```

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| 👩‍⚕️ ASHA Worker | asha@demo.com | demo123 |
| 🤱 Mother (High Risk) | priya@demo.com | demo123 |
| 🤱 Mother (Medium Risk) | meena@demo.com | demo123 |
| 🤱 Mother (Low Risk) | anita@demo.com | demo123 |

> **Note:** The app works in demo mode even without MongoDB — mock data is used automatically.

---

## ✨ Core Features

### For Pregnant Mothers
- 🤖 **AI Risk Prediction** — ML-based Low/Medium/High risk classification
- 📊 **Health Dashboard** — Risk status, next checkup, pregnancy stage
- 📋 **Health Data Form** — 4-step guided health data entry
- 🎤 **Voice Symptom Input** — Speak symptoms in simple language
- 💊 **Medicine Reminders** — Iron, folic acid, calcium supplements
- 🥗 **Nutrition Guidance** — Trimester-specific diet recommendations
- 🆘 **One Tap Emergency Help** — Instant alert to ASHA worker + PHC
- 📞 **Emergency Contacts** — 108, 112, 181 quick dial

### For ASHA Workers
- 📊 **Patient Dashboard** — All assigned mothers with risk sorting
- 🚨 **Priority Alerts** — Real-time high-risk notifications
- 🔍 **Filter & Search** — By risk level, name, village
- 📋 **Patient Details** — Full history, predictions, alerts
- 📝 **Visit Logging** — Record visits and schedule follow-ups
- 📈 **Analytics Cards** — Total, high/medium/low risk counts

### AI Prediction System
- Analyzes: Hemoglobin, Blood Pressure, Age, Symptoms, Pregnancy History
- Outputs: Risk Level, Risk Score (0-100), Confidence, Risk Factors, Recommendations
- Urgency levels: Routine → Soon → Urgent → Emergency
- Fallback: Local prediction logic if AI API is unavailable

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js 18, React Router v6 |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| AI API | Python, Flask |
| Auth | JWT + bcrypt |
| HTTP | Axios |
| Styling | Pure CSS (no UI library) |

---

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user

### Health Records
- `POST /api/health-records` — Submit health data + trigger AI prediction
- `GET /api/health-records` — Get health records

### Predictions
- `GET /api/predictions/latest` — Latest prediction
- `GET /api/predictions/:id` — Specific prediction

### Alerts
- `POST /api/alerts/one-tap-help` — Emergency SOS
- `GET /api/alerts` — Get alerts
- `PATCH /api/alerts/:id/acknowledge` — Acknowledge alert

### Mother
- `GET /api/mothers/dashboard` — Dashboard data
- `GET /api/mothers/profile` — Profile
- `PUT /api/mothers/profile` — Update profile

### ASHA Worker
- `GET /api/asha/dashboard` — ASHA dashboard
- `GET /api/asha/patient/:id` — Patient details
- `POST /api/asha/visit-log` — Log visit

### AI API (Flask)
- `POST /predict` — Risk prediction
- `GET /health` — Health check

---

## 🎯 Hackathon Demo Flow

1. **Landing Page** → Show features and role selection
2. **Register as Mother** → Quick registration
3. **Mother Dashboard** → Show risk status, reminders, nutrition tips
4. **Health Data Form** → Enter vitals + voice symptom input
5. **Risk Result Page** → AI prediction with animated score
6. **One Tap Help** → Emergency alert demo
7. **Login as ASHA Worker** → Show patient monitoring dashboard
8. **Priority Alerts** → High-risk patient alerts
9. **Patient Detail** → Full case history + visit logging

---

## 🌐 Language Support (Concept)
Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, English

---

Built with ❤️ for India's Maternal Healthcare Revolution 🇮🇳
