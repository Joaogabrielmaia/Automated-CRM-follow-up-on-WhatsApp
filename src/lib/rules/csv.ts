// Leitura de planilha CSV para importar leads. Aceita o CSV do Excel brasileiro (separador ";", vírgula
// decimal, BOM) e o CSV "internacional" (separador ","). Função pura: não toca em banco.

export const SOURCE_OPTIONS = ["Instagram", "Indicação", "Anúncio", "Site", "Outro"] as const;
export type SourceOption = (typeof SOURCE_OPTIONS)[number];

export const MAX_IMPORT_ROWS = 500;

export interface ParsedLeadRow {
  line: number; // linha no arquivo (cabeçalho = 1), para apontar erro
  name: string;
  phone: string;
  source: SourceOption;
  interest: string;
  estimatedValue: string;
}

export interface ParseResult {
  rows: ParsedLeadRow[];
  errors: { line: number; message: string }[];
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

const norm = (value: string) => stripAccents(value).toLowerCase().replace(/[^a-z0-9]/g, "");

const HEADER_ALIASES: Record<keyof Omit<ParsedLeadRow, "line">, string[]> = {
  name: ["nome", "name", "cliente", "lead"],
  phone: ["telefone", "phone", "celular", "whatsapp", "fone", "contato"],
  source: ["origem", "source", "canal", "fonte"],
  interest: ["interesse", "servico", "interest", "service", "pedido"],
  estimatedValue: ["valor", "valorestimado", "value", "orcamento", "estimatedvalue"],
};

export function parseCsvText(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) && firstLine.includes(";") ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// "1.500,00", "R$ 2800", "2800.50" e "1.500" viram um número em texto (ponto como decimal) ou "".
export function parseMoney(raw: string): string {
  let value = raw.replace(/R\$|\s/g, "");
  if (!value) return "";
  if (value.includes(",")) value = value.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(value)) value = value.replace(/\./g, "");
  return /^\d+(\.\d+)?$/.test(value) ? value : "NaN";
}

export function matchSource(raw: string): SourceOption {
  const key = norm(raw);
  return SOURCE_OPTIONS.find((option) => norm(option) === key) ?? "Outro";
}

export function parseLeadsCsv(text: string): ParseResult {
  const table = parseCsvText(text).filter((cells) => cells.some((c) => c.trim() !== ""));
  if (table.length === 0) return { rows: [], errors: [{ line: 1, message: "O arquivo está vazio." }] };

  const header = table[0].map(norm);
  const column = (field: keyof typeof HEADER_ALIASES) => header.findIndex((h) => HEADER_ALIASES[field].includes(h));
  const index = {
    name: column("name"),
    phone: column("phone"),
    source: column("source"),
    interest: column("interest"),
    estimatedValue: column("estimatedValue"),
  };
  if (index.name < 0 || index.phone < 0) {
    return {
      rows: [],
      errors: [{ line: 1, message: 'A primeira linha precisa ter as colunas "nome" e "telefone".' }],
    };
  }

  const dataRows = table.slice(1);
  if (dataRows.length > MAX_IMPORT_ROWS) {
    return {
      rows: [],
      errors: [{ line: 1, message: `O arquivo tem ${dataRows.length} linhas; o máximo por importação é ${MAX_IMPORT_ROWS}.` }],
    };
  }

  const rows: ParsedLeadRow[] = [];
  const errors: ParseResult["errors"] = [];
  dataRows.forEach((cells, i) => {
    const line = i + 2;
    const get = (idx: number) => (idx >= 0 ? (cells[idx] ?? "").trim() : "");
    const name = get(index.name);
    const phone = get(index.phone);
    const value = parseMoney(get(index.estimatedValue));
    if (name.length < 2) return void errors.push({ line, message: "Nome ausente ou muito curto." });
    if (!phone) return void errors.push({ line, message: "Telefone ausente." });
    if (value === "NaN") return void errors.push({ line, message: "Valor inválido." });
    rows.push({ line, name, phone, source: matchSource(get(index.source)), interest: get(index.interest), estimatedValue: value });
  });
  return { rows, errors };
}
