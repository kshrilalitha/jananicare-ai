from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────
# Rule-based + weighted ML-style prediction
# In production, replace with a trained sklearn model
# ─────────────────────────────────────────────

SYMPTOM_WEIGHTS = {
    'bleeding': 20,
    'chest_pain': 18,
    'blurred_vision': 16,
    'reduced_fetal_movement': 15,
    'severe_headache': 14,
    'headache': 10,
    'abdominal_pain': 12,
    'shortness_of_breath': 12,
    'swelling': 8,
    'dizziness': 7,
    'fatigue': 4,
    'nausea': 3,
    'vomiting': 4,
    'fever': 6,
    'none': 0
}

def calculate_risk_score(data):
    score = 0
    risk_factors = []

    age = float(data.get('age', 25))
    hemoglobin = float(data.get('hemoglobin', 11))
    bp_sys = float(data.get('bloodPressureSystolic', 120))
    bp_dia = float(data.get('bloodPressureDiastolic', 80))
    trimester = int(data.get('trimester', 1))
    prev_pregnancies = int(data.get('previousPregnancies', 0))
    prev_complications = int(data.get('previousComplications', 0))
    blood_sugar = float(data.get('bloodSugar', 90))
    symptoms = data.get('symptoms', [])

    # ── Age Risk ──────────────────────────────
    if age < 18:
        score += 22
        risk_factors.append({
            'factor': 'Very Young Age',
            'severity': 'high',
            'description': f'Age {age} is below 18 — significantly increases maternal risk'
        })
    elif age < 20:
        score += 12
        risk_factors.append({
            'factor': 'Young Maternal Age',
            'severity': 'medium',
            'description': f'Age {age} carries elevated risk for first-time mothers'
        })
    elif age > 40:
        score += 20
        risk_factors.append({
            'factor': 'Advanced Maternal Age (>40)',
            'severity': 'high',
            'description': 'Age above 40 significantly increases risk of complications'
        })
    elif age > 35:
        score += 12
        risk_factors.append({
            'factor': 'Advanced Maternal Age',
            'severity': 'medium',
            'description': 'Age above 35 increases risk of chromosomal abnormalities'
        })

    # ── Hemoglobin ────────────────────────────
    if hemoglobin < 7:
        score += 28
        risk_factors.append({
            'factor': 'Severe Anemia',
            'severity': 'high',
            'description': f'Hemoglobin {hemoglobin} g/dL — critically low, immediate intervention needed'
        })
    elif hemoglobin < 9:
        score += 18
        risk_factors.append({
            'factor': 'Moderate Anemia',
            'severity': 'high',
            'description': f'Hemoglobin {hemoglobin} g/dL — significantly below normal (11 g/dL)'
        })
    elif hemoglobin < 11:
        score += 10
        risk_factors.append({
            'factor': 'Mild Anemia',
            'severity': 'medium',
            'description': f'Hemoglobin {hemoglobin} g/dL — slightly below normal range'
        })

    # ── Blood Pressure ────────────────────────
    if bp_sys >= 160 or bp_dia >= 110:
        score += 32
        risk_factors.append({
            'factor': 'Severe Hypertension / Preeclampsia Risk',
            'severity': 'high',
            'description': f'BP {bp_sys}/{bp_dia} mmHg — critically elevated, risk of eclampsia'
        })
    elif bp_sys >= 140 or bp_dia >= 90:
        score += 22
        risk_factors.append({
            'factor': 'Hypertension',
            'severity': 'high',
            'description': f'BP {bp_sys}/{bp_dia} mmHg — high blood pressure detected'
        })
    elif bp_sys >= 130 or bp_dia >= 85:
        score += 10
        risk_factors.append({
            'factor': 'Pre-hypertension',
            'severity': 'medium',
            'description': f'BP {bp_sys}/{bp_dia} mmHg — borderline elevated'
        })
    elif bp_sys < 90 or bp_dia < 60:
        score += 8
        risk_factors.append({
            'factor': 'Low Blood Pressure',
            'severity': 'medium',
            'description': f'BP {bp_sys}/{bp_dia} mmHg — hypotension can cause dizziness and fainting'
        })

    # ── Blood Sugar ───────────────────────────
    if blood_sugar > 200:
        score += 20
        risk_factors.append({
            'factor': 'Gestational Diabetes (Severe)',
            'severity': 'high',
            'description': f'Blood sugar {blood_sugar} mg/dL — severely elevated, gestational diabetes'
        })
    elif blood_sugar > 140:
        score += 12
        risk_factors.append({
            'factor': 'Elevated Blood Sugar',
            'severity': 'medium',
            'description': f'Blood sugar {blood_sugar} mg/dL — risk of gestational diabetes'
        })

    # ── Previous Complications ────────────────
    if prev_complications:
        score += 15
        risk_factors.append({
            'factor': 'Previous Pregnancy Complications',
            'severity': 'medium',
            'description': 'History of complications increases recurrence risk'
        })

    if prev_pregnancies >= 4:
        score += 8
        risk_factors.append({
            'factor': 'Grand Multiparity',
            'severity': 'medium',
            'description': f'{prev_pregnancies} previous pregnancies — increased risk of complications'
        })

    # ── Symptoms ──────────────────────────────
    for symptom in symptoms:
        weight = SYMPTOM_WEIGHTS.get(symptom, 0)
        if weight > 0:
            score += weight
            severity = 'high' if weight >= 12 else ('medium' if weight >= 6 else 'low')
            risk_factors.append({
                'factor': f'Symptom: {symptom.replace("_", " ").title()}',
                'severity': severity,
                'description': get_symptom_description(symptom)
            })

    # Cap at 100
    score = min(int(score), 100)

    return score, risk_factors


