import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuración usando variables de entorno para GestCloud
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.PUBLIC_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

export interface VehiculoVisitante {
  tipo: 'carro' | 'moto' | string;
  placa: string;
  color: string;
  parqueadero?: string;
}

export interface VisitanteData {
  nombre: string;
  cedula: string;
  celular: string;
  apartamento: string;
  autorizadoPor: string;
  vehiculo?: VehiculoVisitante;
}

/**
 * Busca el primer parqueadero disponible en orden ascendente (V-1, V-2, V-3...)
 * @returns El ID del parqueadero disponible o null si todos están ocupados
 */
async function buscarPrimerParqueaderoDisponible(): Promise<string | null> {
  // Obtener todos los parqueaderos y filtrar en el cliente para evitar índices compuestos
  const parqueaderosQuery = query(collection(db, 'parqueaderos_visitantes'));
  const snapshot = await getDocs(parqueaderosQuery);
  
  if (snapshot.empty) {
    return null; // No hay parqueaderos configurados
  }
  
  // Mapear todos los parqueaderos con su información
  const todosLosParqueaderos = snapshot.docs.map(docRef => ({
    docId: docRef.id,
    data: docRef.data() as { id: string; estado: string }
  }));
  
  // Filtrar solo los libres y ordenarlos numéricamente en el cliente
  const parqueaderosLibres = todosLosParqueaderos
    .filter(p => p.data.estado === 'libre')
    .sort((a, b) => {
      const getNum = (id: string) => {
        const match = id.match(/(\d+)/);
        return match?.[1] ? parseInt(match[1], 10) : 0;
      };
      return getNum(a.data.id) - getNum(b.data.id);
    });
  
  return parqueaderosLibres[0]?.data.id ?? null;
}

/**
 * Función exportada para obtener el próximo parqueadero disponible (para mostrar en UI)
 * @returns El ID del próximo parqueadero disponible o null si todos están ocupados
 */
export async function obtenerProximoParqueaderoDisponible(): Promise<string | null> {
  try {
    return await buscarPrimerParqueaderoDisponible();
  } catch (error) {
    // Si hay error, devolver null para mostrar mensaje de error
    return null;
  }
}

/**
 * Registra un visitante en la colección 'visitantes' de Firestore.
 * @param visitanteData - Datos del visitante.
 * @returns Promise con el ID del documento creado.
 */
export async function registrarVisitante(visitanteData: VisitanteData): Promise<string> {
  const nuevoVisitante: Omit<VisitanteData, 'vehiculo'> & {
    vehiculo?: VehiculoVisitante & { tarifa: number };
    tiempoEntrada: ReturnType<typeof serverTimestamp>;
    tiempoSalida: null;
    activo: boolean;
    fechaCreacion: string;
  } = {
    nombre: visitanteData.nombre,
    cedula: visitanteData.cedula,
    celular: visitanteData.celular,
    apartamento: visitanteData.apartamento,
    autorizadoPor: visitanteData.autorizadoPor,
    tiempoEntrada: serverTimestamp(),
    tiempoSalida: null,
    activo: true,
    fechaCreacion: new Date().toISOString()
  };

  if (visitanteData.vehiculo) {
    const tarifas: Record<string, number> = {
      carro: 150,
      moto: 100
    };
    
    // Asignar automáticamente el primer parqueadero disponible
    const parqueaderoAsignado = await buscarPrimerParqueaderoDisponible();
    
    nuevoVisitante.vehiculo = {
      tipo: visitanteData.vehiculo.tipo,
      placa: visitanteData.vehiculo.placa.toUpperCase(),
      color: visitanteData.vehiculo.color,
      tarifa: tarifas[visitanteData.vehiculo.tipo] ?? 100,
      parqueadero: parqueaderoAsignado ?? ''
    };

    // Si se pudo asignar un parqueadero, actualizarlo como ocupado
    if (parqueaderoAsignado) {
      const parqueaderosQuery = query(
        collection(db, 'parqueaderos_visitantes'), 
        where('id', '==', parqueaderoAsignado)
      );
      const parqueaderosSnapshot = await getDocs(parqueaderosQuery);
      
      if (!parqueaderosSnapshot.empty) {
        const parqueaderoDoc = parqueaderosSnapshot.docs[0];
        if (parqueaderoDoc) {
          await updateDoc(doc(db, 'parqueaderos_visitantes', parqueaderoDoc.id), {
            estado: 'ocupado',
            visitante: visitanteData.nombre,
            vehiculo: visitanteData.vehiculo.placa.toUpperCase(),
            apartamento: visitanteData.apartamento
          });
        }
      }
    } else {
      // No hay parqueaderos disponibles
      // En el futuro se podría lanzar un error o mostrar un mensaje al usuario
    }
  }

  const docRef = await addDoc(collection(db, 'visitantes'), nuevoVisitante);
  return docRef.id;
}

export default app;
