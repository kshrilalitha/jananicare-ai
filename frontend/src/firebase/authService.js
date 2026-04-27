// ─────────────────────────────────────────────────────────
// Firebase Auth Service — Register, Login, Logout
// ─────────────────────────────────────────────────────────

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

// ── Register new user ──────────────────────────────────
export const registerUser = async (formData) => {
  const {
    name, email, password, role,
    phone, village, district, state,
    ashaId, assignedArea
  } = formData;

  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Update display name
  await updateProfile(user, { displayName: name });

  // Save user profile to Firestore
  const userData = {
    uid: user.uid,
    name,
    email,
    role: role || 'mother',
    phone: phone || '',
    village: village || '',
    district: district || '',
    state: state || '',
    ashaId: ashaId || '',
    assignedArea: assignedArea || '',
    isActive: true,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp()
  };

  await setDoc(doc(db, 'users', user.uid), userData);

  // If mother, create a profile document
  if (userData.role === 'mother') {
    await setDoc(doc(db, 'motherProfiles', user.uid), {
      userId: user.uid,
      name,
      email,
      phone: phone || '',
      village: village || '',
      district: district || '',
      currentTrimester: null,
      currentRiskLevel: 'unknown',
      totalPredictions: 0,
      medicineReminders: [
        { medicine: 'Iron + Folic Acid Tablet', time: '08:00 AM', frequency: 'Daily' },
        { medicine: 'Calcium Supplement', time: '02:00 PM', frequency: 'Daily' },
        { medicine: 'Vitamin D', time: '08:00 AM', frequency: 'Weekly' }
      ],
      createdAt: serverTimestamp()
    });
  }

  return { uid: user.uid, ...userData };
};

// ── Login existing user ────────────────────────────────
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Get user profile from Firestore
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) {
    throw new Error('User profile not found');
  }

  // Update last login
  await setDoc(doc(db, 'users', user.uid), { lastLogin: serverTimestamp() }, { merge: true });

  return { uid: user.uid, ...userDoc.data() };
};

// ── Logout ─────────────────────────────────────────────
export const logoutUser = async () => {
  await signOut(auth);
};

// ── Get current user profile from Firestore ───────────
export const getUserProfile = async (uid) => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;
  return { uid, ...userDoc.data() };
};

// ── Auth state listener ────────────────────────────────
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
