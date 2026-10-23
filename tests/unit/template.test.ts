import { describe, expect, it } from "vitest";
import { extractVariables, renderTemplate, templateParameters } from "@/lib/rules/template";

const lead = { nome: "Renata Marques", servico: "reforma do banheiro", valor: 12400 };

describe("modelos de mensagem (RN-14)", () => {
  it("troca as variáveis e usa só o primeiro nome", () => {
    const r = renderTemplate("Oi, {nome}! Sobre a {servico}.", lead);
    expect(r).toEqual({ ok: true, text: "Oi, Renata! Sobre a reforma do banheiro." });
  });

  it("formata o valor em reais", () => {
    const r = renderTemplate("Orçamento de {valor}.", lead);
    expect(r.ok && r.text.replace(/\s/g, " ")).toBe("Orçamento de R$ 12.400,00.");
  });

  it("não renderiza se faltar valor, em vez de mandar chave solta", () => {
    const r = renderTemplate("Orçamento de {valor} para {nome}", { ...lead, valor: null });
    expect(r).toEqual({ ok: false, missing: ["valor"] });
  });

  it("trata serviço vazio como faltando", () => {
    expect(renderTemplate("{servico}", { ...lead, servico: "  " })).toEqual({ ok: false, missing: ["servico"] });
  });

  it("recusa variável desconhecida", () => {
    expect(renderTemplate("Oi {apelido}", lead)).toEqual({ ok: false, missing: ["apelido"] });
  });

  it("aceita texto sem variáveis", () => {
    expect(renderTemplate("Bom dia!", lead)).toEqual({ ok: true, text: "Bom dia!" });
  });

  it("lista as variáveis usadas", () => {
    expect(extractVariables("{nome}, {valor} e {nome}")).toEqual(["nome", "valor", "nome"]);
  });
});

describe("parâmetros do modelo aprovado na Meta", () => {
  it("devolve os valores na ordem em que as variáveis aparecem, repetindo as repetidas", () => {
    const r = templateParameters("{servico} para {nome}. Oi, {nome}! Valor: {valor}", lead);
    expect(r?.map((v) => v.replace(/\s/g, " "))).toEqual(["reforma do banheiro", "Renata", "Renata", "R$ 12.400,00"]);
  });

  it("devolve lista vazia quando o texto não tem variável", () => {
    expect(templateParameters("Olá!", lead)).toEqual([]);
  });

  it("devolve null se faltar dado ou se a variável for desconhecida", () => {
    expect(templateParameters("Valor {valor}", { ...lead, valor: null })).toBeNull();
    expect(templateParameters("Oi {pedido}", lead)).toBeNull();
  });
});
