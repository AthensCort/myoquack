import type {
  Doctor,
  MusculoTrabajo,
  Paciente,
  SesionEmg,
  EventoContraccion,
} from '../models/types'

export const MUSCLE_OPTIONS: MusculoTrabajo[] = [
  'Gluteus Medius',
  'Quadriceps',
  'Hamstrings',
  'Tibialis Anterior',
  'Gastrocnemius',
]

export const seedDoctors: Doctor[] = [
  {
    id_medico: 'DR001',
    password_hash: '$2b$10$8zYX73yJD3INW.ngasG8/.o7WGooaZESyzVjoCubXz.InY/CiQCYK',
    nombre_completo: 'Dr. Daniela Romero',
    fecha_creacion: new Date('2025-01-10T09:00:00'),
  },
]

export const seedPatients: Paciente[] = [
  {
    id_paciente: 'P-0001',
    id_medico: 'DR001',
    nombre: 'Luis',
    apellidos: 'Martinez Ortega',
    fecha_nacimiento: '1992-02-27',
    genero: 'M',
    notas_clinicas: 'Debilidad leve de gluteo medio derecho.',
    fecha_registro: '2026-02-27T11:20:00.000Z',
  },
  {
    id_paciente: 'P-0002',
    id_medico: 'DR001',
    nombre: 'Ana',
    apellidos: 'Cruz Ramirez',
    fecha_nacimiento: '1997-02-28',
    genero: 'F',
    notas_clinicas: 'Postoperatorio de rodilla, fase de fortalecimiento.',
    fecha_registro: '2026-02-28T16:45:00.000Z',
  },
  {
    id_paciente: 'P-0003',
    id_medico: 'DR001',
    nombre: 'Jorge',
    apellidos: 'Nava Soto',
    fecha_nacimiento: '1984-03-01',
    genero: 'M',
    notas_clinicas: 'Rehabilitacion funcional bilateral.',
    fecha_registro: '2026-03-01T08:40:00.000Z',
  },
]

export const seedSessions: SesionEmg[] = []
export const seedEvents: EventoContraccion[] = []
