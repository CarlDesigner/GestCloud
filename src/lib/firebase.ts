// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuración real de Firebase para GestCloud
const firebaseConfig = {
  apiKey: "AIzaSyCBwly1pkKYfH0tdcfnQMb1-A8sjOyuqtU",
  authDomain: "gestcloud-9d02f.firebaseapp.com",
  databaseURL: "https://gestcloud-9d02f-default-rtdb.firebaseio.com/",
  projectId: "gestcloud-9d02f",
  storageBucket: "gestcloud-9d02f.firebasestorage.app",
  messagingSenderId: "493348332872",
  appId: "1:493348332872:web:3e9540d0f567e4bc573f7d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
