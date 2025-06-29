// Script para inicializar colección de historial - GestCloud
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, addDoc, serverTimestamp } from 'firebase/firestore';

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Función para inicializar la colección de historial
export async function inicializarColeccionHistorial() {
  try {
    const docInicializacion = {
      _tipo: 'inicializacion',
      _descripcion: 'Documento para inicializar la colección visitantes_historial',
      _fecha: serverTimestamp(),
      _eliminar: true,
      _version: '1.0'
    };
    
    const docRef = await addDoc(collection(db, 'visitantes_historial'), docInicializacion);
    console.log('✅ Colección visitantes_historial inicializada:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error inicializando colección:', error);
    throw error;
  }
}

// Hacer función disponible globalmente
window.inicializarColeccionHistorial = inicializarColeccionHistorial;
