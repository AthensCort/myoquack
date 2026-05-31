-- CreateTable
CREATE TABLE "Doctor" (
    "id_medico" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id_medico")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id_paciente" TEXT NOT NULL,
    "id_medico" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "edad" INTEGER NOT NULL,
    "genero" TEXT NOT NULL,
    "lado_trabajo" TEXT NOT NULL,
    "notas_clinicas" TEXT,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id_paciente")
);

-- CreateTable
CREATE TABLE "SesionEMG" (
    "id_sesion" SERIAL NOT NULL,
    "id_paciente" TEXT NOT NULL,
    "nombre_reporte" TEXT,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "musculo" TEXT NOT NULL,
    "config_threshold_uv" DOUBLE PRECISION NOT NULL,
    "config_gain" DOUBLE PRECISION NOT NULL,
    "config_offset_mv" DOUBLE PRECISION NOT NULL,
    "tiempo_juego_segundos" INTEGER NOT NULL,
    "stat_avg_peak" DOUBLE PRECISION,
    "stat_avg_rms" DOUBLE PRECISION,
    "stat_avg_iemg" DOUBLE PRECISION,
    "stat_avg_duracion" DOUBLE PRECISION,

    CONSTRAINT "SesionEMG_pkey" PRIMARY KEY ("id_sesion")
);

-- CreateTable
CREATE TABLE "EventoContraccion" (
    "id_evento" SERIAL NOT NULL,
    "id_sesion" INTEGER NOT NULL,
    "numero_orden" INTEGER NOT NULL,
    "timestamp_segundos" DOUBLE PRECISION NOT NULL,
    "peak_uv" DOUBLE PRECISION NOT NULL,
    "rms" DOUBLE PRECISION NOT NULL,
    "iemg" DOUBLE PRECISION NOT NULL,
    "duracion_segundos" DOUBLE PRECISION NOT NULL,
    "waveform_data" JSONB NOT NULL,

    CONSTRAINT "EventoContraccion_pkey" PRIMARY KEY ("id_evento")
);

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_id_medico_fkey" FOREIGN KEY ("id_medico") REFERENCES "Doctor"("id_medico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionEMG" ADD CONSTRAINT "SesionEMG_id_paciente_fkey" FOREIGN KEY ("id_paciente") REFERENCES "Paciente"("id_paciente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoContraccion" ADD CONSTRAINT "EventoContraccion_id_sesion_fkey" FOREIGN KEY ("id_sesion") REFERENCES "SesionEMG"("id_sesion") ON DELETE RESTRICT ON UPDATE CASCADE;
