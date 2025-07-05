// Cliente para obtener visitantes activos desde Firestore - GestCloud
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, onSnapshot, doc, serverTimestamp, runTransaction } from 'firebase/firestore';

// Usar instancia de Firebase precargada si está disponible
function getFirestoreInstance() {
  if (window.__firestoreDb) {
    return window.__firestoreDb;
  }
  
  // Fallback: configurar Firebase si no está precargado
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
  return getFirestore(app);
}

const db = getFirestoreInstance();

// Función auxiliar para formatear tiempo
function formatearTiempo(segundos) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;
  
  if (horas > 0) {
    return `${horas}h ${minutos}m ${segs}s`;
  }
  if (minutos > 0) {
    return `${minutos}m ${segs}s`;
  }
  return `${segs}s`;
}

// Función auxiliar para crear la colección de historial si no existe
async function crearColeccionHistorial() {
  const docInicializacion = {
    _tipo: 'inicializacion',
    _descripcion: 'Documento para inicializar la colección visitantes_historial',
    _fecha: serverTimestamp(),
    _eliminar: true
  };
  
  const historialCol = collection(db, 'visitantes_historial');
  const nuevoDoc = doc(historialCol);
  
  // Usar una transacción simple para crear el documento
  await runTransaction(db, async (transaction) => {
    transaction.set(nuevoDoc, docInicializacion);
  });
}

// Función para escuchar visitantes activos en tiempo real
export function escucharVisitantesActivos(callback) {
  const q = query(
    collection(db, 'visitantes'),
    where('activo', '==', true)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const visitantes = [];
    querySnapshot.forEach((documento) => {
      visitantes.push({
        id: documento.id,
        ...documento.data()
      });
    });
    
    // Ordenar por tiempo de entrada (más recientes primero)
    visitantes.sort((a, b) => {
      const fechaA = a.tiempoEntrada?.toDate ? a.tiempoEntrada.toDate() : new Date(a.fechaCreacion);
      const fechaB = b.tiempoEntrada?.toDate ? b.tiempoEntrada.toDate() : new Date(b.fechaCreacion);
      return fechaB - fechaA;
    });
    
    callback(visitantes);
  }, () => {
    // Intentar reconectar después de un error
    setTimeout(() => {
      escucharVisitantesActivos(callback);
    }, 2000);
  });
}

// Función para dar salida a un visitante (TEMPORAL: solo cambiar activo a false)
export async function darSalidaVisitante(visitanteId) {
  console.log('🚪 Iniciando proceso de salida para visitante:', visitanteId);
  
  try {
    // Verificar que tenemos acceso a Firestore
    if (!db) {
      throw new Error('Base de datos no inicializada');
    }

    console.log('📊 Método temporal: Solo marcar como inactivo...');
    
    // MÉTODO TEMPORAL: Solo actualizar el visitante existente
    const { getDoc, updateDoc } = await import('firebase/firestore');
    
    console.log('🔍 Buscando visitante en la base de datos...');
    
    // 1. Obtener visitante activo
    const visitanteRef = doc(db, 'visitantes', visitanteId);
    const visitanteDoc = await getDoc(visitanteRef);
    
    if (!visitanteDoc.exists()) {
      console.error('❌ Visitante no encontrado:', visitanteId);
      throw new Error('Visitante no encontrado en la base de datos');
    }
    
    const datosVisitante = visitanteDoc.data();
    console.log('✅ Visitante encontrado:', datosVisitante.nombre);
    
    // 2. Calcular tiempo de estancia
    const tiempoEntrada = datosVisitante.tiempoEntrada?.toDate ? 
      datosVisitante.tiempoEntrada.toDate() : 
      new Date(datosVisitante.fechaCreacion);
    
    const tiempoSalida = new Date();
    const tiempoTotal = Math.floor((tiempoSalida - tiempoEntrada) / 1000); // en segundos
    
    console.log('⏱️ Tiempo de permanencia calculado:', formatearTiempo(tiempoTotal));
    
    // 3. Calcular costo del vehículo si tiene vehículo
    let costoVehiculo = 0;
    let infoVehiculo = null;
    
    if (datosVisitante.vehiculo) {
      const minutos = Math.floor(tiempoTotal / 60); // Convertir segundos a minutos
      costoVehiculo = minutos * datosVisitante.vehiculo.tarifa;
      infoVehiculo = {
        ...datosVisitante.vehiculo,
        minutosEstacionado: minutos,
        costoTotal: costoVehiculo
      };
      console.log(`💰 Costo calculado para vehículo ${datosVisitante.vehiculo.tipo}: $${costoVehiculo.toLocaleString('es-CO')} (${minutos} minutos x $${datosVisitante.vehiculo.tarifa})`);
    }
    
    // 4. Actualizar el visitante existente con datos de salida
    const actualizacion = {
      activo: false,
      tiempoSalida: serverTimestamp(),
      fechaSalida: tiempoSalida.toISOString(),
      tiempoTotal,
      fechaSalidaLegible: tiempoSalida.toLocaleString('es-ES'),
      tiempoEstancia: formatearTiempo(tiempoTotal)
    };

    // Agregar información del vehículo si aplica
    if (infoVehiculo) {
      actualizacion.vehiculoFinal = infoVehiculo;
      actualizacion.costoVehiculo = costoVehiculo;
    }
    
    console.log('💾 Actualizando visitante como inactivo...');
    
    // 4. Actualizar el documento existente
    await updateDoc(visitanteRef, actualizacion);
    
    console.log('✅ Visitante marcado como inactivo');
    
    const resultado = {
      success: true,
      visitante: datosVisitante.nombre,
      tiempo: formatearTiempo(tiempoTotal),
      metodo: 'temporal_inactivo',
      costoVehiculo: costoVehiculo,
      vehiculo: infoVehiculo
    };
    
    console.log('✅ Salida completada exitosamente:', resultado);
    return resultado;
    
  } catch (error) {
    console.error('❌ Error en darSalidaVisitante:', error);
    console.error('📋 Detalles completos del error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      cause: error.cause
    });
    
    // Manejo de errores específicos
    if (error.code === 'permission-denied') {
      throw new Error('No tienes permisos para realizar esta operación. Verifica las reglas de Firebase.');
    } else if (error.code === 'not-found') {
      throw new Error('El visitante no fue encontrado en la base de datos.');
    } else if (error.code === 'unavailable') {
      throw new Error('Firebase no está disponible. Verifica tu conexión a internet.');
    } else if (error.code === 'failed-precondition') {
      throw new Error('Error de sincronización. Por favor, intenta nuevamente.');
    } else if (error.message?.includes('Missing or insufficient permissions')) {
      throw new Error('Permisos insuficientes para realizar esta operación.');
    } else {
      // Error genérico con más información
      throw new Error(`Error al procesar la salida: ${error.message || 'Error desconocido'}. Código: ${error.code || 'N/A'}`);
    }
  }
}

