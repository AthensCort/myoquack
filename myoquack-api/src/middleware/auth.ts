import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

interface AuthPayload {
  id_medico: string;
  nombre_completo: string;
  iat?: number;
  exp?: number;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Token de autenticacion requerido",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        error: "JWT_SECRET no esta configurado",
      });
    }

    const token = authorization.replace("Bearer ", "").trim();
    const payload = jwt.verify(token, secret) as AuthPayload;

    req.user = {
      id_medico: payload.id_medico,
      nombre_completo: payload.nombre_completo,
    };

    return next();
  } catch {
    return res.status(401).json({
      error: "Token invalido o expirado",
    });
  }
}
