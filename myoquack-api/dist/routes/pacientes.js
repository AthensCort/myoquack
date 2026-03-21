import { Router } from "express";
import { buildPatientsCsv } from "../lib/csv.js";
import { prisma } from "../lib/prisma.js";
import { serializePatient } from "../lib/serializers.js";
const router = Router();
function buildNextPatientId(ids) {
    const maxValue = ids.reduce((acc, id) => {
        if (!id.startsWith("P-")) {
            return acc;
        }
        const parsedValue = Number.parseInt(id.replace("P-", ""), 10);
        if (Number.isNaN(parsedValue)) {
            return acc;
        }
        return Math.max(acc, parsedValue);
    }, 0);
    return `P-${String(maxValue + 1).padStart(4, "0")}`;
}
router.get("/", async (req, res) => {
    try {
        const id_medico = req.user.id_medico;
        const patients = await prisma.paciente.findMany({
            where: { id_medico },
            orderBy: { fecha_registro: "desc" },
        });
        return res.json(patients.map(serializePatient));
    }
    catch (error) {
        console.error("Error en GET /pacientes:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});
router.get("/export/csv", async (req, res) => {
    try {
        const id_medico = req.user.id_medico;
        const patients = await prisma.paciente.findMany({
            where: { id_medico },
            orderBy: { fecha_registro: "desc" },
            include: {
                sesiones: {
                    select: { fecha_hora: true },
                    orderBy: { fecha_hora: "desc" },
                },
            },
        });
        const csv = buildPatientsCsv(patients.map((patient) => ({
            id_paciente: patient.id_paciente,
            nombre_completo: `${patient.nombre} ${patient.apellidos}`,
            edad: patient.edad,
            genero: patient.genero,
            lado_trabajo: patient.lado_trabajo,
            fecha_registro: patient.fecha_registro.toISOString(),
            session_count: patient.sesiones.length,
            last_session_date: patient.sesiones[0]?.fecha_hora.toISOString() ?? "",
        })));
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        return res.send(csv);
    }
    catch (error) {
        console.error("Error en GET /pacientes/export/csv:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});
router.post("/", async (req, res) => {
    try {
        const id_medico = req.user.id_medico;
        const nombre = String(req.body?.nombre ?? "").trim();
        const apellidos = String(req.body?.apellidos ?? "").trim();
        const edad = Number(req.body?.edad);
        const genero = String(req.body?.genero ?? "").trim();
        const lado_trabajo = String(req.body?.lado_trabajo ?? "").trim();
        const notas_clinicas = String(req.body?.notas_clinicas ?? "").trim();
        if (!nombre || !apellidos || !Number.isInteger(edad) || edad <= 0) {
            return res.status(400).json({
                error: "Datos de paciente invalidos",
            });
        }
        if (!["M", "F", "O"].includes(genero)) {
            return res.status(400).json({
                error: "Genero invalido",
            });
        }
        if (!["Izquierdo", "Derecho", "Ambos"].includes(lado_trabajo)) {
            return res.status(400).json({
                error: "Lado de trabajo invalido",
            });
        }
        const existingIds = await prisma.paciente.findMany({
            select: { id_paciente: true },
        });
        const patient = await prisma.paciente.create({
            data: {
                id_paciente: buildNextPatientId(existingIds.map((item) => item.id_paciente)),
                id_medico,
                nombre,
                apellidos,
                edad,
                genero,
                lado_trabajo,
                notas_clinicas,
            },
        });
        return res.status(201).json(serializePatient(patient));
    }
    catch (error) {
        console.error("Error en POST /pacientes:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        const id_medico = req.user.id_medico;
        const patientId = String(req.params.id);
        const patient = await prisma.paciente.findFirst({
            where: {
                id_paciente: patientId,
                id_medico,
            },
            select: { id_paciente: true },
        });
        if (!patient) {
            return res.status(404).json({
                error: "Paciente no encontrado",
            });
        }
        const sessions = await prisma.sesionEMG.findMany({
            where: { id_paciente: patientId },
            select: { id_sesion: true },
        });
        const sessionIds = sessions.map((session) => session.id_sesion);
        await prisma.$transaction(async (tx) => {
            if (sessionIds.length > 0) {
                await tx.eventoContraccion.deleteMany({
                    where: {
                        id_sesion: {
                            in: sessionIds,
                        },
                    },
                });
            }
            await tx.sesionEMG.deleteMany({
                where: { id_paciente: patientId },
            });
            await tx.paciente.delete({
                where: { id_paciente: patientId },
            });
        });
        return res.status(204).send();
    }
    catch (error) {
        console.error("Error en DELETE /pacientes/:id:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});
export default router;
//# sourceMappingURL=pacientes.js.map