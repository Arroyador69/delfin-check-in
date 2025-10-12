// Esquemas RD 933/2021 (Parte y Viajeros) usando Zod
import { z } from 'zod';

export const documentoSchema = z.object({
  tipo: z.enum(['DNI', 'NIE', 'PASAPORTE', 'TIE']),
  numero: z.string().regex(/^[A-Z0-9-]{5,20}$/i, 'Número de documento inválido'),
  soporte: z.string().optional(),
});

export const viajeroSchema = z.object({
  nombre: z.string().min(1),
  primerApellido: z.string().min(1),
  segundoApellido: z.string().optional(),
  sexo: z.enum(['H', 'M', 'O']).optional(), // MIR: H=Hombre, M=Mujer, O=Otro
  documento: documentoSchema,
  nacionalidad: z.string().regex(/^[A-Z]{3}$/), // ISO-3166 alpha-3
  fechaNacimiento: z.string().date().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  residencia: z
    .object({
      direccion: z.string().optional(),
      localidad: z.string().optional(),
      pais: z.string().regex(/^[A-Z]{3}$/).optional(),
    })
    .optional(),
});

export const ejecucionContratoSchema = z.object({
  fechaHoraEntrada: z.string().datetime(),
  fechaHoraSalida: z.string().datetime(),
});

export const pagoSchema = z.object({
  tipo: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'PLATAFORMA']),
  identificacion: z.string().optional(), // se recomienda token del PSP
});

export const establecimientoSchema = z.object({
  denominacion: z.string().min(1),
  direccionCompleta: z.string().min(1),
  codigoEstablecimiento: z.string().optional(),
});

export const parteSchema = z.object({
  establecimiento: establecimientoSchema,
  viajeros: z.array(viajeroSchema).min(1),
  ejecucionContrato: ejecucionContratoSchema,
  pago: pagoSchema,
});

export type Parte = z.infer<typeof parteSchema>;
export type Viajero = z.infer<typeof viajeroSchema>;
