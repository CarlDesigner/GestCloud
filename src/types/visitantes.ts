// Tipos para el sistema de gestión de visitantes

export interface Vehiculo {
  tipo: 'carro' | 'moto';
  placa: string;
  color: string;
  tarifa: number; // Tarifa por minuto en pesos
}

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
  vehiculo?: Vehiculo | null; // Información del vehículo (opcional)
}

export interface FormularioVisitante {
  nombre: string;
  cedula: string;
  celular: string;
  apartamento: string;
  autorizadoPor: string;
  tieneVehiculo?: boolean;
  vehiculo?: {
    tipo: string;
    placa: string;
    color: string;
  };
}

export interface VisitanteConTiempo extends Visitante {
  tiempoTranscurrido?: string; // "1h 30m"
  duracionTotal?: string; // "2h 15m" (solo para visitantes con salida)
  costoAcumulado?: number; // Costo acumulado del vehículo en tiempo real
}
