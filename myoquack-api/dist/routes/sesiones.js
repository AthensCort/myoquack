import { Router } from "express";
import { buildEventsCsv } from "../lib/csv.js";
import { prisma } from "../lib/prisma.js";
import { buildSessionExport, serializeEvent, serializePatient, serializeSession, } from "../lib/serializers.js";
const router = Router();
function parseSessionId(value) {
    const sessionId = Number.parseInt(value, 10);
    return Number.isNaN(sessionId) ? null : sessionId;
}
function sortEventsByOrder(events) {
    return [...events].sort((a, b) => a.numero_orden - b.numero_orden);
}
router.get("/reports", async (req, res) => {
    try {
        const id_medico = req.user.id_medico;
        const sessions = await prisma.sesionEMG.findMany({
            where: {
                paciente: {
                    id_medico,
                },
            },
            orderBy: { fecha_hora: "desc" },
            include: {
                paciente: true,
                _count: {
                    select: {
                        eventos: true,
                    },
                },
            },
        });
        return res.json(sessions.map((session) => ({
            session: serializeSession(session, session._count.eventos),
            patient: serializePatient(session.paciente),
        })));
    }
    catch (error) {
        console.error("Error en GET /sesiones/reports:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});
router.get("/:id/events/csv", async (req, res) => {
    try {
        const id_medico = req.user.id_medico;
        const sessionId = parseSessionId(req.params.id);
        if (!sessionId) {
            return res.status(400).json({
                error: "ID de sesion invalido",
            });
        }
        const session = await prisma.sesionEMG.findFirst({
            where: {
                id_sesion: sessionId,
                paciente: {
                    id_medico,
                },
            },
            include: {
                eventos: true,
            },
        });
        if (!session) {
            return res.status(404).json({
                error: "Sesion no encontrada",
            });
        }
        const csv = buildEventsCsv(sortEventsByOrder(session.eventos).map((event) => serializeEvent(event)));
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        return res.send(csv);
    }
    catch (error) {
        console.error("Error en GET /sesiones/:id/events/csv:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});
router.get("/:id/export/json", async (req, res) => {
    try {
        const id_medico = req.user.id_medico;
        const sessionId = parseSessionId(req.params.id);
        if (!sessionId) {
            return res.status(400).json({
                error: "ID de sesion invalido",
            });
        }
        const session = await prisma.sesionEMG.findFirst({
            where: {
                id_sesion: sessionId,
                paciente: {
                    id_medico,
                },
            },
            include: {
                paciente: true,
                eventos: true,
            },
        });
        if (!session) {
            return res.status(404).json({
                error: "Sesion no encontrada",
            });
        }
        return res.json(buildSessionExport(session, session.paciente, sortEventsByOrder(session.eventos)));
    }
    catch (error) {
        console.error("Error en GET /sesiones/:id/export/json:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});
router.get("/", async (req, res) => {
    try {
        const id_medico = req.user.id_medico;
        const patientId = String(req.query.patientId ?? "").trim();
        if (!patientId) {
            return res.status(400).json({
                error: "patientId es requerido",
            });
        }
        const sessions = await prisma.sesionEMG.findMany({
            where: {
                id_paciente: patientId,
                paciente: {
                    id_medico,
                },
            },
            orderBy: { fecha_hora: "desc" },
            include: {
                _count: {
                    select: {
                        eventos: true,
                    },
                },
            },
        });
        return res.json(sessions.map((session) => serializeSession(session, session._count.eventos)));
    }
    catch (error) {
        console.error("Error en GET /sesiones:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});
router.post("/", async (req, res) => {
    try {
        const id_medico = req.user.id_medico;
        const report = req.body?.report;
        const events = Array.isArray(req.body?.events) ? req.body.events : [];
        const reportName = String(req.body?.reportName ?? report?.nombre_reporte ?? "").trim();
        if (!report || !report.id_paciente || !reportName || events.length === 0) {
            return res.status(400).json({
                error: "Datos de sesion invalidos",
            });
        }
        const patient = await prisma.paciente.findFirst({
            where: {
                id_paciente: String(report.id_paciente),
                id_medico,
            },
        });
        if (!patient) {
            return res.status(404).json({
                error: "Paciente no encontrado",
            });
        }
        const createdSession = await prisma.sesionEMG.create({
            data: {
                id_paciente: patient.id_paciente,
                nombre_reporte: reportName,
                fecha_hora: report.fecha_hora ? new Date(report.fecha_hora) : new Date(),
                musculo: String(report.musculo ?? ""),
                config_threshold_uv: Number(report.config_threshold_uv ?? 0),
                config_gain: Number(report.config_gain ?? 0),
                config_offset_mv: Number(report.config_offset_mv ?? 0),
                tiempo_juego_segundos: Number(report.tiempo_juego_segundos ?? 0),
                stat_avg_peak: Number(report.stat_avg_peak ?? 0),
                stat_avg_rms: Number(report.stat_avg_rms ?? 0),
                stat_avg_iemg: Number(report.stat_avg_iemg ?? 0),
                stat_avg_duracion: Number(report.stat_avg_duracion ?? 0),
                eventos: {
                    create: events.map((event, index) => ({
                        numero_orden: Number(event.numero_orden ?? index + 1),
                        timestamp_segundos: Number(event.timestamp_segundos ?? 0),
                        peak_uv: Number(event.peak_uv ?? 0),
                        rms: Number(event.rms ?? 0),
                        iemg: Number(event.iemg ?? 0),
                        duracion_segundos: Number(event.duracion_segundos ?? 0),
                        waveform_data: Array.isArray(event.waveform_data)
                            ? event.waveform_data
                            : [],
                    })),
                },
            },
            include: {
                eventos: true,
                _count: {
                    select: {
                        eventos: true,
                    },
                },
            },
        });
        return res.status(201).json({
            session: serializeSession(createdSession, createdSession._count.eventos),
            events: sortEventsByOrder(createdSession.eventos).map(serializeEvent),
        });
    }
    catch (error) {
        console.error("Error en POST /sesiones:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});
router.patch("/:id", async (req, res) => {
    try {
        const id_medico = req.user.id_medico;
        const sessionId = parseSessionId(req.params.id);
        const reportName = String(req.body?.reportName ?? "").trim();
        if (!sessionId) {
            return res.status(400).json({
                error: "ID de sesion invalido",
            });
        }
        if (!reportName) {
            return res.status(400).json({
                error: "El nombre del reporte es obligatorio",
            });
        }
        const existingSession = await prisma.sesionEMG.findFirst({
            where: {
                id_sesion: sessionId,
                paciente: {
                    id_medico,
                },
            },
            select: { id_sesion: true },
        });
        if (!existingSession) {
            return res.status(404).json({
                error: "Sesion no encontrada",
            });
        }
        const updatedSession = await prisma.sesionEMG.update({
            where: { id_sesion: sessionId },
            data: {
                nombre_reporte: reportName,
            },
            include: {
                eventos: true,
                _count: {
                    select: {
                        eventos: true,
                    },
                },
            },
        });
        return res.json({
            session: serializeSession(updatedSession, updatedSession._count.eventos),
            events: sortEventsByOrder(updatedSession.eventos).map(serializeEvent),
        });
    }
    catch (error) {
        console.error("Error en PATCH /sesiones/:id:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        const id_medico = req.user.id_medico;
        const sessionId = parseSessionId(req.params.id);
        if (!sessionId) {
            return res.status(400).json({
                error: "ID de sesion invalido",
            });
        }
        const session = await prisma.sesionEMG.findFirst({
            where: {
                id_sesion: sessionId,
                paciente: {
                    id_medico,
                },
            },
            select: { id_sesion: true },
        });
        if (!session) {
            return res.status(404).json({
                error: "Sesion no encontrada",
            });
        }
        await prisma.$transaction(async (tx) => {
            await tx.eventoContraccion.deleteMany({
                where: { id_sesion: sessionId },
            });
            await tx.sesionEMG.delete({
                where: { id_sesion: sessionId },
            });
        });
        return res.status(204).send();
    }
    catch (error) {
        console.error("Error en DELETE /sesiones/:id:", error);
        return res.status(500).json({
            error: "Error interno del servidor",
        });
    }
});
export default router;
//# sourceMappingURL=sesiones.js.map