import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAshaDashboard, acknowledgeAlert } from '../services/dataService';
import Navbar from '../components/Navbar';
import './AshaWorkerDashboard.css';
import { io } from "socket.io-client";
import { startAlarm,stopAlarm } from "../services/alarm";



const HOSPITAL_CACHE_KEY = 'jananicare_nearby_hospitals';
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const AshaWorkerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('patients');

  // Hospital state
  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [hospitalsFetched, setHospitalsFetched] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastCacheTime, setLastCacheTime] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
  const socket = io("http://localhost:5000");

  socket.on("sos-alert", (newAlert) => {
  console.log("SOS RECEIVED:", newAlert);

  startAlarm();

  setData(prevData => {
    if (!prevData) return prevData;

    return {
      ...prevData,
      pendingAlerts: [
        {
          _id: Date.now(),
          title: "🚨 Emergency Alert",
          message: `EMERGENCY: ${newAlert.name} needs help!`,
          severity: "critical",
          status: "pending",
          createdAt: new Date().toISOString(),
          motherId: {
            name: newAlert.name
          },
          location: `https://maps.google.com/?q=${newAlert.lat},${newAlert.lng}`
        },
        ...(prevData.pendingAlerts || [])
      ]
    };
  });
});
  return () => socket.disconnect();
}, []);

  useEffect(() => {
  const enableAudio = () => {
    const tempAudio = new Audio("/alarm.mp3");

    tempAudio.play()
      .then(() => {
        tempAudio.pause();
        tempAudio.currentTime = 0;
        console.log("✅ Audio unlocked");
      })
      .catch(() => {});

    document.removeEventListener("click", enableAudio);
  };

  document.addEventListener("click", enableAudio);
}, []);

  const fetchDashboard = async () => {
    try {
      const dashData = await getAshaDashboard();
      setData(dashData);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setData({ patients: [], pendingAlerts: [], stats: { total: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0, pendingAlerts: 0, criticalAlerts: 0 } });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
  try {
    stopAlarm();

    await acknowledgeAlert(alertId);

    fetchDashboard();

  } catch (err) {
    console.error('Acknowledge error:', err);
  }
};

  // ── Haversine distance (km) ──
  const calcDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ── Load cached hospitals ──
  const loadCachedHospitals = useCallback(() => {
    try {
      const cached = localStorage.getItem(HOSPITAL_CACHE_KEY);
      if (cached) {
        const { hospitals: cachedList, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
          setHospitals(cachedList);
          setIsFromCache(true);
          setLastCacheTime(new Date(timestamp));
          setHospitalsFetched(true);
          return true;
        }
      }
    } catch (e) { /* ignore parse errors */ }
    return false;
  }, []);

  // ── Fetch hospitals from Overpass API ──
  const fetchNearbyHospitals = useCallback(async (lat, lng) => {
    setHospitalsLoading(true);
    setLocationError(null);
    setIsFromCache(false);
    try {
      const query = `[out:json][timeout:15];(node["amenity"="hospital"](around:25000,${lat},${lng});node["amenity"="clinic"](around:25000,${lat},${lng});node["amenity"="doctors"](around:25000,${lat},${lng});way["amenity"="hospital"](around:25000,${lat},${lng});node["healthcare:speciality"~"maternity|gynaecology|obstetrics"](around:25000,${lat},${lng}););out center body;`;
      const resp = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      if (!resp.ok) throw new Error('API request failed');
      const json = await resp.json();

      // Maternity-related keywords (English + Indian terms)
      const maternityKeywords = ['maternity', 'maternal', 'nursing home', 'women', 'woman', 'gynec', 'obstet', 'pregnan', 'janani', 'prasuti', 'mahila', 'stri', 'lady', 'mother', 'child', 'phc', 'primary health', 'health cent', 'sub cent', 'anganwadi', 'delivery', 'neonatal', 'pediatr', 'paediatr'];

      const results = (json.elements || []).map(el => {
        const elLat = el.lat || el.center?.lat;
        const elLon = el.lon || el.center?.lon;
        const dist = elLat && elLon ? calcDistance(lat, lng, elLat, elLon) : null;
        const amenity = el.tags?.amenity || 'hospital';
        const name = (el.tags?.name || el.tags?.['name:en'] || '').toLowerCase();
        const speciality = (el.tags?.['healthcare:speciality'] || '').toLowerCase();

        // Check if maternity-related
        const isMaternityByName = maternityKeywords.some(kw => name.includes(kw));
        const isMaternityByTag = speciality.includes('maternity') || speciality.includes('gynaecology') || speciality.includes('obstetrics');
        const isPHC = name.includes('phc') || name.includes('primary health') || name.includes('health cent') || name.includes('sub cent');

        // Only include maternity-related facilities and PHCs
        if (!isMaternityByName && !isMaternityByTag && !isPHC) return null;

        let type = 'Hospital';
        if (amenity === 'clinic') type = 'Clinic';
        else if (amenity === 'doctors') type = 'PHC';
        if (isPHC) type = 'PHC';
        if (isMaternityByName || isMaternityByTag) type = name.includes('clinic') ? 'Maternity Clinic' : 'Maternity Hospital';
        if (isPHC) type = 'PHC';

        return {
          id: el.id,
          name: el.tags?.name || el.tags?.['name:en'] || 'Healthcare Facility',
          type,
          lat: elLat,
          lon: elLon,
          distance: dist,
          address: [el.tags?.['addr:street'], el.tags?.['addr:city'], el.tags?.['addr:district']].filter(Boolean).join(', ') || '',
          phone: el.tags?.phone || el.tags?.['contact:phone'] || '',
          emergency: el.tags?.emergency === 'yes',
          website: el.tags?.website || '',
          openingHours: el.tags?.opening_hours || ''
        };
      }).filter(h => h && h.lat && h.lon).sort((a, b) => (a.distance || 999) - (b.distance || 999));

      setHospitals(results);
      setHospitalsFetched(true);

      // Cache results
      localStorage.setItem(HOSPITAL_CACHE_KEY, JSON.stringify({ hospitals: results, timestamp: Date.now() }));
      setLastCacheTime(new Date());
    } catch (err) {
      console.error('Overpass API error:', err);
      // Try cache fallback
      if (!loadCachedHospitals()) {
        setLocationError('fetch_failed');
      }
    } finally {
      setHospitalsLoading(false);
    }
  }, [loadCachedHospitals]);

  // ── Request geolocation ──
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('unsupported');
      return;
    }
    setHospitalsLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        fetchNearbyHospitals(loc.lat, loc.lng);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setHospitalsLoading(false);
        if (!loadCachedHospitals()) {
          setLocationError('denied');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  }, [fetchNearbyHospitals, loadCachedHospitals]);

  // ── When hospital tab is selected ──
  useEffect(() => {
    if (activeTab === 'hospitals' && !hospitalsFetched && !hospitalsLoading) {
      requestLocation();
    }
  }, [activeTab, hospitalsFetched, hospitalsLoading, requestLocation]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading ASHA Dashboard...</p>
      </div>
    );
  }

  const { patients = [], pendingAlerts = [], stats = {} } = data || {};

  const filteredPatients = patients
    .filter(p => filter === 'all' || p.riskLevel === filter)
    .filter(p => !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.village?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="asha-page">
      <Navbar />
      <div className="asha-content">

        {/* Header */}
        <div className="asha-header fade-in">
          <div>
            <h1>ASHA Worker Dashboard 👩‍⚕️</h1>
            <p>Welcome back, {user?.name} · {user?.village || user?.assignedArea || 'Your Area'}</p>
          </div>
          <div className="header-date">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid fade-in">
          <div className="stat-card stat-total">
            <div className="stat-icon">👥</div>
            <div>
              <div className="stat-value">{stats.total || 0}</div>
              <div className="stat-name">Total Patients</div>
            </div>
          </div>
          <div className="stat-card stat-high">
            <div className="stat-icon">🔴</div>
            <div>
              <div className="stat-value">{stats.highRisk || 0}</div>
              <div className="stat-name">High Risk</div>
            </div>
          </div>
          <div className="stat-card stat-medium">
            <div className="stat-icon">🟡</div>
            <div>
              <div className="stat-value">{stats.mediumRisk || 0}</div>
              <div className="stat-name">Medium Risk</div>
            </div>
          </div>
          <div className="stat-card stat-low">
            <div className="stat-icon">🟢</div>
            <div>
              <div className="stat-value">{stats.lowRisk || 0}</div>
              <div className="stat-name">Low Risk</div>
            </div>
          </div>
          <div className="stat-card stat-alerts">
            <div className="stat-icon">🚨</div>
            <div>
              <div className="stat-value">{stats.pendingAlerts || 0}</div>
              <div className="stat-name">Pending Alerts</div>
            </div>
          </div>
          <div className="stat-card stat-critical">
            <div className="stat-icon">⚡</div>
            <div>
              <div className="stat-value">{stats.criticalAlerts || 0}</div>
              <div className="stat-name">Critical Alerts</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="asha-tabs fade-in">
          <button className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
            👥 Patient Monitoring ({patients.length})
          </button>
          <button className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
            🚨 Priority Alerts {pendingAlerts.length > 0 && <span className="alert-count">{pendingAlerts.length}</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'hospitals' ? 'active' : ''}`} onClick={() => setActiveTab('hospitals')}>
            🏥 Nearby Hospitals
          </button>
        </div>

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <div className="fade-in">
            {/* Filters */}
            <div className="filter-bar">
              <div className="search-box">
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search by name or village..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="filter-buttons">
                {['all', 'high', 'medium', 'low'].map(f => (
                  <button
                    key={f}
                    className={`filter-btn filter-${f} ${filter === f ? 'active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? '📋 All' : f === 'high' ? '🔴 High Risk' : f === 'medium' ? '🟡 Medium' : '🟢 Low Risk'}
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Cards */}
            <div className="patients-grid">
              {filteredPatients.length === 0 ? (
                <div className="empty-state">
                  <span>👥</span>
                  <p>No patients found matching your criteria</p>
                </div>
              ) : (
                filteredPatients.map((patient, i) => (
                  <PatientCard key={patient.id || i} patient={patient} onView={() => navigate(`/patient/${patient.id}`)} />
                ))
              )}
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="alerts-section fade-in">
            {pendingAlerts.length === 0 ? (
              <div className="empty-state">
                <span>✅</span>
                <p>No pending alerts — all patients are being monitored</p>
              </div>
            ) : (
              <div className="alerts-list">
                {pendingAlerts.map((alert, i) => (
                  <AlertCard key={alert._id || alert.id || i} alert={alert} onAcknowledge={() => handleAcknowledgeAlert(alert._id || alert.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hospitals Tab */}
        {activeTab === 'hospitals' && (
          <div className="hospitals-section fade-in">
            {/* Header bar */}
            <div className="hospitals-header">
              <div className="hospitals-header-info">
                <h2>🤰 Maternity Hospitals & PHCs</h2>
                <span className="hospitals-radius-badge">📍 25 km radius</span>
              </div>
              <div className="hospitals-header-actions">
                {isFromCache && lastCacheTime && (
                  <span className="cache-indicator">📦 Cached · {lastCacheTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
                <button className="refresh-hospitals-btn" onClick={() => { setHospitalsFetched(false); requestLocation(); }} disabled={hospitalsLoading}>
                  🔄 {hospitalsLoading ? 'Searching...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Loading */}
            {hospitalsLoading && (
              <div className="hospitals-loading">
                <div className="hospital-skeleton-grid">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="hospital-skeleton-card">
                      <div className="skeleton-line skeleton-title"></div>
                      <div className="skeleton-line skeleton-short"></div>
                      <div className="skeleton-line skeleton-medium"></div>
                    </div>
                  ))}
                </div>
                <p className="loading-text">📍 Finding nearby hospitals...</p>
              </div>
            )}

            {/* Location Error / Fallback */}
            {!hospitalsLoading && locationError && (
              <div className="location-fallback">
                <div className="location-error-card">
                  <span className="location-error-icon">{locationError === 'denied' ? '📍' : '⚠️'}</span>
                  <h3>{locationError === 'denied' ? 'Location Access Needed' : 'Unable to Find Hospitals'}</h3>
                  <p>{locationError === 'denied'
                    ? 'Allow location access to find hospitals, clinics, and PHCs near you.'
                    : 'Could not connect to the hospital database. Please check your internet connection.'}</p>
                  <button className="retry-location-btn" onClick={() => { setLocationError(null); requestLocation(); }}>
                    📍 Try Again
                  </button>
                </div>

                {/* Emergency Helplines Fallback */}
                <div className="emergency-helplines">
                  <h3>🚑 Emergency Helplines</h3>
                  <div className="helpline-grid">
                    <a href="tel:108" className="helpline-card helpline-emergency">
                      <div className="helpline-icon">🚑</div>
                      <div>
                        <div className="helpline-name">National Ambulance</div>
                        <div className="helpline-number">108</div>
                      </div>
                    </a>
                    <a href="tel:102" className="helpline-card helpline-maternal">
                      <div className="helpline-icon">🤰</div>
                      <div>
                        <div className="helpline-name">Janani Express (Maternal)</div>
                        <div className="helpline-number">102</div>
                      </div>
                    </a>
                    <a href="tel:181" className="helpline-card helpline-women">
                      <div className="helpline-icon">👩</div>
                      <div>
                        <div className="helpline-name">Women Helpline</div>
                        <div className="helpline-number">181</div>
                      </div>
                    </a>
                    <a href="tel:112" className="helpline-card helpline-general">
                      <div className="helpline-icon">📞</div>
                      <div>
                        <div className="helpline-name">Emergency Services</div>
                        <div className="helpline-number">112</div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Hospital Results */}
            {!hospitalsLoading && !locationError && hospitalsFetched && (
              <>
                {hospitals.length === 0 ? (
                  <div className="empty-state">
                    <span>🏥</span>
                    <p>No hospitals found within 25 km</p>
                  </div>
                ) : (
                  <>
                    <p className="hospitals-count">{hospitals.length} healthcare facilities found</p>
                    <div className="hospitals-grid">
                      {hospitals.map((hospital, i) => (
                        <HospitalCard key={hospital.id || i} hospital={hospital} />
                      ))}
                    </div>
                  </>
                )}

                {/* Always show emergency helplines at bottom */}
                <div className="emergency-helplines emergency-helplines-bottom">
                  <h3>🚑 Emergency Helplines</h3>
                  <div className="helpline-grid">
                    <a href="tel:108" className="helpline-card helpline-emergency">
                      <div className="helpline-icon">🚑</div>
                      <div>
                        <div className="helpline-name">National Ambulance</div>
                        <div className="helpline-number">108</div>
                      </div>
                    </a>
                    <a href="tel:102" className="helpline-card helpline-maternal">
                      <div className="helpline-icon">🤰</div>
                      <div>
                        <div className="helpline-name">Janani Express</div>
                        <div className="helpline-number">102</div>
                      </div>
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// HOSPITAL CARD
// ══════════════════════════════════════════════════════════

const HospitalCard = ({ hospital }) => {
  const typeConfig = {
    'Maternity Hospital': { bg: '#fdf2f8', border: '#f9a8d4', color: '#be185d', icon: '🤰' },
    'Maternity Clinic': { bg: '#fdf2f8', border: '#f9a8d4', color: '#be185d', icon: '🤰' },
    Hospital: { bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8', icon: '🏥' },
    Clinic: { bg: '#f0fdf4', border: '#86efac', color: '#16a34a', icon: '🩺' },
    PHC: { bg: '#fef3c7', border: '#fcd34d', color: '#b45309', icon: '🏛️' }
  };
  const config = typeConfig[hospital.type] || typeConfig.Hospital;

  const directionsUrl = hospital.lat && hospital.lon
    ? `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lon}`
    : '#';

  return (
    <div className="hospital-card" style={{ borderColor: config.border }}>
      <div className="hospital-card-header">
        <div className="hospital-type-badge" style={{ background: config.bg, color: config.color, borderColor: config.border }}>
          {config.icon} {hospital.type}
        </div>
        {hospital.emergency && <span className="hospital-emergency-tag">🚨 24/7</span>}
        {hospital.distance != null && (
          <span className="hospital-distance-badge">
            📍 {hospital.distance < 1 ? `${(hospital.distance * 1000).toFixed(0)} m` : `${hospital.distance.toFixed(1)} km`}
          </span>
        )}
      </div>

      <h3 className="hospital-name">{hospital.name}</h3>

      {hospital.address && <p className="hospital-address">📍 {hospital.address}</p>}

      {hospital.openingHours && <p className="hospital-hours">🕐 {hospital.openingHours}</p>}

      <div className="hospital-card-actions">
        {hospital.phone && (
          <a href={`tel:${hospital.phone}`} className="hospital-call-btn" onClick={e => e.stopPropagation()}>
            📞 Call
          </a>
        )}
        <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="hospital-directions-btn">
          🗺️ Get Directions
        </a>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// PATIENT CARD (unchanged)
// ══════════════════════════════════════════════════════════

const PatientCard = ({ patient, onView }) => {
  const riskColors = { high: '#dc2626', medium: '#d97706', low: '#16a34a', unknown: '#64748b' };
  const riskBgs = { high: '#fef2f2', medium: '#fffbeb', low: '#f0fdf4', unknown: '#f8fafc' };
  const riskBorders = { high: '#fca5a5', medium: '#fcd34d', low: '#86efac', unknown: '#e2e8f0' };
  const risk = patient.riskLevel || 'unknown';

  return (
    <div
      className="patient-card"
      style={{ borderColor: riskBorders[risk] }}
      onClick={onView}
    >
      <div className="patient-card-header">
        <div className="patient-avatar" style={{ background: riskBgs[risk], color: riskColors[risk] }}>
          {patient.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="patient-info">
          <h3>{patient.name}</h3>
          <p>📍 {patient.village || 'Unknown'}{patient.district ? `, ${patient.district}` : ''}</p>
        </div>
        <div className={`patient-risk-badge risk-badge-${risk}`}>
          {risk === 'high' ? '🔴' : risk === 'medium' ? '🟡' : risk === 'low' ? '🟢' : '⚪'}
          {risk.toUpperCase()}
        </div>
      </div>

      <div className="patient-details">
        <div className="patient-detail-item">
          <span>Trimester</span>
          <strong>{patient.currentTrimester ? `T${patient.currentTrimester}` : 'N/A'}</strong>
        </div>
        <div className="patient-detail-item">
          <span>Risk Score</span>
          <strong style={{ color: riskColors[risk] }}>{patient.latestRiskScore ?? 'N/A'}</strong>
        </div>
        <div className="patient-detail-item">
          <span>Urgency</span>
          <strong style={{ textTransform: 'capitalize' }}>{patient.urgency || 'N/A'}</strong>
        </div>
        <div className="patient-detail-item">
          <span>Assessments</span>
          <strong>{patient.totalPredictions || 0}</strong>
        </div>
      </div>

      {patient.phone && (
        <div className="patient-contact">
          <a href={`tel:${patient.phone}`} className="contact-call-btn" onClick={e => e.stopPropagation()}>
            📞 Call
          </a>
          <button className="contact-view-btn" onClick={onView}>View Details →</button>
        </div>
      )}

      {risk === 'high' && (
        <div className="patient-priority-tag">
          🚨 PRIORITY CASE — Immediate attention required
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ALERT CARD (unchanged)
// ══════════════════════════════════════════════════════════

const AlertCard = ({ alert, onAcknowledge }) => {
  const severityColors = { critical: '#dc2626', high: '#d97706', medium: '#2563eb', low: '#16a34a' };
  const severityBgs = { critical: '#fef2f2', high: '#fffbeb', medium: '#eff6ff', low: '#f0fdf4' };

  return (
    <div className="alert-card" style={{ background: severityBgs[alert.severity], borderColor: severityColors[alert.severity] + '40' }}>
      <div className="alert-card-header">
        <div className="alert-severity-dot" style={{ background: severityColors[alert.severity] }}></div>
        <div className="alert-info">
          <h3>{alert.title}</h3>
          <p>{alert.message}</p>
          <div style={{
              marginTop: "10px",
              padding: "10px",
              borderRadius: "10px",
              background: "#f1f5f9",
              border: "1px solid #e2e8f0"
            }}>
  <div style={{ marginBottom: "6px", fontSize: "13px", color: "#64748b" }}>
    📍 Patient Location
  </div>

  <a
    href={alert.location}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      textDecoration: "none",
      color: "#1e293b",
      fontWeight: "500"
    }}
  >
    Open in Google Maps →
  </a>
          </div>
        </div>
        <div className="alert-meta">
          <span className="alert-time">
            {new Date(alert.createdAt || Date.now()).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={`alert-status-badge status-${alert.status}`}>{alert.status?.toUpperCase()}</span>
        </div>
      </div>
      {alert.motherId && (
        <div className="alert-patient-info">
          <span>👤 {alert.motherId?.name || 'Patient'}</span>
          {alert.motherId?.village && <span>📍 {alert.motherId.village}</span>}
          {alert.motherId?.phone && <a href={`tel:${alert.motherId.phone}`} className="alert-call">📞 {alert.motherId.phone}</a>}
        </div>
      )}
      {alert.status === 'pending' && (
        <button className="acknowledge-btn" onClick={onAcknowledge}>
          ✓ Acknowledge Alert
        </button>
      )}
    </div>
  );
};

export default AshaWorkerDashboard;
