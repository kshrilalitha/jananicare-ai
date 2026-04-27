import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCWHpN43lPj_w59_lICT7XmTRX4TPH9mZg",
  authDomain: "jananicare-ai.firebaseapp.com",
  projectId: "jananicare-ai",
  storageBucket: "jananicare-ai.firebasestorage.app",
  messagingSenderId: "654179777021",
  appId: "1:654179777021:web:420bed6b6cd5e9b8868194",
  measurementId: "G-VJNFBMJ9ES"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth and Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
