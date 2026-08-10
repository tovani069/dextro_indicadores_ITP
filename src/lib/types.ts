/** Um lançamento de timesheet. */
export type TSRow = {
  /** Colaborador */
  c: string;
  /** Cliente / contrato */
  cl: string;
  /** Categoria */
  cat: string;
  /** Nome do mês */
  m: string;
  /** Número do mês (1-12) */
  mo: number;
  /** Ano */
  a: number;
  /** Horas */
  h: number;
  /** Billable */
  b: boolean;
  /** Data (YYYY-MM-DD) */
  d: string;
  /** Time / equipe do colaborador (ex.: MDR, Suporte) — opcional */
  time?: string;
  /** Status do colaborador (Ativo / Inativo) — opcional */
  st?: string;
};

/**
 * Horas disponíveis (capacidade) por colaborador e mês.
 * É a base do "% Preenchimento" = horas preenchidas ÷ horas disponíveis.
 * Fica vazio até ser importado pela aba "Capacidade" da planilha.
 */
export type CapacidadeRow = {
  /** Colaborador */
  c: string;
  /** Ano */
  a: number;
  /** Número do mês (1-12) */
  mo: number;
  /** Horas disponíveis no mês */
  horas: number;
};

/** Uma ação do plano de ação. */
export type PlanoRow = {
  status: string;
  atividade: string;
  responsavel: string;
  prazo: string;
  objetivo: string;
  prioridade: string;
  dias_atraso: number;
  farol: string;
};

/** Uma linha de despesa do orçamento. */
export type OrcRecord = {
  codigo: string;
  conta: string;
  desc: string;
  proj: string;
  obs: string;
  bud_inicial: number;
  bud: number;
  exec_total: number;
  variacao: number;
  pct: number;
  grupo: string;
  /** Executado por mês (chaves 'Jan'…'Dez') */
  exec: Record<string, number>;
  /** Planejado por mês (chaves 'Jan'…'Dez') */
  plan_mes?: Record<string, number>;
};

/** Uma posição do quadro de pessoal. */
export type OrcPessoal = {
  tipo: string;
  status: string;
  grupo: string;
  nome: string;
  depto: string;
  admissao: string;
  regime: string;
  salario: number;
  obs: string;
};

/** Um indicador com a série mensal do ano. */
export type Indicador = {
  id: string;
  ind: string;
  nivel: string;
  status_ind: string;
  period: string;
  is_pct: boolean;
  meta_label: string;
  meta_val: number | null;
  /** 12 posições (Jan–Dez), `null` onde não há leitura */
  valores: (number | null)[];
  grupo: string;
  /** 'max' = quanto menor melhor; ausente = quanto maior melhor */
  meta_dir?: "max" | "min";
};

export type SetorId = "plano" | "indicadores" | "orcamento" | "timesheet";
