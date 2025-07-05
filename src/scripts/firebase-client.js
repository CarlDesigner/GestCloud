// Cliente para manejar Firebase en el navegador - GestCloud
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Función para registrar visitante en Firestore
export async function registrarVisitante(visitanteData) {
  try {
    const nuevoVisitante = {
      nombre: visitanteData.nombre,
      cedula: visitanteData.cedula,
      celular: visitanteData.celular,
      apartamento: visitanteData.apartamento,
      autorizadoPor: visitanteData.autorizadoPor,
      tiempoEntrada: serverTimestamp(), // Usa el timestamp del servidor
      tiempoSalida: null,
      activo: true,
      fechaCreacion: new Date().toISOString() // Para mostrar fecha legible
    };

    // Agregar información del vehículo si existe
    if (visitanteData.vehiculo) {
      // Definir tarifas por tipo de vehículo (pesos por minuto)
      const tarifas = {
        'carro': 100,
        'moto': 150
      };

      nuevoVisitante.vehiculo = {
        tipo: visitanteData.vehiculo.tipo,
        placa: visitanteData.vehiculo.placa.toUpperCase(),
        color: visitanteData.vehiculo.color,
        tarifa: tarifas[visitanteData.vehiculo.tipo] || 100
      };
    }
    
    const docRef = await addDoc(collection(db, 'visitantes'), nuevoVisitante);
    
    return docRef.id;
  } catch (error) {
    console.error('Error registrando visitante:', error);
    throw error;
  }
}

// Hacer disponible globalmente para el formulario
window.registrarVisitante = registrarVisitante;
