export interface ProductionPayment {
  id?: number;
  monto: number;
  fecha_pago: string | null;
  descripcion?: string | null;
}

export interface ProductionItem {
  id: number;
  cotizacionId: number;
  numeroCotizacion: string;
  cliente: string | null;
  contacto: string | null;
  proyecto: string | null;
  odc: string | null;
  valorTotal: number | null;
  fechaIngreso: string | null;
  fechaVencimiento: string | null;
  archivoOriginal: string | null;
  producto: string;
  cantidad: string | null;
  valorSubtotal: number | null;
  fechaEntrega: string | null;
  estatus: string | null;
  notasEstatus: string | null;
  factura: string | null;
  metadataNotes?: string[];
  pagos: ProductionPayment[];
  totalAbonado: number;
  saldoPendiente: number | null;
}

export interface ProductionUploadResult {
  archivo: string;
  cotizacion: string;
  productos: number;
}

export interface ProductionUploadResponse {
  message: string;
  resultados: ProductionUploadResult[];
}

export interface ProductionStatusResponse {
  items: ProductionItem[];
  statusOptions: string[];
}

export interface ProductionDeleteResponse {
  message: string;
  quoteId: number;
}

export interface ProductionPaymentPayload {
  monto: number;
  fecha_pago: string | null;
  descripcion?: string | null;
}

export interface ProductionUpdatePayload {
  fechaEntrega: string | null;
  estatus: string | null;
  notasEstatus: string | null;
  factura: string | null;
  fechaVencimiento: string | null;
  valorTotal: number | null;
  pagos: ProductionPaymentPayload[];
}
