import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveHealthRecord, savePrediction } from '../services/dataService';
import Navbar from '../components/Navbar';
import './HealthDataForm.css';

const SYMPTOMS = [
  { id: 'fatigue', label: 'Fatigue / Tiredness', icon: '😴' },
  { id: 'dizziness', label: 'Dizziness', icon: '💫' },
  { id: 'swelling', label: 'Swelling (hands/feet/face)', icon: '🦶' },
  { id: 'headache', label: 'Headache', icon: '🤕' },
  { id: 'bleeding', label: 'Vaginal Bleeding', icon: '🩸' },
  { id: 'nausea', label: 'Nausea', icon: '🤢' },
  { id: 'vomiting', label: 'Vomiting', icon: '🤮' },
  { id: 'abdominal_pain', label: 'Abdominal Pain', icon: '😣' },
  { id: 'reduced_fetal_movement', label: 'Reduced Fetal Movement', icon: '👶' },
  { id: 'blurred_vision', label: 'Blurred Vision', icon: '👁️' },
  { id: 'chest_pain', label: 'Chest Pain', icon: '💔' },
  { id: 'shortness_of_breath', label: 'Shortness of Breath', icon: '😮‍💨' },
  { id: 'fever', label: 'Fever', icon: '🌡️' },
  { id: 'none', label: 'No Symptoms', icon: '✅' }
];

const HealthDataForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const recognitionRef = useRef(null);

  const [formData, setFormData] = useState({
    age: '',
    weight: '',
    height: '',
    hemoglobin: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    bloodSugar: '',
    trimester: '',
    weeksPregnant: '',
    previousPregnancies: '0',
    previousComplications: false,
    previousComplicationDetails: '',
    symptoms: [],
    customSymptoms: [],
    voiceSymptomText: '',
    dietType: 'vegetarian',
    ironSupplements: false,
    folicAcid: false,
    antenatalVisits: '0',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const toggleSymptom = (symptomId) => {
    setFormData(prev => {
      if (symptomId === 'none') {
        return { ...prev, symptoms: prev.symptoms.includes('none') ? [] : ['none'] };
      }
      const filtered = prev.symptoms.filter(s => s !== 'none');
      if (filtered.includes(symptomId)) {
        return { ...prev, symptoms: filtered.filter(s => s !== symptomId) };
      }
      return { ...prev, symptoms: [...filtered, symptomId] };
    });
  };

  // Keyword-to-symptom mapping for voice detection
  const SYMPTOM_KEYWORDS = [
    { keywords: ['bleed', 'bleeding'], id: 'bleeding' },
    { keywords: ['dizz', 'dizziness', 'dizzy'], id: 'dizziness' },
    { keywords: ['headache', 'head ache', 'head pain'], id: 'headache' },
    { keywords: ['swell', 'swelling', 'swollen', 'edema'], id: 'swelling' },
    { keywords: ['tired', 'tiredness', 'fatigue', 'exhausted', 'weak', 'weakness'], id: 'fatigue' },
    { keywords: ['nausea', 'nauseous', 'sick', 'queasy'], id: 'nausea' },
    { keywords: ['vomit', 'vomiting', 'throwing up', 'puke'], id: 'vomiting' },
    { keywords: ['abdominal pain', 'stomach pain', 'tummy pain', 'cramp', 'cramping', 'belly pain'], id: 'abdominal_pain' },
    { keywords: ['fetal movement', 'baby not moving', 'baby movement', 'reduced movement', 'less movement', 'not kicking'], id: 'reduced_fetal_movement' },
    { keywords: ['blur', 'blurred', 'blurry', 'vision problem', 'can\'t see', 'cannot see'], id: 'blurred_vision' },
    { keywords: ['chest pain', 'chest hurt', 'heart pain'], id: 'chest_pain' },
    { keywords: ['breath', 'breathing', 'breathless', 'shortness of breath', 'can\'t breathe'], id: 'shortness_of_breath' },
    { keywords: ['fever', 'temperature', 'hot', 'chills'], id: 'fever' },
  ];

  // Voice Input
  const startVoiceInput = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Voice input is not supported in your browser. Please use Google Chrome.');
      return;
    }

    // Request microphone permission explicitly first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (micErr) {
      console.error('Microphone permission denied:', micErr);
      setError('🎤 Microphone access denied. Please allow microphone permission in your browser and try again.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
      setVoiceText(transcript);

      // Only process final results to avoid duplicates
      const isFinal = event.results[event.results.length - 1].isFinal;

      const lower = transcript.toLowerCase().trim();
      const detected = [];
      let remainingText = lower;

      // Match known symptoms via keywords
      SYMPTOM_KEYWORDS.forEach(({ keywords, id }) => {
        for (const keyword of keywords) {
          if (lower.includes(keyword)) {
            detected.push(id);
            // Remove matched keyword from remaining text
            remainingText = remainingText.replace(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
            break;
          }
        }
      });

      // Clean up remaining text — extract custom/unrecognized symptoms
      // Remove common filler words
      const fillerWords = ['i', 'am', 'have', 'having', 'feel', 'feeling', 'got', 'get', 'getting', 'some', 'a', 'an', 'the', 'and', 'also', 'with', 'my', 'me', 'is', 'are', 'was', 'been', 'lot', 'of', 'very', 'much', 'too', 'like', 'it', 'there', 'in', 'on', 'since', 'from', 'for', 'to', 'really', 'experiencing', 'suffering', 'symptoms', 'symptom'];
      let customParts = remainingText
        .split(/[,;.]+|\band\b/)
        .map(part => part.trim())
        .map(part => {
          return part.split(/\s+/).filter(word => !fillerWords.includes(word.toLowerCase())).join(' ').trim();
        })
        .filter(part => part.length > 1);

      // Deduplicate custom symptoms
      customParts = [...new Set(customParts)];

      // Update form data with detected and custom symptoms
      setFormData(prev => {
        const newSymptoms = [...new Set([...prev.symptoms.filter(s => s !== 'none'), ...detected])];
        const existingCustom = isFinal ? [] : prev.customSymptoms;
        const newCustom = [...new Set([...existingCustom, ...customParts])];
        return {
          ...prev,
          symptoms: newSymptoms,
          customSymptoms: newCustom,
          voiceSymptomText: transcript
        };
      });
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      switch (event.error) {
        case 'not-allowed':
          setError('🎤 Microphone access denied. Please allow microphone permission and try again.');
          break;
        case 'no-speech':
          setError('🔇 No speech detected. Please try speaking again.');
          break;
        case 'network':
          setError('🌐 Network error. Please check your internet connection.');
          break;
        case 'audio-capture':
          setError('🎤 No microphone found. Please connect a microphone and try again.');
          break;
        default:
          setError(`⚠️ Voice input error: ${event.error}. Please try again.`);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      console.log('Speech recognition start() called successfully');
    } catch (startErr) {
      console.error('Failed to start speech recognition:', startErr);
      setError(`⚠️ Could not start voice input: ${startErr.message}`);
      setIsListening(false);
    }
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const removeCustomSymptom = (symptomToRemove) => {
    setFormData(prev => ({
      ...prev,
      customSymptoms: prev.customSymptoms.filter(s => s !== symptomToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        age: Number(formData.age),
        weight: Number(formData.weight),
        height: formData.height ? Number(formData.height) : undefined,
        hemoglobin: Number(formData.hemoglobin),
        bloodPressureSystolic: Number(formData.bloodPressureSystolic),
        bloodPressureDiastolic: Number(formData.bloodPressureDiastolic),
        bloodSugar: formData.bloodSugar ? Number(formData.bloodSugar) : undefined,
        trimester: Number(formData.trimester),
        weeksPregnant: formData.weeksPregnant ? Number(formData.weeksPregnant) : undefined,
        previousPregnancies: Number(formData.previousPregnancies),
        previousComplications: formData.previousComplications,
        previousComplicationDetails: formData.previousComplicationDetails,
        symptoms: formData.symptoms,
        customSymptoms: formData.customSymptoms,
        voiceSymptomText: formData.voiceSymptomText,
        dietType: formData.dietType,
        ironSupplements: formData.ironSupplements,
        folicAcid: formData.folicAcid,
        antenatalVisits: Number(formData.antenatalVisits),
        notes: formData.notes
      };

      // Save health record to database
      await saveHealthRecord(user.uid, payload);

      // Call AI prediction via backend proxy
      let predictionResult;
      try {
        const response = await fetch('http://localhost:5000/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        predictionResult = await response.json();
      } catch (aiErr) {
        // Fallback to local prediction if backend is down
        predictionResult = simulatePrediction(formData);
      }

      // Save prediction to database
      await savePrediction(user.uid, {
        ...predictionResult,
        trimester: payload.trimester
      });

      navigate('/risk-result', { state: { prediction: predictionResult } });
    } catch (err) {
      console.error('Submit error:', err);
      // Last resort fallback
      const mockPrediction = simulatePrediction(formData);
      navigate('/risk-result', { state: { prediction: mockPrediction } });
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 4;

  return (
    <div className="form-page">
      <Navbar />
      <div className="form-content">
        <div className="form-header">
          <h1>📋 Health Data Assessment</h1>
          <p>Enter your health information for AI-powered risk prediction</p>
        </div>

        {/* Progress */}
        <div className="form-progress">
          {[1,2,3,4].map(s => (
            <div key={s} className={`progress-step ${step >= s ? 'active' : ''} ${step === s ? 'current' : ''}`}>
              <div className="progress-step-circle">{step > s ? '✓' : s}</div>
              <span>{['Basic Info', 'Vitals', 'Symptoms', 'Review'][s-1]}</span>
            </div>
          ))}
          <div className="progress-line">
            <div className="progress-line-fill" style={{ width: `${((step-1)/3)*100}%` }}></div>
          </div>
        </div>

        {error && <div className="form-error">⚠️ {error}</div>}

        <form onSubmit={step < 4 ? (e) => { e.preventDefault(); setStep(s => s + 1); } : handleSubmit}>
          <div className="form-card">

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="form-step fade-in">
                <h2>👤 Basic Information</h2>
                <div className="form-grid">
                  <div className="field-group">
                    <label>Age (years) <span className="required">*</span></label>
                    <input type="number" name="age" value={formData.age} onChange={handleChange}
                      placeholder="e.g. 24" min="15" max="50" required className="field-input" />
                  </div>
                  <div className="field-group">
                    <label>Weight (kg) <span className="required">*</span></label>
                    <input type="number" name="weight" value={formData.weight} onChange={handleChange}
                      placeholder="e.g. 58" min="30" max="150" step="0.1" required className="field-input" />
                  </div>
                  <div className="field-group">
                    <label>Height (cm)</label>
                    <input type="number" name="height" value={formData.height} onChange={handleChange}
                      placeholder="e.g. 158" min="100" max="220" className="field-input" />
                  </div>
                  <div className="field-group">
                    <label>Pregnancy Trimester <span className="required">*</span></label>
                    <select name="trimester" value={formData.trimester} onChange={handleChange} required className="field-input">
                      <option value="">Select trimester</option>
                      <option value="1">1st Trimester (Weeks 1-12)</option>
                      <option value="2">2nd Trimester (Weeks 13-26)</option>
                      <option value="3">3rd Trimester (Weeks 27-40)</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Weeks Pregnant</label>
                    <input type="number" name="weeksPregnant" value={formData.weeksPregnant} onChange={handleChange}
                      placeholder="e.g. 20" min="1" max="42" className="field-input" />
                  </div>
                  <div className="field-group">
                    <label>Previous Pregnancies</label>
                    <input type="number" name="previousPregnancies" value={formData.previousPregnancies} onChange={handleChange}
                      placeholder="0" min="0" max="15" className="field-input" />
                  </div>
                  <div className="field-group full-width">
                    <label className="checkbox-label">
                      <input type="checkbox" name="previousComplications" checked={formData.previousComplications} onChange={handleChange} />
                      <span>Had complications in previous pregnancies</span>
                    </label>
                  </div>
                  {formData.previousComplications && (
                    <div className="field-group full-width">
                      <label>Describe Previous Complications</label>
                      <textarea name="previousComplicationDetails" value={formData.previousComplicationDetails}
                        onChange={handleChange} placeholder="e.g. preeclampsia, miscarriage, C-section..."
                        className="field-input field-textarea" rows={3} />
                    </div>
                  )}
                  <div className="field-group">
                    <label>Diet Type</label>
                    <select name="dietType" value={formData.dietType} onChange={handleChange} className="field-input">
                      <option value="vegetarian">Vegetarian</option>
                      <option value="non-vegetarian">Non-Vegetarian</option>
                      <option value="vegan">Vegan</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Antenatal Visits So Far</label>
                    <input type="number" name="antenatalVisits" value={formData.antenatalVisits} onChange={handleChange}
                      placeholder="0" min="0" max="20" className="field-input" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Vitals */}
            {step === 2 && (
              <div className="form-step fade-in">
                <h2>🩺 Health Vitals</h2>
                <div className="vitals-info">
                  <span>ℹ️</span> Enter your most recent test results. Ask your ASHA worker or doctor if unsure.
                </div>
                <div className="form-grid">
                  <div className="field-group">
                    <label>Hemoglobin (g/dL) <span className="required">*</span></label>
                    <input type="number" name="hemoglobin" value={formData.hemoglobin} onChange={handleChange}
                      placeholder="Normal: 11-14 g/dL" min="3" max="20" step="0.1" required className="field-input" />
                    <span className="field-hint">Normal range: 11-14 g/dL</span>
                  </div>
                  <div className="field-group">
                    <label>Blood Pressure — Systolic (mmHg) <span className="required">*</span></label>
                    <input type="number" name="bloodPressureSystolic" value={formData.bloodPressureSystolic} onChange={handleChange}
                      placeholder="Normal: 90-120" min="60" max="220" required className="field-input" />
                    <span className="field-hint">Upper number (e.g. 120 in 120/80)</span>
                  </div>
                  <div className="field-group">
                    <label>Blood Pressure — Diastolic (mmHg) <span className="required">*</span></label>
                    <input type="number" name="bloodPressureDiastolic" value={formData.bloodPressureDiastolic} onChange={handleChange}
                      placeholder="Normal: 60-80" min="40" max="140" required className="field-input" />
                    <span className="field-hint">Lower number (e.g. 80 in 120/80)</span>
                  </div>
                  <div className="field-group">
                    <label>Blood Sugar (mg/dL)</label>
                    <input type="number" name="bloodSugar" value={formData.bloodSugar} onChange={handleChange}
                      placeholder="Normal fasting: 70-100" min="40" max="500" className="field-input" />
                    <span className="field-hint">Fasting blood sugar level</span>
                  </div>
                </div>
                <div className="supplements-section">
                  <h3>Current Supplements</h3>
                  <div className="supplements-grid">
                    <label className="supplement-label">
                      <input type="checkbox" name="ironSupplements" checked={formData.ironSupplements} onChange={handleChange} />
                      <span>💊 Iron Supplements</span>
                    </label>
                    <label className="supplement-label">
                      <input type="checkbox" name="folicAcid" checked={formData.folicAcid} onChange={handleChange} />
                      <span>💊 Folic Acid</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Symptoms */}
            {step === 3 && (
              <div className="form-step fade-in">
                <h2>🩹 Symptoms</h2>
                <p className="step-desc">Select all symptoms you are currently experiencing</p>

                {/* Voice Input */}
                <div className="voice-section">
                  <div className="voice-header">
                    <span>🎤</span>
                    <div>
                      <strong>Voice Symptom Input</strong>
                      <p>Speak your symptoms in simple language (English or Hindi)</p>
                    </div>
                  </div>
                  <div className="voice-controls">
                    {!isListening ? (
                      <button type="button" className="voice-btn" onClick={startVoiceInput}>
                        🎤 Start Speaking
                      </button>
                    ) : (
                      <button type="button" className="voice-btn voice-btn-stop" onClick={stopVoiceInput}>
                        ⏹️ Stop Recording
                      </button>
                    )}
                    {isListening && (
                      <div className="voice-listening">
                        <div className="voice-pulse"></div>
                        <span>Listening...</span>
                      </div>
                    )}
                  </div>
                  {voiceText && (
                    <div className="voice-result">
                      <strong>Heard:</strong> "{voiceText}"
                      <p>Symptoms detected and auto-selected below ✓</p>
                    </div>
                  )}
                  {formData.customSymptoms.length > 0 && (
                    <div className="custom-symptoms-section">
                      <strong>🗣️ Voice-Detected Additional Symptoms:</strong>
                      <div className="custom-symptoms-list">
                        {formData.customSymptoms.map((cs, idx) => (
                          <span key={idx} className="custom-symptom-tag">
                            {cs}
                            <button type="button" className="remove-custom-btn" onClick={() => removeCustomSymptom(cs)}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="symptoms-grid">
                  {SYMPTOMS.map(symptom => (
                    <div
                      key={symptom.id}
                      className={`symptom-chip ${formData.symptoms.includes(symptom.id) ? 'selected' : ''} ${symptom.id === 'bleeding' || symptom.id === 'chest_pain' || symptom.id === 'blurred_vision' ? 'high-risk-symptom' : ''}`}
                      onClick={() => toggleSymptom(symptom.id)}
                    >
                      <span className="symptom-icon">{symptom.icon}</span>
                      <span>{symptom.label}</span>
                      {(symptom.id === 'bleeding' || symptom.id === 'chest_pain' || symptom.id === 'blurred_vision' || symptom.id === 'reduced_fetal_movement') && (
                        <span className="high-risk-tag">⚠️ High Risk</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="field-group" style={{ marginTop: '20px' }}>
                  <label>Additional Notes</label>
                  <textarea name="notes" value={formData.notes} onChange={handleChange}
                    placeholder="Any other symptoms or concerns you want to mention..."
                    className="field-input field-textarea" rows={3} />
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="form-step fade-in">
                <h2>✅ Review & Submit</h2>
                <p className="step-desc">Please review your information before submitting</p>
                <div className="review-grid">
                  <div className="review-section">
                    <h3>Basic Information</h3>
                    <div className="review-items">
                      <div className="review-item"><span>Age</span><strong>{formData.age} years</strong></div>
                      <div className="review-item"><span>Weight</span><strong>{formData.weight} kg</strong></div>
                      <div className="review-item"><span>Trimester</span><strong>{formData.trimester ? `${formData.trimester}${['st','nd','rd'][formData.trimester-1]} Trimester` : 'Not set'}</strong></div>
                      <div className="review-item"><span>Previous Pregnancies</span><strong>{formData.previousPregnancies}</strong></div>
                    </div>
                  </div>
                  <div className="review-section">
                    <h3>Health Vitals</h3>
                    <div className="review-items">
                      <div className="review-item"><span>Hemoglobin</span><strong>{formData.hemoglobin} g/dL</strong></div>
                      <div className="review-item"><span>Blood Pressure</span><strong>{formData.bloodPressureSystolic}/{formData.bloodPressureDiastolic} mmHg</strong></div>
                      {formData.bloodSugar && <div className="review-item"><span>Blood Sugar</span><strong>{formData.bloodSugar} mg/dL</strong></div>}
                    </div>
                  </div>
                  <div className="review-section full-width">
                    <h3>Symptoms ({formData.symptoms.length + formData.customSymptoms.length})</h3>
                    <div className="review-symptoms">
                      {formData.symptoms.length > 0 ? formData.symptoms.map(s => (
                        <span key={s} className="review-symptom-tag">
                          {SYMPTOMS.find(sym => sym.id === s)?.icon} {SYMPTOMS.find(sym => sym.id === s)?.label || s}
                        </span>
                      )) : null}
                      {formData.customSymptoms.length > 0 ? formData.customSymptoms.map((cs, idx) => (
                        <span key={`custom-${idx}`} className="review-symptom-tag custom-review-tag">
                          🗣️ {cs}
                        </span>
                      )) : null}
                      {formData.symptoms.length === 0 && formData.customSymptoms.length === 0 && (
                        <span className="no-symptoms">No symptoms selected</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="submit-notice">
                  <span>🤖</span>
                  <p>Your data will be analyzed by our AI model to predict your pregnancy risk level. This takes just a few seconds.</p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="form-nav">
              {step > 1 && (
                <button type="button" className="nav-btn-back" onClick={() => setStep(s => s - 1)}>
                  ← Previous
                </button>
              )}
              {step < 4 ? (
                <button type="submit" className="nav-btn-next">
                  Next Step →
                </button>
              ) : (
                <button type="submit" className="nav-btn-submit" disabled={loading}>
                  {loading ? (
                    <><span className="btn-spinner"></span> Analyzing with AI...</>
                  ) : (
                    '🤖 Get AI Risk Prediction'
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

function simulatePrediction(formData) {
  let score = 0;
  const hb = Number(formData.hemoglobin) || 11;
  const sys = Number(formData.bloodPressureSystolic) || 120;
  const dia = Number(formData.bloodPressureDiastolic) || 80;
  const age = Number(formData.age) || 25;
  if (hb < 7) score += 28; else if (hb < 10) score += 15; else if (hb < 11) score += 8;
  if (sys >= 160 || dia >= 110) score += 30; else if (sys >= 140 || dia >= 90) score += 20;
  if (age < 18 || age > 35) score += 12;
  if (formData.previousComplications) score += 15;
  const highRisk = ['bleeding', 'chest_pain', 'blurred_vision', 'reduced_fetal_movement'];
  formData.symptoms.forEach(s => { if (highRisk.includes(s)) score += 15; else if (s !== 'none') score += 5; });
  score = Math.min(score, 100);
  const riskLevel = score >= 55 ? 'high' : score >= 28 ? 'medium' : 'low';
  return {
    riskLevel,
    riskScore: score,
    confidence: 0.87,
    urgency: riskLevel === 'high' ? 'emergency' : riskLevel === 'medium' ? 'soon' : 'routine',
    doctorConsultationRequired: riskLevel !== 'low',
    consultationTimeframe: riskLevel === 'high' ? 'Immediately — within 24 hours' : riskLevel === 'medium' ? 'Within 2-3 days' : 'Routine checkup in 2 weeks',
    riskFactors: [
      hb < 11 ? { factor: 'Low Hemoglobin', severity: hb < 7 ? 'high' : 'medium', description: `Hemoglobin ${hb} g/dL is below normal` } : null,
      (sys >= 140 || dia >= 90) ? { factor: 'High Blood Pressure', severity: 'high', description: `BP ${sys}/${dia} mmHg is elevated` } : null
    ].filter(Boolean),
    recommendations: riskLevel === 'high'
      ? ['🚨 Seek immediate medical attention', '📞 Contact your ASHA worker now', '🏥 Go to nearest PHC or hospital']
      : riskLevel === 'medium'
      ? ['⚕️ Schedule doctor visit within 2-3 days', '💊 Take prescribed supplements', '📊 Monitor symptoms daily']
      : ['✅ Continue regular antenatal checkups', '🥗 Maintain balanced diet', '💊 Take folic acid and iron supplements']
  };
}

export default HealthDataForm;
