// Precargar Firebase para mejorar rendimiento - GestCloud
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCBwly1pkKYfH0tdcfnQMb1-A8sjOyuqtU",
  authDomain: "gestcloud-9d02f.firebaseapp.com",
  databaseURL: "https://gestcloud-9d02f-default-rtdb.firebaseio.com/",
  projectId: "gestcloud-9d02f",
  storageBucket: "gestcloud-9d02f.firebasestorage.app",
  messagingSenderId: "493348332872",
  appId: "1:493348332872:web:3e9540d0f567e4bc573f7d"
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
