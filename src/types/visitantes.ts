// Tipos para el sistema de gestión de visitantes

export interface Visitante {
  id?: string;
  nombre: string;
  cedula: string;
  celular: string;
  apartamento: string;
  autorizadoPor: string;
  tiempoEntrada: string; // ISO string
  tiempoSalida?: string | null; // ISO string o null si está activo
  activo: boolean;
}

export interface FormularioVisitante {
  nombre: string;
  cedula: string;
  celular: string;
  apartamento: string;
  autorizadoPor: string;
}

export interface VisitanteConTiempo extends Visitante {
  tiempoTranscurrido?: string; // "1h 30m"
  duracionTotal?: string; // "2h 15m" (solo para visitantes con salida)
}
