const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// ── Configuration ─────────────────────────────────────
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || (NODE_ENV === 'production' ? null : 'jananicare_dev_secret');
const AI_API_URL = process.env.AI_API_URL || 'http://localhost:5001';

if (NODE_ENV === 'production' && !process.env.AI_API_URL) {
  console.error("❌ FATAL: AI_API_URL is not set!");
  process.exit(1);
}
const FRONTEND_URL = process.env.FRONTEND_URL;

if (NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET is not set in production!");
  process.exit(1);
}
if (NODE_ENV === 'production' && !process.env.MONGODB_URI) {
  console.error("❌ FATAL: MONGODB_URI is not set in production!");
  process.exit(1);
}


// ══════════════════════════════════════════════════════════
// MONGOOSE SCHEMAS & MODELS
// ══════════════════════════════════════════════════════════

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['mother', 'asha_worker'], default: 'mother' },
  phone: { type: String, default: '' },
  village: { type: String, default: '' },
  district: { type: String, default: '' },
  state: { type: String, default: '' },
  ashaId: { type: String, default: '' },
  assignedArea: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: Date.now }
}, { timestamps: true });

const motherProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: String,
  email: String,
  phone: { type: String, default: '' },
  village: { type: String, default: '' },
  district: { type: String, default: '' },
  currentTrimester: { type: Number, default: null },
  currentRiskLevel: { type: String, default: 'unknown' },
  latestRiskScore: { type: Number, default: null },
  urgency: { type: String, default: null },
  totalPredictions: { type: Number, default: 0 },
  lastPredictionDate: { type: Date, default: null },
  expectedDeliveryDate: { type: Date, default: null },
  bloodGroup: { type: String, default: '' },
  nextCheckupDate: { type: Date, default: null },
  emergencyContact: { type: Object, default: null },
  medicineReminders: { type: Array, default: [
    { medicine: 'Iron + Folic Acid Tablet', time: '08:00 AM', frequency: 'Daily' },
    { medicine: 'Calcium Supplement', time: '02:00 PM', frequency: 'Daily' },
    { medicine: 'Vitamin D', time: '08:00 AM', frequency: 'Weekly' }
  ]}
}, { timestamps: true });

const healthRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  age: Number,
  weight: Number,
  height: Number,
  hemoglobin: Number,
  bloodPressureSystolic: Number,
  bloodPressureDiastolic: Number,
  bloodSugar: Number,
  trimester: Number,
  weeksPregnant: Number,
  previousPregnancies: Number,
  previousComplications: Boolean,
  previousComplicationDetails: String,
  symptoms: [String],
  voiceSymptomText: String,
  dietType: String,
  ironSupplements: Boolean,
  folicAcid: Boolean,
  antenatalVisits: Number,
  notes: String
}, { timestamps: true });

const predictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  riskLevel: String,
  riskScore: Number,
  confidence: Number,
  riskFactors: [Object],
  recommendations: [String],
  urgency: String,
  doctorConsultationRequired: Boolean,
  consultationTimeframe: String,
  modelVersion: String,
  trimester: Number,
  totalPredictions: Number,
  timestamp: String
}, { timestamps: true });

const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  alertType: String,
  severity: { type: String, default: 'medium' },
  title: String,
  message: String,
  village: { type: String, default: '' },
  district: { type: String, default: '' },
  status: { type: String, default: 'pending' },
  acknowledgedAt: { type: Date, default: null }
}, { timestamps: true });

const visitLogSchema = new mongoose.Schema({
  motherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  visitNotes: String,
  nextVisitDate: String,
  status: { type: String, default: 'normal' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const MotherProfile = mongoose.model('MotherProfile', motherProfileSchema);
const HealthRecord = mongoose.model('HealthRecord', healthRecordSchema);
const Prediction = mongoose.model('Prediction', predictionSchema);
const Alert = mongoose.model('Alert', alertSchema);
const VisitLog = mongoose.model('VisitLog', visitLogSchema);

// ══════════════════════════════════════════════════════════
// MONGODB CONNECTION
// ══════════════════════════════════════════════════════════

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jananicare';

mongoose.connect(MONGODB_URI)
  .then(() => {
    const safeUri = MONGODB_URI.includes('@') ? 'MongoDB Atlas (Cloud)' : MONGODB_URI;
    console.log('🍃 MongoDB connected:', safeUri);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    if (NODE_ENV === 'production') process.exit(1);
  });

// ══════════════════════════════════════════════════════════
// EXPRESS APP
// ══════════════════════════════════════════════════════════

const app = express();

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

// ── Allowed Origins ───────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://jananicare-ai.vercel.app'
];
// Allow additional origin from FRONTEND_URL env var
if (FRONTEND_URL && !ALLOWED_ORIGINS.includes(FRONTEND_URL)) {
  ALLOWED_ORIGINS.push(FRONTEND_URL);
}

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: false
  }
});

