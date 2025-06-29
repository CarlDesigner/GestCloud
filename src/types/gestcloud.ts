// Tipos para el sistema GestCloud

export interface Visitante {
  id?: string;
  nombre: string;
  cedula: string;
  celular: string;
  apartamento: string;
  autorizadoPor: string;
  tiempoEntrada: string; // ISO timestamp
  tiempoSalida?: string | null; // ISO timestamp o null si está activo
  activo: boolean;
}

export interface VisitanteFormData {
  nombre: string;
  cedula: string;
  celular: string;
  apartamento: string;
  autorizadoPor: string;
}

export interface TiempoTranscurrido {
  horas: number;
  minutos: number;
  texto: string; // "1h 7min"
}

// Para el futuro módulo de vehículos
export interface Vehiculo {
  id?: string;
  placa: string;
  tipoVehiculo: 'carro' | 'moto' | 'bicicleta';
  visitanteId?: string; // Opcional, puede estar asociado a un visitante
  apartamento: string;
  tiempoEntrada: string;
  tiempoSalida?: string | null;
  activo: boolean;
}
