import { describe, expect, it } from "vitest";
import { MAX_IMPORT_ROWS, matchSource, parseCsvText, parseLeadsCsv, parseMoney } from "@/lib/rules/csv";

describe("leitura de CSV", () => {
  it("lê o CSV do Excel brasileiro: separador ';', BOM e quebra de linha do Windows", () => {
    const text = "﻿nome;telefone\r\nAna;(31) 99999-0101\r\nBruno;31 98888-0202\r\n";
    expect(parseCsvText(text)).toEqual([
      ["nome", "telefone"],
      ["Ana", "(31) 99999-0101"],
      ["Bruno", "31 98888-0202"],
    ]);
  });

  it("lê o CSV internacional com vírgula", () => {
    expect(parseCsvText("nome,telefone\nAna,31999990101")).toEqual([
      ["nome", "telefone"],
      ["Ana", "31999990101"],
    ]);
  });

  it("respeita aspas: separador, aspas duplas e quebra de linha dentro do campo", () => {
    const rows = parseCsvText('nome;interesse\n"Silva; Ana";"Reforma ""completa""\nda cozinha"');
    expect(rows[1]).toEqual(["Silva; Ana", 'Reforma "completa"\nda cozinha']);
  });
});

describe("valor em reais", () => {
  it.each([
    ["12.400,00", "12400.00"],
    ["R$ 2.800,50", "2800.50"],
    ["2800", "2800"],
    ["2800.50", "2800.50"],
    ["1.500", "1500"],
    ["", ""],
  ])("%s -> %s", (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it("devolve NaN para lixo", () => {
    expect(parseMoney("muito caro")).toBe("NaN");
    expect(parseMoney("12,5,3")).toBe("NaN");
  });
});

describe("origem", () => {
  it("reconhece sem depender de caixa ou acento; o resto vira Outro", () => {
    expect(matchSource("indicacao")).toBe("Indicação");
    expect(matchSource("ANÚNCIO")).toBe("Anúncio");
    expect(matchSource("instagram")).toBe("Instagram");
    expect(matchSource("panfleto")).toBe("Outro");
    expect(matchSource("")).toBe("Outro");
  });
});

describe("planilha de leads", () => {
  it("aceita cabeçalhos em português ou inglês, em qualquer ordem, e ignora colunas extras", () => {
    const csv = "Telefone;Nome;Observação;Valor estimado;Serviço\n(31) 99999-0101;Ana;vip;1.000,00;Pintura";
    const { rows, errors } = parseLeadsCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { line: 2, name: "Ana", phone: "(31) 99999-0101", source: "Outro", interest: "Pintura", estimatedValue: "1000.00" },
    ]);
  });

  it("aponta a linha de cada problema e segue com as boas", () => {
    const csv = ["nome;telefone;valor", "Ana;31999990101;", ";31999990102;", "Carla;;", "Davi;31999990104;caro", "Eva;31999990105;50"].join("\n");
    const { rows, errors } = parseLeadsCsv(csv);
    expect(rows.map((r) => r.name)).toEqual(["Ana", "Eva"]);
    expect(errors).toEqual([
      { line: 3, message: "Nome ausente ou muito curto." },
      { line: 4, message: "Telefone ausente." },
      { line: 5, message: "Valor inválido." },
    ]);
  });

  it("ignora linhas totalmente em branco sem contá-las como erro", () => {
    const { rows, errors } = parseLeadsCsv("nome;telefone\n\nAna;31999990101\n;;\n");
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("recusa arquivo sem as colunas obrigatórias", () => {
    const { rows, errors } = parseLeadsCsv("cliente;email\nAna;a@b.com");
    expect(rows).toEqual([]);
    expect(errors).toEqual([{ line: 1, message: 'A primeira linha precisa ter as colunas "nome" e "telefone".' }]);
  });

  it("recusa arquivo vazio e arquivo grande demais", () => {
    expect(parseLeadsCsv("").errors[0].message).toMatch(/vazio/);
    const big = "nome;telefone\n" + Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `Pessoa ${i};3199999${String(i).padStart(4, "0")}`).join("\n");
    expect(parseLeadsCsv(big).errors[0].message).toMatch(/máximo por importação/);
  });
});