def get_symptom_description(symptom):
    descriptions = {
        'bleeding': 'Vaginal bleeding during pregnancy requires immediate medical attention',
        'chest_pain': 'Chest pain may indicate cardiac or pulmonary complications',
        'blurred_vision': 'Visual disturbances can be a sign of preeclampsia',
        'reduced_fetal_movement': 'Decreased fetal movement requires urgent evaluation',
        'severe_headache': 'Severe headache may indicate hypertensive disorders',
        'headache': 'Persistent headache should be monitored',
        'abdominal_pain': 'Abdominal pain may indicate placental or uterine issues',
        'shortness_of_breath': 'Breathing difficulty may indicate cardiac or pulmonary issues',
        'swelling': 'Edema in hands/face may indicate preeclampsia',
        'dizziness': 'Dizziness may indicate anemia or blood pressure issues',
        'fatigue': 'Excessive fatigue may indicate anemia or other conditions',
        'nausea': 'Persistent nausea should be monitored',
        'vomiting': 'Severe vomiting can lead to dehydration',
        'fever': 'Fever during pregnancy requires prompt medical evaluation'
    }
    return descriptions.get(symptom, 'Symptom requires medical evaluation')


def get_recommendations(risk_level, risk_factors, trimester):
    base_recs = {
        'high': [
            '🚨 Seek IMMEDIATE medical attention — do not delay',
            '📞 Contact your ASHA worker or doctor RIGHT NOW',
            '🏥 Go to the nearest Primary Health Centre or hospital today',
            '👥 Do not stay alone — have a family member with you at all times',
            '🚫 Avoid any physical exertion or stress',
            '📋 Carry all your medical records to the hospital'
        ],
        'medium': [
            '⚕️ Schedule a doctor visit within the next 2-3 days',
            '📊 Monitor your blood pressure and symptoms daily',
            '💊 Ensure you are taking all prescribed supplements (Iron, Folic Acid)',
            '🥗 Maintain a nutritious diet rich in iron and protein',
            '😴 Get adequate rest — at least 8 hours of sleep',
            '📞 Keep your ASHA worker informed of any changes'
        ],
        'low': [
            '✅ Continue your regular antenatal checkups as scheduled',
            '🥗 Maintain a balanced diet with iron-rich foods',
            '💊 Take folic acid and iron supplements daily',
            '🚶 Light exercise like walking 20-30 minutes daily is beneficial',
            '💧 Stay well hydrated — drink 8-10 glasses of water daily',
            '😊 Practice stress management — yoga, meditation, or deep breathing'
        ]
    }

    trimester_recs = {
        1: ['Take folic acid 400mcg daily to prevent neural tube defects', 'Avoid alcohol, smoking, and raw/undercooked foods'],
        2: ['Attend all scheduled ultrasound appointments', 'Start prenatal exercises if cleared by your doctor'],
        3: ['Prepare your birth plan and hospital bag', 'Monitor fetal movements daily — at least 10 movements in 2 hours']
    }

    recs = base_recs.get(risk_level, base_recs['low']).copy()
    recs.extend(trimester_recs.get(trimester, []))
    return recs


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        risk_score, risk_factors = calculate_risk_score(data)
        trimester = int(data.get('trimester', 1))

        # Determine risk level
        if risk_score >= 55:
            risk_level = 'high'
            urgency = 'emergency'
            doctor_required = True
            consultation_timeframe = 'Immediately — within 24 hours'
            confidence = 0.91
        elif risk_score >= 28:
            risk_level = 'medium'
            urgency = 'soon'
            doctor_required = True
            consultation_timeframe = 'Within 2-3 days'
            confidence = 0.87
        else:
            risk_level = 'low'
            urgency = 'routine'
            doctor_required = False
            consultation_timeframe = 'Routine checkup in 2 weeks'
            confidence = 0.89

        recommendations = get_recommendations(risk_level, risk_factors, trimester)

        return jsonify({
            'riskLevel': risk_level,
            'riskScore': risk_score,
            'confidence': confidence,
            'riskFactors': risk_factors,
            'recommendations': recommendations,
            'urgency': urgency,
            'doctorConsultationRequired': doctor_required,
            'consultationTimeframe': consultation_timeframe,
            'modelVersion': '1.0',
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'JananiCare AI Prediction API is running',
        'version': '1.0',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    """Predict risk for multiple patients at once"""
    try:
        patients = request.get_json()
        results = []
        for patient in patients:
            risk_score, risk_factors = calculate_risk_score(patient)
            risk_level = 'high' if risk_score >= 55 else ('medium' if risk_score >= 28 else 'low')
            results.append({
                'patientId': patient.get('patientId'),
                'riskLevel': risk_level,
                'riskScore': risk_score
            })
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print('🤖 JananiCare AI Prediction API starting on port 5001...')
    app.run(host='0.0.0.0', port=5001, debug=True)