io.on('connection', (socket) => {
  console.log("Client connected");
});

// ── Middleware ─────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── JWT Auth Middleware ────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.uid;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ══════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({
    status: '✅ JananiCare AI Backend is running',
    database: '🍃 MongoDB (jananicare)',
    aiApi: AI_API_URL,
    timestamp: new Date()
  });
});

// ══════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════

// ── Register ──────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, village, district, state, ashaId, assignedArea } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'mother',
      phone: phone || '',
      village: village || '',
      district: district || '',
      state: state || '',
      ashaId: ashaId || '',
      assignedArea: assignedArea || ''
    });

    // If mother, create a profile document
    if ((role || 'mother') === 'mother') {
      await MotherProfile.create({
        userId: user._id,
        name,
        email: email.toLowerCase(),
        phone: phone || '',
        village: village || '',
        district: district || ''
      });
    }

    // Generate JWT
    const token = jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    const userData = {
      uid: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      village: user.village,
      district: user.district,
      state: user.state,
      ashaId: user.ashaId,
      assignedArea: user.assignedArea,
      isActive: user.isActive
    };

    res.status(201).json({ token, user: userData });
  } catch (err) {
    console.error('Register error:', NODE_ENV === 'production' ? err.message : err);
    res.status(500).json({ error: err.message });
  }
});

// ── Login ─────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    const userData = {
      uid: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      village: user.village,
      district: user.district,
      state: user.state,
      ashaId: user.ashaId,
      assignedArea: user.assignedArea,
      isActive: user.isActive
    };

    res.json({ token, user: userData });
  } catch (err) {
    console.error('Login error:', NODE_ENV === 'production' ? err.message : err);
    res.status(500).json({ error: err.message });
  }
});

