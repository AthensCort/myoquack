import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import pacientesRoutes from "./routes/pacientes.js";
import sesionesRoutes from "./routes/sesiones.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { requireAuth } from "./middleware/auth.js";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/health", (_, res) => {
    res.json({ ok: true });
});
app.use("/auth", authRoutes);
app.use("/pacientes", requireAuth, pacientesRoutes);
app.use("/sesiones", requireAuth, sesionesRoutes);
// Ruta simple de chequeo para confirmar servidor y docs
app.get("/", (_, res) => {
    res.json({ message: "MyoQuack API corriendo", docs: "/api-docs" });
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map