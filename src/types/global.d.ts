// Tipos globales para GestCloud
declare global {
  interface Window {
    // Sistema de alertas/notificaciones
    mostrarAlert: (mensaje: string, tipo?: string, duracion?: number) => void;
    cerrarAlert: () => void;
    mostrarToast: (mensaje: string, tipo?: string, duracion?: number) => void;
    cerrarToast: () => void;
    
    // Modal de confirmación
    mostrarConfirmSalida: (visitanteId: string, visitanteNombre: string, callbackSalida: Function) => void;
    cerrarConfirmModal: () => void;
    ejecutarSalidaConfirmada: () => void;
    
    // Firebase
    __firestoreDb: any;
    registrarVisitante: (visitanteData: any) => Promise<any>;
    darSalidaVisitante: (visitanteId: string) => Promise<any>;
    escucharVisitantesActivos: (callback: (visitantes: any[]) => void) => () => void;
    escucharHistorialVisitantes: (callback: (visitantes: any[]) => void) => () => void;
    
    // Historial de visitantes
    mostrarMenuAcciones: (event: Event, visitanteId: string) => void;
    verVisitante: (visitanteId: string) => void;
    editarVisitante: (visitanteId: string) => void;
    eliminarVisitante: (visitanteId: string) => void;
  }
}

export {};
