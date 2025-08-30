import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { VisitanteData } from './firebase';

export async function obtenerParqueaderosDisponibles() {
  const q = query(collection(db, 'parqueaderos_visitantes'), where('estado', '==', 'libre'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docItem => ({ id: docItem.id, ...docItem.data() }));
}

export async function asignarParqueadero(parqueaderoId: string, visitanteData: VisitanteData) {
  const parqueaderosQuery = query(
    collection(db, 'parqueaderos_visitantes'), 
    where('id', '==', parqueaderoId)
  );
  const snapshot = await getDocs(parqueaderosQuery);
  
  if (!snapshot.empty) {
    const parqueaderoDoc = snapshot.docs[0];
    if (parqueaderoDoc) {
      await updateDoc(doc(db, 'parqueaderos_visitantes', parqueaderoDoc.id), {
        estado: 'ocupado',
        visitante: visitanteData.nombre,
        vehiculo: visitanteData.vehiculo?.placa ?? '',
        apartamento: visitanteData.apartamento
      });
    }
  }
}

export async function liberarParqueadero(parqueaderoId: string) {
  const parqueaderosQuery = query(
    collection(db, 'parqueaderos_visitantes'), 
    where('id', '==', parqueaderoId)
  );
  const snapshot = await getDocs(parqueaderosQuery);
  
  if (!snapshot.empty) {
    const parqueaderoDoc = snapshot.docs[0];
    if (parqueaderoDoc) {
      await updateDoc(doc(db, 'parqueaderos_visitantes', parqueaderoDoc.id), {
        estado: 'libre',
        visitante: null,
        vehiculo: null,
        apartamento: null
      });
    }
  }
}