// Función para obtener historial de visitantes (los que ya salieron)
export function escucharHistorialVisitantes(callback) {
  // Por ahora buscar en visitantes_historial, si está vacío, buscar en visitantes inactivos
  const qHistorial = query(collection(db, 'visitantes_historial'));
  
  return onSnapshot(qHistorial, (querySnapshot) => {
    const visitantes = [];
    querySnapshot.forEach((documento) => {
      visitantes.push({
        id: documento.id,
        ...documento.data()
      });
    });
    
    // Si no hay visitantes en el historial, buscar en visitantes inactivos
    if (visitantes.length === 0) {
      const qInactivos = query(
        collection(db, 'visitantes'),
        where('activo', '==', false)
      );
      
      onSnapshot(qInactivos, (querySnapshotInactivos) => {
        const visitantesInactivos = [];
        querySnapshotInactivos.forEach((documento) => {
          visitantesInactivos.push({
            id: documento.id,
            ...documento.data()
          });
        });
        
        // Ordenar por tiempo de salida (más recientes primero)
        visitantesInactivos.sort((a, b) => {
          const fechaA = a.tiempoSalida?.toDate ? a.tiempoSalida.toDate() : new Date(a.fechaSalida || a.fechaCreacion);
          const fechaB = b.tiempoSalida?.toDate ? b.tiempoSalida.toDate() : new Date(b.fechaSalida || b.fechaCreacion);
          return fechaB - fechaA;
        });
        
        callback(visitantesInactivos);
      });
    } else {
      // Ordenar por tiempo de salida (más recientes primero)
      visitantes.sort((a, b) => {
        const fechaA = a.tiempoSalida?.toDate ? a.tiempoSalida.toDate() : new Date(a.fechaSalida);
        const fechaB = b.tiempoSalida?.toDate ? b.tiempoSalida.toDate() : new Date(b.fechaSalida);
        return fechaB - fechaA;
      });
      
      callback(visitantes);
    }
  }, () => {
    // Intentar reconectar después de un error
    setTimeout(() => {
      escucharHistorialVisitantes(callback);
    }, 2000);
  });
}

// Hacer funciones disponibles globalmente
window.escucharVisitantesActivos = escucharVisitantesActivos;
window.escucharHistorialVisitantes = escucharHistorialVisitantes;
window.darSalidaVisitante = darSalidaVisitante;
