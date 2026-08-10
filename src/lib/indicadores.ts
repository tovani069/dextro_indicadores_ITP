import type { Indicador } from "./types";

export type IndStatus = "ok" | "warn" | "nd";

/** Compara a última leitura com a meta (respeitando indicadores "quanto menor melhor"). */
export function indGetStatus(ind: Indicador): IndStatus {
  const vals = ind.valores.filter((v): v is number => v !== null && v !== undefined);
  if (!vals.length) return "nd";
  const last = vals[vals.length - 1];
  if (ind.meta_val === null || ind.meta_val === undefined) return "nd";
  if (ind.meta_dir === "max") return last <= ind.meta_val ? "ok" : "warn";
  return last >= ind.meta_val ? "ok" : "warn";
}

const STATUS_INFO: Record<IndStatus, { emoji: string; label: string; color: string; bg: string }> = {
  ok: { emoji: "✅", label: "No Alvo", color: "#00C8A0", bg: "rgba(0,200,160,.15)" },
  warn: { emoji: "🟡", label: "Atenção", color: "#FF9B00", bg: "rgba(255,155,0,.15)" },
  nd: { emoji: "⚪", label: "Sem Dados", color: "#8890B0", bg: "var(--bg4)" },
};

export function indStatusInfo(s: IndStatus) {
  return STATUS_INFO[s] || STATUS_INFO.nd;
}

/** Formata uma leitura conforme o tipo do indicador (percentual, inteiro, decimal). */
export function indFmt(ind: Indicador, v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (ind.is_pct) return v.toFixed(1) + "%";
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(1);
}
