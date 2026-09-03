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
  /** Descrição da atividade lançada — opcional (só na base do Smartsheet) */
  desc?: string;
  /** Número do chamado / contrato — opcional */
  ch?: string;
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

/**
 * Parâmetros do painel editados na planilha "Painel ITP | Configurações"
 * do Smartsheet, sem passar por alteração de código.
 */
export type ConfigPainel = {
  /** Capacity: meta de chargeability, em % (linha laranja e cor verde). */
  capacity: number;
  /** Abaixo da meta e acima deste valor é amarelo; abaixo dele, vermelho. */
  atencao: number;
};

/**
 * Uma ação do Plano Estratégico ITP, vinda do relatório
 * "Desenvolvimento de Programas e Ações" (uma versão por ano).
 */
export type PlanoRow = {
  /** Ano do ciclo de planejamento (relatório de origem) */
  ano: number;
  atividade: string;
  /** Aguardando · Em Atraso · Concluído · Excluído (calculado na planilha) */
  status: string;
  /** 1. Não Iniciado · 2. Em Execução · 3. Para Aprovação · 4. Acompanhamento · 5. Concluído */
  execucao: string;
  concluido: boolean;
  /** Sim · Aguardar · Não */
  farol: string;
  responsavel: string;
  /** Prazo final em YYYY-MM-DD */
  prazo: string;
  objetivo: string;
  perspectiva: string;
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

export type SetorId = "plano" | "indicadores" | "orcamento" | "timesheet" | "mapa";
