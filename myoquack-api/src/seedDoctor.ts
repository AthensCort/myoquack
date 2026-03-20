import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma.js";

async function main() {
  const plainPassword = "123456";
  const password_hash = await bcrypt.hash(plainPassword, 10);

  const doctor = await prisma.doctor.upsert({
    where: { id_medico: "DOC001" },
    update: {},
    create: {
      id_medico: "DOC001",
      nombre_completo: "Doctor Prueba",
      password_hash,
    },
  });

  console.log("Doctor creado:", doctor);
  console.log("Password de prueba:", plainPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });