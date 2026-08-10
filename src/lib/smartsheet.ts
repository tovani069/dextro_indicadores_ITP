import { ehFaturavel } from "./timesheet";
import type { CapacidadeRow, TSRow } from "./types";

/**
 * Leitura da área de trabalho "DEXTRO | IT PROTECT TIME SHEET" no Smartsheet.
 * Só roda no servidor — o token nunca chega ao navegador.
 */

const API = "https://api.smartsheet.com/2.0";

/** IDs da área de trabalho (podem ser sobrescritos por variável de ambiente). */
export const FONTES = {
  /** Relatório "Base todos os lançamentos" — consolida as planilhas de cada colaborador. */
  lancamentos: process.env.SMARTSHEET_REPORT_LANCAMENTOS ?? "1507227873529732",
  /** Planilha "Cadastro de Colaboradores" — nome da planilha → nome, setor e status. */
  colaboradores: process.env.SMARTSHEET_SHEET_COLABORADORES ?? "1249337635983236",
  /** Planilha "Horas disponíveis" — capacidade por colaborador e mês. */
  capacidade: process.env.SMARTSHEET_SHEET_CAPACIDADE ?? "8194665899577220",
};

/** Cliente interno: horas nele não são faturáveis. */
const CLIENTE_INTERNO = /\bITP\b/i;

type Celula = { value?: unknown; displayValue?: string; virtualColumnId?: number; columnId?: number };
type Linha = { cells: Celula[] };
type Coluna = { title: string; id?: number; virtualId?: number };

export type ColaboradorInfo = { c: string; time: string; st: string };

export type PayloadTimesheet = {
  timesheet: Omit<TSRow, "m">[];
  capacidade: CapacidadeRow[];
  colaboradores: ColaboradorInfo[];
  atualizadoEm: string;
};

async function smartsheet<T>(caminho: string, revalidate: number): Promise<T> {
  const token = process.env.SMARTSHEET_TOKEN;
  if (!token) throw new Error("SMARTSHEET_TOKEN não configurado");
  const resp = await fetch(API + caminho, {
    headers: { Authorization: "Bearer " + token },
    next: { revalidate },
  });
  if (!resp.ok) {
    throw new Error(`Smartsheet ${caminho} respondeu ${resp.status}: ${await resp.text()}`);
  }
  return resp.json() as Promise<T>;
}

/** Índice título da coluna → posição, para ler as células por nome. */
function indicePorTitulo(colunas: Coluna[]) {
  const idx: Record<string, number> = {};
  colunas.forEach((c, i) => (idx[c.title] = i));
  return idx;
}

const texto = (c?: Celula) =>
  String(c?.value ?? c?.displayValue ?? "").trim();

const numero = (c?: Celula) => {
  const v = c?.value ?? c?.displayValue;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

/** "Time Sheet Paulo Medeiros 2024" → "Paulo Medeiros" (usado se não houver cadastro). */
function nomeDaPlanilha(titulo: string) {
  return titulo
    .replace(/^time\s*sheet\s*/i, "")
    .replace(/\s*\(.*\)\s*$/, "")
    .replace(/\s*(19|20)\d{2}\s*$/, "")
    .trim();
}

async function lerColaboradores(revalidate: number) {
  const sheet = await smartsheet<{ columns: Coluna[]; rows: Linha[] }>(
    `/sheets/${FONTES.colaboradores}`,
    revalidate,
  );
  const idx = indicePorTitulo(sheet.columns);
  const porPlanilha = new Map<string, ColaboradorInfo>();
  sheet.rows.forEach((r) => {
    const planilha = texto(r.cells[idx["Nome da Planilha"]]);
    const nome = texto(r.cells[idx["Nome"]]);
    if (!planilha || !nome) return;
    porPlanilha.set(planilha, {
      c: nome,
      time: texto(r.cells[idx["Setor"]]),
      st: texto(r.cells[idx["Status"]]),
    });
  });
  return porPlanilha;
}

async function lerCapacidade(revalidate: number): Promise<CapacidadeRow[]> {
  const sheet = await smartsheet<{ columns: Coluna[]; rows: Linha[] }>(
    `/sheets/${FONTES.capacidade}`,
    revalidate,
  );
  const idx = indicePorTitulo(sheet.columns);
  const out: CapacidadeRow[] = [];
  sheet.rows.forEach((r) => {
    const c = texto(r.cells[idx["Nome"]]);
    const data = texto(r.cells[idx["Data"]]);
    const horas = numero(r.cells[idx["Horas Disponiveis"]]);
    if (!c || !data || !horas) return;
    const [ano, mes] = data.split("-").map(Number);
    if (!ano || !mes) return;
    out.push({ c, a: ano, mo: mes, horas });
  });
  return out;
}

/** O relatório é grande (dezenas de milhares de linhas): lido em páginas. */
async function lerLancamentos(
  porPlanilha: Map<string, ColaboradorInfo>,
  revalidate: number,
): Promise<Omit<TSRow, "m">[]> {
  const TAMANHO = 10000;
  const out: Omit<TSRow, "m">[] = [];
  let pagina = 1;
  let totalPaginas = 1;

  do {
    const rel = await smartsheet<{
      columns: Coluna[];
      rows: Linha[];
      totalRowCount: number;
    }>(`/reports/${FONTES.lancamentos}?pageSize=${TAMANHO}&page=${pagina}`, revalidate);

    const idx = indicePorTitulo(rel.columns);
    totalPaginas = Math.max(1, Math.ceil((rel.totalRowCount || 0) / TAMANHO));

    rel.rows.forEach((r) => {
      const data = texto(r.cells[idx["Data"]]);
      const horas = numero(r.cells[idx["Duração (Horas)"]]);
      if (!data || !horas) return;

      const planilha = texto(r.cells[idx["Nome da planilha"]]);
      const info = porPlanilha.get(planilha);
      const cliente = texto(r.cells[idx["Cliente"]]);
      const categoria = texto(r.cells[idx["Categoria"]]);
      const [ano, mes] = data.split("-").map(Number);
      if (!ano || !mes) return;

      out.push({
        c: info?.c || nomeDaPlanilha(planilha),
        cl: cliente,
        cat: categoria,
        mo: mes,
        a: ano,
        h: horas,
        b: ehFaturavel(categoria),
        d: data,
        ...(info?.time ? { time: info.time } : {}),
        ...(info?.st ? { st: info.st } : {}),
      });
    });

    pagina++;
  } while (pagina <= totalPaginas);

  return out;
}

/** Lê as três fontes e devolve tudo já no formato do dashboard. */
export async function carregarTimesheet(revalidate = 1800): Promise<PayloadTimesheet> {
  const porPlanilha = await lerColaboradores(revalidate);
  const [timesheet, capacidade] = await Promise.all([
    lerLancamentos(porPlanilha, revalidate),
    lerCapacidade(revalidate),
  ]);

  // Um colaborador pode ter uma planilha por ano; consolidamos por nome.
  const colaboradores = new Map<string, ColaboradorInfo>();
  porPlanilha.forEach((info) => colaboradores.set(info.c, info));

  return {
    timesheet,
    capacidade,
    colaboradores: [...colaboradores.values()],
    atualizadoEm: new Date().toISOString(),
  };
}
