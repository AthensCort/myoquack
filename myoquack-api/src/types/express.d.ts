export {}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id_medico: string
        nombre_completo: string
      }
    }
  }
}
