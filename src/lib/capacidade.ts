import type { CapacidadeRow, TSRow } from "./types";

/** Jornada considerada quando a capacidade é estimada. */
export const JORNADA_PADRAO = 8;

/** Domingo de Páscoa (algoritmo de Meeus/Butcher). */
function pascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const chave = (d: Date) =>
  `${d.getUTCMonth() + 1}-${d.getUTCDate()}`;

function somarDias(d: Date, dias: number) {
  return new Date(d.getTime() + dias * 86400000);
}

/** Feriados nacionais do ano, incluindo os móveis e o Carnaval. */
function feriados(ano: number): Set<string> {
  const p = pascoa(ano);
  const fixos = ["1-1", "4-21", "5-1", "9-7", "10-12", "11-2", "11-15", "12-25"];
  // Consciência Negra virou feriado nacional em 2024 (Lei 14.759/2023).
  if (ano >= 2024) fixos.push("11-20");
  const moveis = [
    somarDias(p, -48), // segunda de carnaval
    somarDias(p, -47), // terça de carnaval
    somarDias(p, -2), // sexta-feira santa
    somarDias(p, 60), // corpus christi
  ].map(chave);
  return new Set([...fixos, ...moveis]);
}

const cacheFeriados = new Map<number, Set<string>>();

function feriadosDe(ano: number): Set<string> {
  let f = cacheFeriados.get(ano);
  if (!f) {
    f = feriados(ano);
    cacheFeriados.set(ano, f);
  }
  return f;
}

function util(d: Date): boolean {
  const semana = d.getUTCDay();
  if (semana === 0 || semana === 6) return false;
  return !feriadosDe(d.getUTCFullYear()).has(chave(d));
}

/** Dias úteis do mês (seg–sex, descontando feriados nacionais). */
export function diasUteis(ano: number, mes: number): number {
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  let total = 0;
  for (let dia = 1; dia <= ultimo; dia++) {
    if (util(new Date(Date.UTC(ano, mes - 1, dia)))) total++;
  }
  return total;
}

/** Um dia (data ISO `YYYY-MM-DD`) é útil? Mesma régua de `diasUteis`. */
export function ehDiaUtil(iso: string): boolean {
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return false;
  return util(new Date(Date.UTC(ano, mes - 1, dia)));
}

/**
 * Estimativa de horas disponíveis, usada enquanto não há a aba "Capacidade".
 * Considera que o colaborador estava disponível o mês inteiro nos meses em que
 * tem algum lançamento: dias úteis × jornada.
 */
export function estimarCapacidade(rows: TSRow[], jornada = JORNADA_PADRAO): CapacidadeRow[] {
  const vistos = new Set<string>();
  const out: CapacidadeRow[] = [];
  rows.forEach((r) => {
    if (!r.a || !r.mo) return;
    const k = `${r.c}|${r.a}|${r.mo}`;
    if (vistos.has(k)) return;
    vistos.add(k);
    out.push({ c: r.c, a: r.a, mo: r.mo, horas: diasUteis(r.a, r.mo) * jornada });
  });
  return out;
}
