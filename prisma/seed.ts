import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { DEFAULT_BUSINESS_HOURS } from "../src/lib/rules/business-hours";

config({ path: ".env" });

const prisma = new PrismaClient();

// Senha pública de propósito: só existe na versão de demonstração (docs/03-arquitetura/04).
const DEMO_PASSWORD = "Demo@2026";

const HOUR = 60 * 60 * 1000;
const ago = (now: Date, hours: number) => new Date(now.getTime() - hours * HOUR);

async function main() {
  const now = new Date();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: "marcos@casanova.example" },
    update: {},
    create: { name: "Marcos", email: "marcos@casanova.example", passwordHash, role: "ADMIN" },
  });
  const attendant = await prisma.user.upsert({
    where: { email: "camila@casanova.example" },
    update: {},
    create: { name: "Camila", email: "camila@casanova.example", passwordHash, role: "ATTENDANT" },
  });

  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, businessHours: DEFAULT_BUSINESS_HOURS, maxMessagesPerCycle: 3, minGapMinutes: 720 },
  });

  // Só cria o restante num banco vazio, para o seed poder rodar de novo sem duplicar nada.
  if ((await prisma.stage.count()) > 0) {
    console.log("Banco já tem dados: mantive usuários e configuração, nada mais foi criado.");
    return;
  }

  const stageDefs = [
    { name: "Novo", kind: "OPEN" },
    { name: "Contatado", kind: "OPEN" },
    { name: "Orçamento enviado", kind: "QUOTE" },
    { name: "Negociação", kind: "OPEN" },
    { name: "Ganho", kind: "WON" },
    { name: "Perdido", kind: "LOST" },
  ] as const;
  const stages: Record<string, string> = {};
  for (const [position, def] of stageDefs.entries()) {
    const stage = await prisma.stage.create({ data: { ...def, position } });
    stages[def.name] = stage.id;
  }

  const welcome = await prisma.messageTemplate.create({
    data: {
      name: "Boas-vindas",
      body: "Oi, {nome}! Aqui é da Casa Nova Reformas. Recebemos seu contato sobre {servico}. Como posso ajudar?",
    },
  });
  const followUp1 = await prisma.messageTemplate.create({
    data: { name: "Follow-up 1", body: "Oi, {nome}! Conseguiu ver minha mensagem sobre {servico}? Fico à disposição." },
  });
  const followUp2 = await prisma.messageTemplate.create({
    data: { name: "Follow-up 2", body: "{nome}, ainda posso te ajudar com {servico}? Se não for o momento, sem problema." },
  });
  const quoteReminder = await prisma.messageTemplate.create({
    data: {
      name: "Orçamento sem retorno",
      body: "Oi, {nome}! Passando para saber o que achou do orçamento de {valor} para {servico}.",
    },
  });

  // Regras ligadas agora: pela RN-17 elas só agem sobre leads criados depois deste instante.
  const activeNow = { active: true, activatedAt: now };
  await prisma.automationRule.createMany({
    data: [
      { name: "Boas-vindas", trigger: "NEW_LEAD", afterMinutes: 5, action: "SEND_MESSAGE", templateId: welcome.id, ...activeNow },
      { name: "Follow-up 1 (24h)", trigger: "NO_REPLY", afterMinutes: 24 * 60, action: "SEND_MESSAGE", templateId: followUp1.id, ...activeNow },
      { name: "Follow-up 2 (72h)", trigger: "NO_REPLY", afterMinutes: 72 * 60, action: "SEND_MESSAGE", templateId: followUp2.id, ...activeNow },
      {
        name: "Perdido sem resposta (120h)",
        trigger: "NO_REPLY",
        afterMinutes: 120 * 60,
        action: "MOVE_TO_LOST",
        lostReason: "Sem resposta após follow-ups",
        ...activeNow,
      },
      {
        name: "Orçamento sem retorno (48h)",
        trigger: "QUOTE_NO_RETURN",
        afterMinutes: 48 * 60,
        action: "SEND_MESSAGE",
        templateId: quoteReminder.id,
        ...activeNow,
      },
      {
        name: "Lembrete de orçamento para a atendente",
        trigger: "QUOTE_NO_RETURN",
        afterMinutes: 48 * 60,
        action: "CREATE_TASK",
        taskTitle: "Cobrar retorno do orçamento",
        ...activeNow,
      },
    ],
  });

  // Leads de exemplo espalhados pelo funil. Telefones fictícios; os finais 0000/0001/9999 simulam falhas (ADR-002).
  const leads = [
    { name: "Ana Paula Souza", phone: "+5511999990101", source: "Instagram", interest: "Reforma de banheiro", stage: "Novo", ageHours: 1 },
    { name: "Bruno Lima", phone: "+5511999990102", source: "Indicação", interest: "Troca de piso da sala", stage: "Contatado", ageHours: 30, inbound: 4 },
    { name: "Carla Mendes", phone: "+5511999990103", source: "Anúncio", interest: "Pintura de apartamento", stage: "Orçamento enviado", ageHours: 60, value: "2800.00", quoteAgeHours: 50 },
    { name: "Diego Rocha", phone: "+5511999990104", source: "Site", interest: "Reforma elétrica", stage: "Ganho", ageHours: 200, value: "1500.00" },
    { name: "Elisa Prado", phone: "+5511999990105", source: "Instagram", interest: "Troca de telhado", stage: "Perdido", ageHours: 300, lost: "Sem resposta após follow-ups" },
    { name: "Fábio Teixeira", phone: "+5511999990106", source: "Outro", interest: null, stage: "Novo", ageHours: 3 },
    { name: "Gabriela Nunes", phone: "+5511999990000", source: "Site", interest: "Reforma de cozinha", stage: "Novo", ageHours: 2 },
  ];

  for (const [i, l] of leads.entries()) {
    const created = ago(now, l.ageHours);
    const stageChangedAt = l.quoteAgeHours ? ago(now, l.quoteAgeHours) : created;
    const lead = await prisma.lead.create({
      data: {
        name: l.name,
        phone: l.phone,
        source: l.source,
        interest: l.interest,
        estimatedValue: l.value ?? null,
        stageId: stages[l.stage],
        ownerId: i % 2 === 0 ? attendant.id : admin.id,
        lostReason: l.lost ?? null,
        lastInboundAt: l.inbound ? ago(now, l.inbound) : null,
        stageChangedAt,
        createdAt: created,
      },
    });
    await prisma.stageHistory.create({ data: { leadId: lead.id, toStageId: stages[l.stage], at: stageChangedAt } });
    await prisma.interaction.create({
      data: { leadId: lead.id, type: "SYSTEM", body: "Lead criado pelo seed de demonstração.", createdAt: created },
    });
  }

  await prisma.task.create({
    data: {
      title: "Ligar para o Fábio e confirmar o serviço de interesse",
      dueAt: new Date(now.getTime() + 2 * HOUR),
      assigneeId: attendant.id,
    },
  });

  console.log(`Seed concluído. Contas: marcos@casanova.example e camila@casanova.example (senha ${DEMO_PASSWORD}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
