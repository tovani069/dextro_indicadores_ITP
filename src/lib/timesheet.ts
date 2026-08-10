import { CHARGE_TARGET } from "./constants";
import type { TSRow } from "./types";

/**
 * Categorias que contam como horas faturáveis — mesma regra do relatório de
 * Power BI da operação. Note que é a categoria que define, não o cliente:
 * horas no cliente interno (ITP) em categorias de entrega são faturáveis.
 */
export const CATEGORIAS_FATURAVEIS = new Set([
  "1. Suporte",
  "2. Implantação",
  "6. Laboratório",
  "7. Investigação de Dados",
  "8. Relatórios",
]);

export const ehFaturavel = (categoria: string) => CATEGORIAS_FATURAVEIS.has(categoria.trim());

/**
 * Chargeability = horas faturáveis ÷ horas disponíveis (como no relatório).
 * Sem base de capacidade, cai para faturáveis ÷ preenchidas.
 */
export function chargeability(faturaveis: number, preenchidas: number, disponiveis: number) {
  const base = disponiveis > 0 ? disponiveis : preenchidas;
  return base > 0 ? (faturaveis / base) * 100 : 0;
}

/** Cor conforme a distância da meta de chargeability. */
export function chargColor(v: number) {
  return v >= CHARGE_TARGET ? "#00C8A0" : v >= 50 ? "#FF9B00" : "#FF5C6A";
}

/** Rótulo curto de situação do colaborador frente à meta. */
export function chargLabel(v: number) {
  return v >= CHARGE_TARGET ? "✅ Meta atingida" : v >= 50 ? "🟡 Atenção" : "🔴 Abaixo da meta";
}

/** Fundo suave na cor da situação. */
export function chargBg(v: number) {
  return v >= CHARGE_TARGET
    ? "rgba(0,200,160,.10)"
    : v >= 50
      ? "rgba(255,155,0,.10)"
      : "rgba(255,92,106,.10)";
}

/** Remove o prefixo numérico de clientes ("13. ITP") e categorias. */
export const stripPrefix = (s: string) => s.replace(/^\d+\.\s*/, "");
export const stripCatPrefix = (s: string) => s.replace(/^\d+\. /, "");

/** Rótulo de categoria; "nan" vem da exportação de origem e vira "(Em branco)". */
export function rotuloCat(c: string) {
  const s = stripCatPrefix(c).trim();
  return !s || s.toLowerCase() === "nan" ? "(Em branco)" : s;
}

/** Versão curta para cabeçalhos estreitos, como os da matriz. */
const ABREV_CAT: Record<string, string> = {
  "Estudos/Treinamentos": "Estudos/Trein.",
  "Investigação de Dados": "Investigação",
  "Outras Demandas": "Outras Dem.",
};
export const abrevCat = (c: string) => {
  const s = rotuloCat(c);
  return ABREV_CAT[s] ?? s;
};

export const fmtH = (v: number) => Math.round(v).toLocaleString("pt-BR") + "h";
export const fmtMil = (v: number) =>
  v >= 1000
    ? (v / 1000).toFixed(2).replace(".", ",") + " Mil"
    : Math.round(v).toLocaleString("pt-BR");
export const fmt2 = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Totais de um colaborador dentro do recorte já filtrado. */
export function resumoColaborador(rows: TSRow[], colab: string) {
  const cr = rows.filter((r) => r.c === colab);
  const total = cr.reduce((a, r) => a + r.h, 0);
  const billable = cr.filter((r) => r.b).reduce((a, r) => a + r.h, 0);
  return { linhas: cr, total, billable, nonBillable: total - billable };
}
