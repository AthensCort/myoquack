import jwt from "jsonwebtoken";
export function requireAuth(req, res, next) {
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
        const payload = jwt.verify(token, secret);
        req.user = {
            id_medico: payload.id_medico,
            nombre_completo: payload.nombre_completo,
        };
        return next();
    }
    catch {
        return res.status(401).json({
            error: "Token invalido o expirado",
        });
    }
}
//# sourceMappingURL=auth.js.map