import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { seedPilotData } from "./pilot-data";

config({ path: ".env" });

// Dados iniciais de um piloto real. Depois dele, crie as contas com `npm run user:create`.
const prisma = new PrismaClient();

seedPilotData(prisma)
  .then(({ created }) => {
    console.log(
      created
        ? "Piloto preparado: etapas, configuração, modelos e regras (todas desligadas). Agora crie as contas com `npm run user:create`."
        : "O banco já tem etapas; não alterei nada.",
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
