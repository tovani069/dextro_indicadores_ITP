import { MESES } from "./constants";

/** Normaliza texto para comparação: sem acento, minúsculo, sem espaços nas pontas. */
export function norm(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Converte valores de planilha (R$ 1.234,56 / 1234.56 / "") em número. */
export function parseNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  let s = String(v).trim().replace(/[R$\s%]/g, "");
  if (s === "" || s === "-") return 0;
  if (s.indexOf(",") > -1) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Interpreta "Sim", "X", "true"… como verdadeiro. */
export function parseBool(v: unknown): boolean {
  return ["sim", "true", "1", "x", "faturavel", "billable", "verdadeiro", "y", "yes"].includes(
    norm(v),
  );
}

/** Nome ou número do mês → número (1-12). */
export function mesNum(m: unknown): number {
  const i = MESES.findIndex((x) => norm(x) === norm(m));
  return i >= 0 ? i + 1 : parseInt(String(m)) || 0;
}

/** Número do mês (1-12) → nome por extenso. */
export function mesNome(mo: unknown): string {
  const i = (parseInt(String(mo)) || 0) - 1;
  return MESES[i] || "";
}

/** R$ 1.234 (sem centavos, valor absoluto). */
export function fmtBRL(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return "R$ " + Math.round(Math.abs(v)).toLocaleString("pt-BR");
}

/** R$ 1,23M para valores grandes; prefixo ▼ quando negativo. */
export function fmtBRLCompact(v: number): string {
  const neg = v < 0;
  const abs = Math.abs(v);
  const str =
    abs >= 1_000_000
      ? "R$ " + (abs / 1_000_000).toFixed(2).replace(".", ",") + "M"
      : "R$ " + Math.round(abs).toLocaleString("pt-BR");
  return neg ? "▼ " + str : str;
}

/** Divide um texto em partes, marcando as ocorrências da busca. */
export function splitHighlight(txt: string, q: string): { text: string; hit: boolean }[] {
  if (!q) return [{ text: txt, hit: false }];
  const safe = q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  const parts = txt.split(new RegExp("(" + safe + ")", "gi"));
  const lower = q.toLowerCase();
  return parts
    .filter((p) => p !== "")
    .map((p) => ({ text: p, hit: p.toLowerCase() === lower }));
}