// ── Get current user profile ──────────────────────────
app.get('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      uid: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      village: user.village,
      district: user.district,
      state: user.state,
      ashaId: user.ashaId,
      assignedArea: user.assignedArea,
      isActive: user.isActive
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// HEALTH RECORDS
// ══════════════════════════════════════════════════════════

app.post('/api/health-records', authMiddleware, async (req, res) => {
  try {
    const record = await HealthRecord.create({ ...req.body, userId: req.userId });
    res.status(201).json({ id: record._id, ...record.toObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health-records', authMiddleware, async (req, res) => {
  try {
    const records = await HealthRecord.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(10);
    res.json(records.map(r => ({ id: r._id, ...r.toObject() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// PREDICTIONS
// ══════════════════════════════════════════════════════════

app.post('/api/predictions', authMiddleware, async (req, res) => {
  try {
    const prediction = await Prediction.create({ ...req.body, userId: req.userId });

    // Update mother profile with latest risk
    await MotherProfile.findOneAndUpdate(
      { userId: req.userId },
      {
        currentRiskLevel: req.body.riskLevel,
        lastPredictionDate: new Date(),
        latestRiskScore: req.body.riskScore,
        urgency: req.body.urgency,
        currentTrimester: req.body.trimester || null,
        $inc: { totalPredictions: 1 }
      },
      { upsert: true }
    );

    res.status(201).json({ id: prediction._id, ...prediction.toObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/predictions', authMiddleware, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(10);
    res.json(predictions.map(p => ({ id: p._id, ...p.toObject() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/predictions/latest', authMiddleware, async (req, res) => {
  try {
    const prediction = await Prediction.findOne({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(prediction ? { id: prediction._id, ...prediction.toObject() } : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// MOTHER DASHBOARD
// ══════════════════════════════════════════════════════════

app.get('/api/dashboard/mother', authMiddleware, async (req, res) => {
  try {
    const [profile, latestPrediction] = await Promise.all([
      MotherProfile.findOne({ userId: req.userId }),
      Prediction.findOne({ userId: req.userId }).sort({ createdAt: -1 })
    ]);

    const trimester = profile?.currentTrimester || 1;
    const riskLevel = latestPrediction?.riskLevel || 'unknown';

    res.json({
      profile: profile ? { id: profile._id, ...profile.toObject() } : null,
      latestPrediction: latestPrediction ? { id: latestPrediction._id, ...latestPrediction.toObject() } : null,
      nextCheckup: profile?.nextCheckupDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      medicineReminders: profile?.medicineReminders || [
        { medicine: 'Iron + Folic Acid Tablet', time: '08:00 AM', frequency: 'Daily' },
        { medicine: 'Calcium Supplement', time: '02:00 PM', frequency: 'Daily' },
        { medicine: 'Vitamin D', time: '08:00 AM', frequency: 'Weekly' }
      ],
      nutritionTips: getNutritionTips(trimester),
      healthTips: getHealthTips(riskLevel),
      emergencyContact: profile?.emergencyContact || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// ALERTS
// ══════════════════════════════════════════════════════════

app.post('/api/alerts', authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.create({ ...req.body, userId: req.userId });
    res.status(201).json({ id: alert._id, ...alert.toObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/alerts/:id/acknowledge', authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: 'acknowledged', acknowledgedAt: new Date() },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ id: alert._id, ...alert.toObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// VISIT LOGS
// ══════════════════════════════════════════════════════════

app.post('/api/visits', authMiddleware, async (req, res) => {
  try {
    const visit = await VisitLog.create(req.body);

    // Update next checkup date on mother profile
    if (req.body.motherId && req.body.nextVisitDate) {
      await MotherProfile.findOneAndUpdate(
        { userId: req.body.motherId },
        { nextCheckupDate: new Date(req.body.nextVisitDate) }
      );
    }

    res.status(201).json({ id: visit._id, ...visit.toObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// ASHA WORKER / ADMIN ROUTES
// ══════════════════════════════════════════════════════════

// ── Get mothers assigned to this ASHA worker (by village/district) ──
app.get('/api/admin/mothers', authMiddleware, async (req, res) => {
  try {
    // Get the ASHA worker's profile to know their assigned area
    const ashaWorker = await User.findById(req.userId);
    if (!ashaWorker) return res.status(404).json({ error: 'User not found' });

    // Build area filter — match mothers by village OR district
    const areaFilter = {};
    const conditions = [];
    if (ashaWorker.village) conditions.push({ village: { $regex: new RegExp(ashaWorker.village, 'i') } });
    if (ashaWorker.district) conditions.push({ district: { $regex: new RegExp(ashaWorker.district, 'i') } });
    if (ashaWorker.assignedArea) conditions.push({ village: { $regex: new RegExp(ashaWorker.assignedArea, 'i') } });

    let mothers;
    if (conditions.length > 0) {
      mothers = await MotherProfile.find({ $or: conditions }).sort({ createdAt: -1 });
    } else {
      // If ASHA worker has no area set, show all (fallback)
      mothers = await MotherProfile.find().sort({ createdAt: -1 });
    }

    res.json({ mothers: mothers.map(m => ({ id: m._id, ...m.toObject() })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get pending alerts for this ASHA worker's area ─────
app.get('/api/admin/alerts', authMiddleware, async (req, res) => {
  try {
    // Get the ASHA worker's profile to filter alerts by area
    const ashaWorker = await User.findById(req.userId);
    const alertFilter = { status: 'pending' };

    // Filter alerts by village/district if ASHA worker has area set
    const conditions = [];
    if (ashaWorker?.village) conditions.push({ village: { $regex: new RegExp(ashaWorker.village, 'i') } });
    if (ashaWorker?.district) conditions.push({ district: { $regex: new RegExp(ashaWorker.district, 'i') } });

    if (conditions.length > 0) {
      alertFilter.$or = conditions;
    }

    const alerts = await Alert.find(alertFilter).sort({ createdAt: -1 });
    res.json({ alerts: alerts.map(a => ({ id: a._id, _id: a._id, ...a.toObject() })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get patient detail ─────────────────────────────────
app.get('/api/admin/patient/:uid', authMiddleware, async (req, res) => {
  try {
    const uid = req.params.uid;
    const [user, profile, predictions, alerts] = await Promise.all([
      User.findById(uid).select('-password'),
      MotherProfile.findOne({ userId: uid }),
      Prediction.find({ userId: uid }).sort({ createdAt: -1 }).limit(10),
      Alert.find({ userId: uid }).sort({ createdAt: -1 }).limit(10)
    ]);

    res.json({
      mother: user ? { uid: user._id, ...user.toObject() } : null,
      profile: profile ? profile.toObject() : null,
      predictions: predictions.map(d => ({ id: d._id, ...d.toObject() })),
      alerts: alerts.map(d => ({ id: d._id, ...d.toObject() })),
      healthRecords: []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// AI PREDICTION PROXY
// ══════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════
// LOCAL FALLBACK PREDICTION
// ══════════════════════════════════════════════════════════

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

// ── Start Server ───────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 JananiCare Server running on port ${PORT} [${NODE_ENV}]`);
});


app.post('/api/alerts/sos', async (req, res) => {
  try {
    const { userId, lat, lng } = req.body;

    const user = await User.findById(userId);

    console.log("🚨 SOS REQUEST:", user.name, lat, lng);

    // 🔔 SEND REAL-TIME ALERT
    io.emit('sos-alert', {
      name: user.name,
      lat,
      lng
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});
module.exports = app;


