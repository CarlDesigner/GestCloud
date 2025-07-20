// Cliente para manejar Firebase en el navegador - GestCloud
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
        'carro': 150,
        'moto': 100
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
