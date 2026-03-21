import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { serializeDoctor } from "../lib/serializers.js";
const router = Router();
function buildToken(doctor) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET no esta configurado");
    }
    return jwt.sign({
        id_medico: doctor.id_medico,
        nombre_completo: doctor.nombre_completo,
    }, secret, { expiresIn: "7d" });
}
router.post("/register", async (req, res) => {
    try {
        const id_medico = String(req.body?.id_medico ?? "").trim();
        const nombre_completo = String(req.body?.nombre_completo ?? "").trim();
        const password = String(req.body?.password ?? "");
        if (!id_medico || !nombre_completo || !password) {
            return res.status(400).json({
                error: "id_medico, nombre_completo y password son obligatorios",
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                error: "La password debe tener al menos 6 caracteres",
            });
        }
        const existingDoctor = await prisma.doctor.findUnique({
            where: { id_medico },
        });
        if (existingDoctor) {
            return res.status(409).json({
                error: "Ya existe un doctor con ese id_medico",
            });
        }
        const password_hash = await bcrypt.hash(password, 10);
        const doctor = await prisma.doctor.create({
            data: {
                id_medico,
                nombre_completo,
                password_hash,
            },
        });
        const token = buildToken(doctor);
        return res.status(201).json({
            token,
            doctor: serializeDoctor(doctor),
        });
    }
    catch (error) {
        console.error("Error en /auth/register:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});
router.post("/login", async (req, res) => {
    try {
        const id_medico = String(req.body?.id_medico ?? "").trim();
        const password = String(req.body?.password ?? "");
        if (!id_medico || !password) {
            return res.status(400).json({
                error: "id_medico y password son obligatorios",
            });
        }
        const doctor = await prisma.doctor.findUnique({
            where: { id_medico },
        });
        if (!doctor) {
            return res.status(401).json({
                error: "Credenciales invalidas",
            });
        }
        const passwordOk = await bcrypt.compare(password, doctor.password_hash);
        if (!passwordOk) {
            return res.status(401).json({
                error: "Credenciales invalidas",
            });
        }
        const token = buildToken(doctor);
        return res.json({
            token,
            doctor: serializeDoctor(doctor),
        });
    }
    catch (error) {
        console.error("Error en /auth/login:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});
export default router;
//# sourceMappingURL=auth.js.map