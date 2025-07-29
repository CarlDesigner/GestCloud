import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';


export interface VehiculoVisitante {
  tipo: 'carro' | 'moto' | string;
  placa: string;
  color: string;
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
 * Registra un visitante en la colección 'visitantes' de Firestore.
 * @param visitanteData - Datos del visitante.
 * @returns Promise con el ID del documento creado.
 */
export async function registrarVisitante(visitanteData: VisitanteData): Promise<string> {
  try {
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
      nuevoVisitante.vehiculo = {
        tipo: visitanteData.vehiculo.tipo,
        placa: visitanteData.vehiculo.placa.toUpperCase(),
        color: visitanteData.vehiculo.color,
        tarifa: tarifas[visitanteData.vehiculo.tipo] ?? 100
      };
    }

    const docRef = await addDoc(collection(db, 'visitantes'), nuevoVisitante);
    return docRef.id;
  } catch (error: any) {
    // Puedes mostrar un toast aquí si lo deseas
    throw error;
  }
}
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

export default app;
