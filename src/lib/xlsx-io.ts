import type { WorkBook } from "xlsx";

import { MES_ABBR } from "./constants";
import { mesNome, mesNum, norm, parseBool, parseNum } from "./format";
import type { OrcPessoal, OrcRecord, PlanoRow, TSRow } from "./types";

type SheetRow = Record<string, unknown>;

/** SheetJS é pesado — carregado só quando o usuário importa/exporta. */
async function xlsx() {
  return import("xlsx");
}

/** Lê o arquivo escolhido pelo usuário e devolve a pasta de trabalho. */
export async function readWorkbook(file: File): Promise<WorkBook> {
  const XLSX = await xlsx();
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: "array" });
}

async function sheetJson(wb: WorkBook, names: string[]): Promise<SheetRow[]> {
  const XLSX = await xlsx();
  for (const n of names) {
    if (wb.Sheets[n]) return XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: null });
  }
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
}

/** Busca colunas por nome ignorando acentos, caixa e espaços. */
function rowGetter(row: SheetRow) {
  const m: Record<string, unknown> = {};
  Object.keys(row).forEach((k) => (m[norm(k)] = row[k]));
  return (...keys: string[]): unknown => {
    for (const k of keys) {
      const v = m[norm(k)];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return null;
  };
}

// ── Importação ─────────────────────────────────────────────────────────

export async function parseTimesheet(wb: WorkBook): Promise<TSRow[]> {
  const json = await sheetJson(wb, ["Timesheet", "TS", "Dados"]);
  const out: TSRow[] = [];
  json.forEach((row) => {
    const g = rowGetter(row);
    const c = g("colaborador", "c", "nome");
    if (!c) return;
    const m = String(g("mes", "m") || "");
    const mo = mesNum(g("mesnum", "mo", "mes num", "mês num") || m);
    out.push({
      c: String(c).trim(),
      cl: String(g("cliente", "cl") || "").trim(),
      cat: String(g("categoria", "cat") || "").trim(),
      m: m.trim() || mesNome(mo),
      mo,
      a: parseInt(String(parseNum(g("ano", "a")))) || 0,
      h: parseNum(g("horas", "h")),
      b: parseBool(g("billable", "faturavel", "faturável", "b")),
      d: String(g("data", "d") || "").trim(),
    });
  });
  return out;
}

export async function parsePlano(wb: WorkBook): Promise<PlanoRow[]> {
  const json = await sheetJson(wb, ["Plano", "Plano de Ação", "Plano de Acao"]);
  const out: PlanoRow[] = [];
  json.forEach((row) => {
    const g = rowGetter(row);
    const at = g("atividade", "acao", "ação");
    if (!at) return;
    out.push({
      status: String(g("status") || "").trim(),
      atividade: String(at).trim(),
      responsavel: String(g("responsavel", "responsável") || "—").trim(),
      prazo: String(g("prazo") || "").trim(),
      objetivo: String(g("objetivo") || "").trim(),
      prioridade: String(g("prioridade") || "Normal").trim(),
      dias_atraso: parseInt(String(parseNum(g("dias atraso", "dias_atraso")))) || 0,
      farol: String(g("farol") || "").trim(),
    });
  });
  return out;
}

export async function parseOrcamento(
  wb: WorkBook,
): Promise<{ records: OrcRecord[]; pessoal: OrcPessoal[] }> {
  const XLSX = await xlsx();
  const recSheet = wb.Sheets["Orçamento"] || wb.Sheets["Orcamento"] || wb.Sheets["Custeio"];
  const pesSheet = wb.Sheets["Pessoal"] || wb.Sheets["Quadro Pessoal"] || wb.Sheets["Folha"];
  const useRec = recSheet || (!pesSheet ? wb.Sheets[wb.SheetNames[0]] : null);

  const records: OrcRecord[] = [];
  if (useRec) {
    const json: SheetRow[] = XLSX.utils.sheet_to_json(useRec, { defval: null });
    json.forEach((row) => {
      const g = rowGetter(row);
      const conta = g("conta");
      const cod = g("codigo", "código");
      if (!conta && !cod) return;
      const exec: Record<string, number> = {};
      let et = 0;
      MES_ABBR.forEach((mm) => {
        const v = parseNum(g(mm));
        exec[mm] = v;
        et += v;
      });
      const bud = parseNum(g("budget", "bud"));
      records.push({
        codigo: String(cod || "").trim(),
        conta: String(conta || "").trim(),
        desc: String(g("descrição", "desc", "descricao") || "").trim(),
        proj: String(g("projeto", "proj") || "").trim(),
        obs: String(g("obs", "observação") || "").trim(),
        bud_inicial: parseNum(g("budget inicial", "bud_inicial")),
        bud,
        exec_total: et,
        variacao: bud - et,
        pct: bud ? et / bud : 0,
        grupo: String(g("grupo") || "").trim(),
        exec,
      });
    });
  }

  const pessoal: OrcPessoal[] = [];
  if (pesSheet) {
    const json: SheetRow[] = XLSX.utils.sheet_to_json(pesSheet, { defval: null });
    json.forEach((row) => {
      const g = rowGetter(row);
      const nome = g("nome");
      if (!nome) return;
      pessoal.push({
        tipo: String(g("tipo") || "").trim(),
        status: String(g("status") || "").trim(),
        grupo: String(g("grupo") || "").trim(),
        nome: String(nome).trim(),
        depto: String(g("depto", "departamento") || "").trim(),
        admissao: String(g("admissao", "admissão") || "—").trim(),
        regime: String(g("regime") || "").trim(),
        salario: parseNum(g("salario", "salário")),
        obs: String(g("obs", "observação") || "").trim(),
      });
    });
  }

  return { records, pessoal };
}

// ── Exportação ─────────────────────────────────────────────────────────

type Sheet = { name: string; rows: Record<string, unknown>[]; cols?: { wch: number }[] };

async function writeWorkbook(filename: string, sheets: Sheet[]) {
  const XLSX = await xlsx();
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    if (s.cols) ws["!cols"] = s.cols;
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  });
  XLSX.writeFile(wb, filename);
}

export function exportTimesheet(rows: TSRow[]) {
  return writeWorkbook("modelo_timesheet_itp.xlsx", [
    {
      name: "Timesheet",
      rows: rows.map((r) => ({
        Colaborador: r.c,
        Cliente: r.cl,
        Categoria: r.cat,
        "Mês": r.m,
        MesNum: r.mo,
        Ano: r.a,
        Horas: r.h,
        Billable: r.b ? "Sim" : "Não",
        Data: r.d,
      })),
      cols: [
        { wch: 20 }, { wch: 16 }, { wch: 24 }, { wch: 12 }, { wch: 8 },
        { wch: 7 }, { wch: 8 }, { wch: 10 }, { wch: 12 },
      ],
    },
  ]);
}

export function exportPlano(rows: PlanoRow[]) {
  return writeWorkbook("modelo_plano_acao_itp.xlsx", [
    {
      name: "Plano",
      rows: rows.map((r) => ({
        Status: r.status,
        Atividade: r.atividade,
        "Responsável": r.responsavel,
        Prazo: r.prazo,
        Objetivo: r.objetivo,
        Prioridade: r.prioridade,
        "Dias Atraso": r.dias_atraso,
        Farol: r.farol,
      })),
      cols: [
        { wch: 14 }, { wch: 42 }, { wch: 16 }, { wch: 12 },
        { wch: 42 }, { wch: 12 }, { wch: 11 }, { wch: 14 },
      ],
    },
  ]);
}

export function exportOrcamento(records: OrcRecord[], pessoal: OrcPessoal[]) {
  return writeWorkbook("modelo_orcamento_itp.xlsx", [
    {
      name: "Orçamento",
      rows: records.map((r) => {
        const o: Record<string, unknown> = {
          "Código": r.codigo,
          Conta: r.conta,
          "Descrição": r.desc,
          Projeto: r.proj,
          Obs: r.obs,
          Grupo: r.grupo,
          "Budget Inicial": r.bud_inicial,
          Budget: r.bud,
        };
        MES_ABBR.forEach((mm) => (o[mm] = (r.exec && r.exec[mm]) || 0));
        return o;
      }),
      cols: [
        { wch: 20 }, { wch: 26 }, { wch: 30 }, { wch: 12 },
        { wch: 14 }, { wch: 22 }, { wch: 13 }, { wch: 12 },
      ],
    },
    {
      name: "Pessoal",
      rows: pessoal.map((r) => ({
        Tipo: r.tipo,
        Status: r.status,
        Grupo: r.grupo,
        Nome: r.nome,
        Depto: r.depto,
        "Admissão": r.admissao,
        Regime: r.regime,
        "Salário": r.salario,
        Obs: r.obs,
      })),
      cols: [
        { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 26 }, { wch: 14 },
        { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 24 },
      ],
    },
  ]);
}
