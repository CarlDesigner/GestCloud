// Declaraciones globales para TypeScript - GestCloud

interface VisitanteData {
  id: string;
  nombre: string;
  vehiculo?: {
    placa: string;
    tarifa: number;
  };
  tiempoEntrada?: Date | { toDate(): Date };
  fechaCreacion?: Date;
}

interface ConfettiSettings {
  target: HTMLElement | Element | null;
  start_from_edge?: boolean;
  [key: string]: unknown;
}

interface ConfettiInstance {
  render: () => void;
}

declare global {
  interface Window {
    // Funciones de notificaciones
    mostrarAlert: (mensaje: string, tipo?: 'info' | 'success' | 'error' | 'warning', duracion?: number) => void;
    cerrarAlert: () => void;
    mostrarToast: (mensaje: string, tipo?: 'info' | 'success' | 'error' | 'warning', duracion?: number) => void;
    cerrarToast: () => void;
    
    // Funciones de modales de confirmación
    mostrarConfirmSalida: (
      visitanteId: string, 
      visitanteNombre: string, 
      callbackSalida: (id: string, nombre: string) => void, 
      visitanteData?: VisitanteData | null
    ) => void;
    cerrarConfirmModal: () => void;
    ejecutarSalidaConfirmada: () => void;
    
    // Funciones de historial de visitantes
    mostrarMenuAcciones: (event: Event, visitanteId: string) => void;
    verVisitante: (visitanteId: string) => void;
    editarVisitante: (visitanteId: string) => void;
    eliminarVisitante: (visitanteId: string) => void;
    
    // Funciones de visitantes activos
    darSalidaVisitante: (visitanteId: string) => Promise<unknown>;
    
    // Funciones auxiliares globales
    obtenerInfoVehiculoCompleta?: (visitante: VisitanteData) => string;
    obtenerCostoVehiculoCompleto?: (visitante: VisitanteData) => string;
    obtenerInfoVehiculo?: (visitante: VisitanteData) => string;
    obtenerCostoVehiculo?: (visitante: VisitanteData) => string;
    
    // Firebase
    __firestoreDb?: import('firebase/firestore').Firestore;
    
    // Funciones de visitantes
    escucharHistorialVisitantes?: (callback: (visitantes: VisitanteData[]) => void) => () => void;
    escucharVisitantesActivos?: (callback: (visitantes: VisitanteData[]) => void) => () => void;
    
    // ConfettiGenerator (librería externa)
    ConfettiGenerator: new (settings: ConfettiSettings) => ConfettiInstance;
  }
}

export {};
