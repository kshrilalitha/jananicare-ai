// ─────────────────────────────────────────────────────────
// Firestore Service — Health Records, Predictions, Alerts
// ─────────────────────────────────────────────────────────

import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  query, where, orderBy, limit, updateDoc,
  serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { db } from './config';

// ══════════════════════════════════════════════════════════
// HEALTH RECORDS
// ══════════════════════════════════════════════════════════

export const saveHealthRecord = async (userId, healthData) => {
  const record = {
    ...healthData,
    userId,
    createdAt: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, 'healthRecords'), record);
  return { id: docRef.id, ...record };
};

export const getHealthRecords = async (userId) => {
  const q = query(
    collection(db, 'healthRecords'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ══════════════════════════════════════════════════════════
// PREDICTIONS
// ══════════════════════════════════════════════════════════

export const savePrediction = async (userId, predictionData) => {
  const prediction = {
    ...predictionData,
    userId,
    createdAt: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, 'predictions'), prediction);

  // Update mother profile with latest risk
  await setDoc(doc(db, 'motherProfiles', userId), {
    currentRiskLevel: predictionData.riskLevel,
    lastPredictionDate: serverTimestamp(),
    currentTrimester: predictionData.trimester || null,
    totalPredictions: predictionData.totalPredictions || 1
  }, { merge: true });

  return { id: docRef.id, ...prediction };
};

export const getLatestPrediction = async (userId) => {
  const q = query(
    collection(db, 'predictions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() };
};

export const getAllPredictions = async (userId) => {
  const q = query(
    collection(db, 'predictions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ══════════════════════════════════════════════════════════
// MOTHER PROFILE
// ══════════════════════════════════════════════════════════

export const getMotherProfile = async (userId) => {
  const docSnap = await getDoc(doc(db, 'motherProfiles', userId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
};

export const updateMotherProfile = async (userId, updates) => {
  await setDoc(doc(db, 'motherProfiles', userId), {
    ...updates,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

// ══════════════════════════════════════════════════════════
// MOTHER DASHBOARD DATA
// ══════════════════════════════════════════════════════════

export const getMotherDashboard = async (userId) => {
  const [profile, latestPrediction] = await Promise.all([
    getMotherProfile(userId),
    getLatestPrediction(userId)
  ]);

  const trimester = profile?.currentTrimester || 1;
  const riskLevel = latestPrediction?.riskLevel || 'unknown';

  return {
    profile,
    latestPrediction,
    nextCheckup: profile?.nextCheckupDate?.toDate?.() || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    medicineReminders: profile?.medicineReminders || [
      { medicine: 'Iron + Folic Acid Tablet', time: '08:00 AM', frequency: 'Daily' },
      { medicine: 'Calcium Supplement', time: '02:00 PM', frequency: 'Daily' },
      { medicine: 'Vitamin D', time: '08:00 AM', frequency: 'Weekly' }
    ],
    nutritionTips: getNutritionTips(trimester),
    healthTips: getHealthTips(riskLevel),
    emergencyContact: profile?.emergencyContact || null
  };
};

// ══════════════════════════════════════════════════════════
// ALERTS
// ══════════════════════════════════════════════════════════

export const saveAlert = async (alertData) => {
  const alert = {
    ...alertData,
    status: 'pending',
    createdAt: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, 'alerts'), alert);
  return { id: docRef.id, ...alert };
};

export const acknowledgeAlert = async (alertId) => {
  await updateDoc(doc(db, 'alerts', alertId), {
    status: 'acknowledged',
    acknowledgedAt: serverTimestamp()
  });
};

export const getAlertsForMother = async (userId) => {
  const q = query(
    collection(db, 'alerts'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ══════════════════════════════════════════════════════════
// ASHA WORKER — Get all mothers
// ══════════════════════════════════════════════════════════

export const getAllMothers = async () => {
  const q = query(
    collection(db, 'motherProfiles'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAshaDashboard = async () => {
  const mothers = await getAllMothers();

  // Get pending alerts
  const alertsQuery = query(
    collection(db, 'alerts'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  const alertsSnap = await getDocs(alertsQuery);
  const pendingAlerts = alertsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Build patient cards sorted by risk
  const riskOrder = { high: 0, medium: 1, low: 2, unknown: 3 };
  const patients = mothers
    .map(m => ({
      id: m.userId || m.id,
      name: m.name,
      phone: m.phone,
      village: m.village,
      district: m.district,
      riskLevel: m.currentRiskLevel || 'unknown',
      currentTrimester: m.currentTrimester,
      latestRiskScore: m.latestRiskScore,
      urgency: m.urgency,
      totalPredictions: m.totalPredictions || 0
    }))
    .sort((a, b) => (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3));

  const stats = {
    total: patients.length,
    highRisk: patients.filter(p => p.riskLevel === 'high').length,
    mediumRisk: patients.filter(p => p.riskLevel === 'medium').length,
    lowRisk: patients.filter(p => p.riskLevel === 'low').length,
    pendingAlerts: pendingAlerts.length,
    criticalAlerts: pendingAlerts.filter(a => a.severity === 'critical').length
  };

  return { patients, pendingAlerts, stats };
};

export const getPatientDetail = async (userId) => {
  const [profile, predictions, alerts] = await Promise.all([
    getMotherProfile(userId),
    getAllPredictions(userId),
    getAlertsForMother(userId)
  ]);

  // Get user info
  const userDoc = await getDoc(doc(db, 'users', userId));
  const mother = userDoc.exists() ? { uid: userId, ...userDoc.data() } : null;

  return { mother, profile, predictions, alerts, healthRecords: [] };
};

export const logVisit = async (visitData) => {
  await addDoc(collection(db, 'visitLogs'), {
    ...visitData,
    createdAt: serverTimestamp()
  });

  // Update next checkup date on mother profile
  if (visitData.motherId && visitData.nextVisitDate) {
    await setDoc(doc(db, 'motherProfiles', visitData.motherId), {
      nextCheckupDate: new Date(visitData.nextVisitDate)
    }, { merge: true });
  }
};

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

function getNutritionTips(trimester) {
  const tips = {
    1: [
      { icon: '🥬', title: 'Folic Acid Foods', desc: 'Eat spinach, lentils, and fortified cereals daily' },
      { icon: '🥛', title: 'Calcium Rich', desc: 'Include milk, yogurt, and cheese in your diet' },
      { icon: '🍊', title: 'Vitamin C', desc: 'Citrus fruits help absorb iron better' },
      { icon: '💧', title: 'Stay Hydrated', desc: 'Drink 8-10 glasses of water daily' }
    ],
    2: [
      { icon: '🥩', title: 'Iron Rich Foods', desc: 'Lean meat, beans, and dark leafy greens' },
      { icon: '🐟', title: 'Omega-3', desc: 'Fish for baby brain development' },
      { icon: '🥚', title: 'Protein', desc: 'Eggs, legumes, and dairy for baby growth' },
      { icon: '🌾', title: 'Whole Grains', desc: 'Brown rice and whole wheat for energy' }
    ],
    3: [
      { icon: '🦴', title: 'Calcium & Vitamin D', desc: 'For baby bone development in final weeks' },
      { icon: '🥜', title: 'Healthy Fats', desc: 'Nuts and seeds for brain development' },
      { icon: '🍌', title: 'Potassium', desc: 'Bananas help prevent leg cramps' },
      { icon: '🥗', title: 'Small Frequent Meals', desc: 'Eat 5-6 small meals to manage heartburn' }
    ]
  };
  return tips[trimester] || tips[1];
}

function getHealthTips(riskLevel) {
  const tips = {
    low: ['Continue regular antenatal checkups every 4 weeks', 'Practice light prenatal yoga or walking 30 min daily', 'Get 8 hours of sleep, sleep on your left side', 'Avoid stress - practice deep breathing exercises'],
    medium: ['Schedule doctor visit within 2-3 days', 'Monitor blood pressure daily if possible', 'Avoid heavy lifting and strenuous activities', 'Keep emergency contacts readily available'],
    high: ['Seek immediate medical attention', 'Do not delay - contact your ASHA worker now', 'Go to nearest PHC or hospital today', 'Have someone accompany you at all times'],
    unknown: ['Complete your first health assessment to get personalized tips', 'Register with your ASHA worker', 'Schedule your first antenatal checkup']
  };
  return tips[riskLevel] || tips['unknown'];
}
