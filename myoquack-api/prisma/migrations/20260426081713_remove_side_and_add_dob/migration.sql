-- Add fecha_nacimiento as nullable first so existing patients can be migrated.
ALTER TABLE "Paciente" ADD COLUMN "fecha_nacimiento" TIMESTAMP(3);

-- Approximate birth date from the previous age field for existing rows.
UPDATE "Paciente"
SET "fecha_nacimiento" = (CURRENT_DATE - ("edad" * INTERVAL '1 year'))::timestamp
WHERE "fecha_nacimiento" IS NULL;

ALTER TABLE "Paciente" ALTER COLUMN "fecha_nacimiento" SET NOT NULL;

ALTER TABLE "Paciente"
DROP COLUMN "edad",
DROP COLUMN "lado_trabajo";
