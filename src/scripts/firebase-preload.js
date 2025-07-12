// Precargar Firebase para mejorar rendimiento - GestCloud
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Configuración usando variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.PUBLIC_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
};

// Inicializar Firebase de forma temprana
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Hacer disponible globalmente para reutilización
window.__firebaseApp = app;
window.__firestoreDb = db;

// Precargar la conexión
const preconnect = () => {
  return new Promise((resolve) => {
    // Simplemente intentar conectar
    resolve(db);
  });
};

// Ejecutar precarga
preconnect().then(() => {
  console.log('Firebase precargado exitosamente');
}).catch((error) => {
  console.warn('Error precargando Firebase:', error);
});

export { app, db };
