import type { SetorId } from "./types";

export const SECTIONS: { id: SetorId; label: string; icon: string; dot: string }[] = [
  { id: "plano", label: "Plano de Ação", icon: "📋", dot: "#4F8EFF" },
  { id: "indicadores", label: "Indicadores", icon: "📊", dot: "#6C3FFF" },
  { id: "orcamento", label: "Orçamento Dir. Op.", icon: "💰", dot: "#00C8A0" },
  { id: "timesheet", label: "Timesheet Operações", icon: "⏱", dot: "#FF9B00" },
];

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const MES_ABBR = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export const MES_ORD: Record<string, number> = Object.fromEntries(
  MESES.map((m, i) => [m, i + 1]),
);

// ── Timesheet ──────────────────────────────────────────────────────────
export const CHARGE_TARGET = 70;

export const TS_CAT_COLORS: Record<string, string> = {
  "1. Suporte": "#4F8EFF",
  "2. Implantação": "#00C8A0",
  "3. Estudos/Treinamentos": "#FF9B00",
  "4. Outras Demandas": "#FF5C6A",
  "5. Comercial": "#6C3FFF",
  "8. Relatórios": "#FF40A0",
};

// ── Plano de ação ──────────────────────────────────────────────────────
export const OBJ_COLORS: Record<string, string> = {
  "4.1 Fortalecer e Aperfeiçoar o MDR e Suporte": "#4F8EFF",
  "4.2 Implantar Cultura de Gestão de Projetos": "#00C8A0",
  "1.1 Implantar a Cultura de Gestão Orientada para Indicadores": "#FF9B00",
  "—": "#6E748A",
};

export const PLANO_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  "Concluído": { color: "#00C8A0", bg: "rgba(0,200,160,.15)" },
  "Em andamento": { color: "#4F8EFF", bg: "rgba(79,142,255,.15)" },
  "Não iniciado": { color: "#8890B0", bg: "var(--bg4)" },
};

// ── Orçamento ──────────────────────────────────────────────────────────
export const ORC_CAT_COLORS: Record<string, string> = {
  "Custo Suporte Técnico": "#4F8EFF",
  "Custo SOC/MDR": "#00C8A0",
  "Serviços Profissionais": "#FF9B00",
  "Custo Hardware": "#6C3FFF",
};

export const ORC_PROJ_COLORS: Record<string, string> = {
  "Licenças": "#4F8EFF",
  "Treinamentos": "#00C8A0",
  "Eventos": "#FF9B00",
  "Viagens": "#FF5C6A",
  "Serviços": "#6C3FFF",
  "ISO": "#FF40A0",
  "Premiações": "#20C0FF",
  "Infraestrutura": "#FFB020",
};

/** Percentual global de execução do budget (consolidado v.3). */
export const ORC_PCT_EXEC = 16.7;
/** Quantidade de repactuações do orçamento no ano. */
export const ORC_REPACTUACOES = 3;
/** Índice do mês corrente usado nas projeções (5 = Junho). */
export const ORC_MES_ATUAL_IDX = 5;

// ── Indicadores ────────────────────────────────────────────────────────
export const IND_GRUPOS = [
  "Gestão",
  "Projetos & Implantação",
  "Suporte & SLA",
  "SOC / MDR",
  "Qualidade",
];

export const IND_GRUPO_COLORS: Record<string, string> = {
  "Gestão": "#6C3FFF",
  "Projetos & Implantação": "#4F8EFF",
  "Suporte & SLA": "#00C8A0",
  "SOC / MDR": "#FF5C6A",
  "Qualidade": "#FF9B00",
};

export const IND_NIVEL_COLORS: Record<string, { color: string; bg: string }> = {
  "Estratégico": { color: "#6C3FFF", bg: "rgba(108,63,255,.15)" },
  "Tático": { color: "#4F8EFF", bg: "rgba(79,142,255,.15)" },
  "Operacional": { color: "#00C8A0", bg: "rgba(0,200,160,.15)" },
};

// ── Chaves de persistência no navegador ────────────────────────────────
export const STORAGE_KEYS = {
  timesheet: "itpTS",
  plano: "itpPlano",
  orcRecords: "itpOrcRec",
  orcPessoal: "itpOrcPes",
  theme: "itpTheme",
} as const;
