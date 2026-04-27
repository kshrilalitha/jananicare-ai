const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

dotenv.config();

// ── Firebase Admin Init ────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
console.log('🔥 Firebase Admin connected to project:', serviceAccount.project_id);

const app = express();

// ── Middleware ─────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const AI_API_URL = process.env.AI_API_URL || 'http://localhost:5001';

// ── Health Check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: '✅ JananiCare AI Backend is running',
    database: '🔥 Firebase Firestore (jananicare-ai)',
    aiApi: AI_API_URL,
    timestamp: new Date()
  });
});

// ── AI Prediction Proxy ────────────────────────────────
app.post('/api/predict', async (req, res) => {
  try {
    const response = await axios.post(`${AI_API_URL}/predict`, req.body, {
      timeout: 10000
    });
    res.json(response.data);
  } catch (err) {
    console.log('AI API unavailable, using local fallback');
    res.json(localPrediction(req.body));
  }
});

// ── Get all mothers (for ASHA dashboard) ──────────────
app.get('/api/admin/mothers', async (req, res) => {
  try {
    const snapshot = await db.collection('motherProfiles').orderBy('createdAt', 'desc').get();
    const mothers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ mothers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get all pending alerts ─────────────────────────────
app.get('/api/admin/alerts', async (req, res) => {
  try {
    const snapshot = await db.collection('alerts')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get patient detail ─────────────────────────────────
app.get('/api/admin/patient/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const [userDoc, profileDoc, predictionsSnap, alertsSnap] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('motherProfiles').doc(uid).get(),
      db.collection('predictions').where('userId', '==', uid).orderBy('createdAt', 'desc').limit(10).get(),
      db.collection('alerts').where('userId', '==', uid).orderBy('createdAt', 'desc').limit(10).get()
    ]);

    res.json({
      mother: userDoc.exists ? { uid, ...userDoc.data() } : null,
      profile: profileDoc.exists ? profileDoc.data() : null,
      predictions: predictionsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      alerts: alertsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      healthRecords: []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Local Fallback Prediction ──────────────────────────
function localPrediction({ age, hemoglobin, bloodPressureSystolic, bloodPressureDiastolic, previousComplications, symptoms = [], bloodSugar }) {
  let score = 0;
  const riskFactors = [];

  if (age < 18) { score += 22; riskFactors.push({ factor: 'Very Young Age', severity: 'high', description: `Age ${age} is below 18` }); }
  else if (age > 35) { score += 12; riskFactors.push({ factor: 'Advanced Maternal Age', severity: 'medium', description: `Age ${age} increases risk` }); }

  if (hemoglobin < 7) { score += 28; riskFactors.push({ factor: 'Severe Anemia', severity: 'high', description: `Hemoglobin ${hemoglobin} g/dL — critically low` }); }
  else if (hemoglobin < 9) { score += 18; riskFactors.push({ factor: 'Moderate Anemia', severity: 'high', description: `Hemoglobin ${hemoglobin} g/dL` }); }
  else if (hemoglobin < 11) { score += 10; riskFactors.push({ factor: 'Mild Anemia', severity: 'medium', description: `Hemoglobin ${hemoglobin} g/dL` }); }

  if (bloodPressureSystolic >= 160 || bloodPressureDiastolic >= 110) { score += 32; riskFactors.push({ factor: 'Severe Hypertension', severity: 'high', description: `BP ${bloodPressureSystolic}/${bloodPressureDiastolic} mmHg` }); }
  else if (bloodPressureSystolic >= 140 || bloodPressureDiastolic >= 90) { score += 22; riskFactors.push({ factor: 'Hypertension', severity: 'high', description: `BP ${bloodPressureSystolic}/${bloodPressureDiastolic} mmHg` }); }
  else if (bloodPressureSystolic >= 130 || bloodPressureDiastolic >= 85) { score += 10; riskFactors.push({ factor: 'Pre-hypertension', severity: 'medium', description: `BP ${bloodPressureSystolic}/${bloodPressureDiastolic} mmHg` }); }

  if (bloodSugar > 200) { score += 20; riskFactors.push({ factor: 'Gestational Diabetes', severity: 'high', description: `Blood sugar ${bloodSugar} mg/dL` }); }
  else if (bloodSugar > 140) { score += 12; riskFactors.push({ factor: 'Elevated Blood Sugar', severity: 'medium', description: `Blood sugar ${bloodSugar} mg/dL` }); }

  if (previousComplications) { score += 15; riskFactors.push({ factor: 'Previous Complications', severity: 'medium', description: 'History of pregnancy complications' }); }

  const weights = { bleeding: 20, chest_pain: 18, blurred_vision: 16, reduced_fetal_movement: 15, severe_headache: 14, abdominal_pain: 12, shortness_of_breath: 12, headache: 10, swelling: 8, dizziness: 7, fever: 6, fatigue: 4, vomiting: 4, nausea: 3 };
  symptoms.forEach(s => { score += weights[s] || 0; });
  score = Math.min(score, 100);

  const riskLevel = score >= 55 ? 'high' : score >= 28 ? 'medium' : 'low';
  const recs = {
    high: ['🚨 Seek IMMEDIATE medical attention', '📞 Contact your ASHA worker RIGHT NOW', '🏥 Go to nearest PHC or hospital today', '👥 Do not stay alone'],
    medium: ['⚕️ Schedule doctor visit within 2-3 days', '📊 Monitor blood pressure daily', '💊 Take all prescribed supplements', '😴 Get adequate rest'],
    low: ['✅ Continue regular antenatal checkups', '🥗 Maintain balanced diet', '💊 Take folic acid and iron supplements', '💧 Stay well hydrated']
  };

  return {
    riskLevel, riskScore: score, confidence: 0.85, riskFactors,
    recommendations: recs[riskLevel],
    urgency: riskLevel === 'high' ? 'emergency' : riskLevel === 'medium' ? 'soon' : 'routine',
    doctorConsultationRequired: riskLevel !== 'low',
    consultationTimeframe: riskLevel === 'high' ? 'Immediately — within 24 hours' : riskLevel === 'medium' ? 'Within 2-3 days' : 'Routine checkup in 2 weeks',
    modelVersion: '1.0-local',
    timestamp: new Date().toISOString()
  };
}

// ── Start Server ───────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 JananiCare AI Backend running on port ${PORT}`);
  console.log(`🔥 Firebase project: jananicare-ai`);
  console.log(`🤖 AI API: ${AI_API_URL}`);
});

module.exports = app;
