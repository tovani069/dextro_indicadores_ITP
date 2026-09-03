import { CONFIG_PADRAO, percentual } from "./config-painel";
import { ehFaturavel } from "./timesheet";
import type { CapacidadeRow, ConfigPainel, PlanoRow, TSRow } from "./types";

/**
 * Leitura da área de trabalho "DEXTRO | IT PROTECT TIME SHEET" no Smartsheet.
 * Só roda no servidor — o token nunca chega ao navegador.
 */

const API = "https://api.smartsheet.com/2.0";

/** IDs da área de trabalho (podem ser sobrescritos por variável de ambiente). */
export const FONTES = {
  /** Área de trabalho "DEXTRO | IT PROTECT TIME SHEET". */
  workspace: process.env.SMARTSHEET_WORKSPACE ?? "5515298200676228",
  /** Relatório "Base todos os lançamentos" — consolida as planilhas de cada colaborador. */
  lancamentos: process.env.SMARTSHEET_REPORT_LANCAMENTOS ?? "1507227873529732",
  /** Planilha "Cadastro de Colaboradores" — nome da planilha → nome, setor e status. */
  colaboradores: process.env.SMARTSHEET_SHEET_COLABORADORES ?? "1249337635983236",
  /** Planilha "Horas disponíveis" — capacidade por colaborador e mês. */
  capacidade: process.env.SMARTSHEET_SHEET_CAPACIDADE ?? "8194665899577220",
  /**
   * Planilha "Painel ITP | Configurações" — parâmetros que a operação ajusta
   * sem mexer no código, hoje o capacity e o limite de atenção.
   */
  config: process.env.SMARTSHEET_SHEET_CONFIG ?? "882692785655684",
  /**
   * Planilha "Painel ITP | Times" — nome do colaborador → time atual.
   *
   * O `Setor` do Cadastro de Colaboradores é a estrutura antiga, de dois times
   * (MDR e Suporte). A divisão de hoje, com Endpoint, Exposure, Identity, MDR e
   * Network, é mantida aqui: quem está listado aparece neste time, quem não
   * está continua caindo na pasta da planilha e, por fim, no Setor.
   */
  times: process.env.SMARTSHEET_SHEET_TIMES ?? "8867978727608196",
  /**
   * Relatórios "Desenvolvimento de Programas e Ações" — o Plano Estratégico
   * ITP, uma versão por ciclo anual, consolidando as planilhas por perspectiva.
   */
  plano: [
    { ano: 2024, id: process.env.SMARTSHEET_REPORT_PLANO_2024 ?? "6010181469032324" },
    { ano: 2025, id: process.env.SMARTSHEET_REPORT_PLANO_2025 ?? "1210769870901124" },
  ],
};

/** Cliente interno: horas nele não são faturáveis. */
const CLIENTE_INTERNO = /\bITP\b/i;

type Celula = { value?: unknown; displayValue?: string; virtualColumnId?: number; columnId?: number };
type Linha = { cells: Celula[] };
type Coluna = { title: string; id?: number; virtualId?: number };

export type ColaboradorInfo = {
  c: string;
  time: string;
  st: string;
  /**
   * O time veio de uma fonte da divisão atual — a planilha "Painel ITP | Times"
   * ou uma coluna `Time` no cadastro —, e não do Setor antigo nem da pasta.
   */
  timeDaPlanilha?: boolean;
};

type Pasta = {
  name: string;
  folders?: Pasta[];
  sheets?: { name: string }[];
};

const ANO = /^(19|20)\d{2}$/;
const NUMERADA = /^\d+\.\s/;
/** Pasta pessoal ("Alan Farias 2024") — não é nome de time. */
const TERMINA_EM_ANO = /(19|20)\d{2}\s*$/;

/**
 * Time de cada planilha pela pasta em que ela está guardada.
 *
 * A árvore é `01. Timesheet 2024 > 2024 | 2025 > MDR | Suporte > Time Sheet
 * Fulano 2025`: a pasta que dá nome ao time é a primeira que não é um ano nem
 * uma pasta numerada. É a fonte mais fiel de a que time alguém pertencia,
 * inclusive de quem já saiu, e se mantém sozinha conforme a operação arquiva
 * as planilhas.
 */
async function lerTimesPorPasta(revalidate: number): Promise<Map<string, string>> {
  const ws = await smartsheet<{ folders?: Pasta[] }>(
    `/workspaces/${FONTES.workspace}?loadAll=true`,
    revalidate,
  );
  const porPlanilha = new Map<string, string>();
  const percorrer = (pastas: Pasta[] | undefined, time: string | null) => {
    (pastas ?? []).forEach((pasta) => {
      const ehTime =
        !ANO.test(pasta.name) &&
        !NUMERADA.test(pasta.name) &&
        !TERMINA_EM_ANO.test(pasta.name);
      const atual = ehTime ? pasta.name.trim() : time;
      if (atual) (pasta.sheets ?? []).forEach((s) => porPlanilha.set(s.name, atual));
      percorrer(pasta.folders, atual);
    });
  };
  percorrer(ws.folders, null);
  return porPlanilha;
}

/** Ano no fim do nome da planilha ("Time Sheet Fulano 2025"). */
const anoDaPlanilha = (nome: string) => Number(nome.match(/(19|20)\d{2}\s*$/)?.[0] ?? 0);

export type PayloadTimesheet = {
  timesheet: Omit<TSRow, "m">[];
  capacidade: CapacidadeRow[];
  colaboradores: ColaboradorInfo[];
  config: ConfigPainel;
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

/** Primeiro título que existir no relatório — os nomes variam entre as bases. */
function primeiraColuna(idx: Record<string, number>, ...titulos: string[]) {
  for (const t of titulos) if (idx[t] !== undefined) return idx[t];
  return undefined;
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

/**
 * Cadastro de Colaboradores: nome oficial, time e status.
 *
 * O `Setor` do cadastro é a estrutura antiga, de dois times (MDR e Suporte).
 * Quando a planilha ganha uma coluna `Time` — a divisão atual da operação,
 * com Endpoint, Exposure, Identity, MDR e Network —, é ela que manda, célula
 * a célula: linha preenchida usa o time do cadastro, linha em branco continua
 * caindo na pasta da planilha e, por fim, no Setor.
 */
async function lerColaboradores(revalidate: number) {
  const sheet = await smartsheet<{ columns: Coluna[]; rows: Linha[] }>(
    `/sheets/${FONTES.colaboradores}`,
    revalidate,
  );
  const idx = indicePorTitulo(sheet.columns);
  const iTime = primeiraColuna(idx, "Time", "Equipe");
  const porPlanilha = new Map<string, ColaboradorInfo>();
  sheet.rows.forEach((r) => {
    const planilha = texto(r.cells[idx["Nome da Planilha"]]);
    const nome = texto(r.cells[idx["Nome"]]);
    if (!planilha || !nome) return;
    const time = iTime === undefined ? "" : texto(r.cells[iTime]);
    porPlanilha.set(planilha, {
      c: nome,
      time: time || texto(r.cells[idx["Setor"]]),
      st: texto(r.cells[idx["Status"]]),
      ...(time ? { timeDaPlanilha: true } : {}),
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

/** Nome comparável: sem acento, caixa ou espaço sobrando ("Sávio  Alves" → "savio alves"). */
const chaveNome = (s: string) =>
  s.normalize("NFD").toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();

/**
 * Planilha de times: nome → time atual. Qualquer falha (planilha renomeada,
 * coluna trocada) devolve um mapa vazio, e cada colaborador segue com o time
 * que já vinha do cadastro ou da pasta.
 */
async function lerTimes(revalidate: number): Promise<Map<string, string>> {
  try {
    const sheet = await smartsheet<{ columns: Coluna[]; rows: Linha[] }>(
      `/sheets/${FONTES.times}`,
      revalidate,
    );
    const idx = indicePorTitulo(sheet.columns);
    const iNome = primeiraColuna(idx, "Nome", "Colaborador");
    const iTime = primeiraColuna(idx, "Time", "Equipe");
    if (iNome === undefined || iTime === undefined) return new Map();
    const porNome = new Map<string, string>();
    sheet.rows.forEach((r) => {
      const nome = chaveNome(texto(r.cells[iNome]));
      const time = texto(r.cells[iTime]);
      if (nome && time) porNome.set(nome, time);
    });
    return porNome;
  } catch (e) {
    console.error("Planilha de times indisponível; vale o Setor do cadastro.", e);
    return new Map();
  }
}

/** Nome do parâmetro sem acento, espaço ou pontuação — "Capacity (%)" → "capacity". */
const chaveConfig = (s: string) =>
  // NFD separa o acento da letra; o filtro seguinte descarta os dois.
  s.normalize("NFD").toLowerCase().replace(/[^a-z]/g, "");

/**
 * Parâmetros da planilha de configurações. Qualquer falha (planilha renomeada,
 * célula em branco, valor fora da faixa) cai nos padrões: o painel nunca fica
 * sem capacity por causa de uma edição errada.
 */
async function lerConfig(revalidate: number): Promise<ConfigPainel> {
  try {
    const sheet = await smartsheet<{ columns: Coluna[]; rows: Linha[] }>(
      `/sheets/${FONTES.config}`,
      revalidate,
    );
    const idx = indicePorTitulo(sheet.columns);
    const iParam = primeiraColuna(idx, "Parâmetro", "Parametro");
    const iValor = primeiraColuna(idx, "Valor");
    if (iParam === undefined || iValor === undefined) return CONFIG_PADRAO;

    const valores = new Map<string, unknown>();
    sheet.rows.forEach((r) => {
      const chave = chaveConfig(texto(r.cells[iParam]));
      if (chave) valores.set(chave, r.cells[iValor]?.value ?? r.cells[iValor]?.displayValue);
    });

    const achar = (teste: (chave: string) => boolean) => {
      for (const [chave, valor] of valores) if (teste(chave)) return valor;
      return undefined;
    };

    return {
      capacity: percentual(
        achar((k) => k.includes("capacity") || k.includes("meta")),
        CONFIG_PADRAO.capacity,
      ),
      atencao: percentual(
        achar((k) => k.includes("atencao")),
        CONFIG_PADRAO.atencao,
      ),
    };
  } catch (e) {
    console.error("Configurações do painel indisponíveis; usando os padrões.", e);
    return CONFIG_PADRAO;
  }
}

/**
 * Acha o colaborador de uma planilha de lançamentos.
 *
 * O caminho normal é o nome exato da planilha, como está no cadastro. Só que
 * planilha renomeada e ano digitado errado no cadastro acontecem — e antes
 * disso derrubava a pessoa inteira do painel, calada. Então há duas reservas:
 * o nome tirado do título da planilha ("Time Sheet Marcio Almeida 2025" →
 * "Marcio Almeida") e, para quem nem está no cadastro, a planilha de times.
 */
function resolvedorDeColaborador(
  porPlanilha: Map<string, ColaboradorInfo>,
  timesPorNome: Map<string, string>,
) {
  const porNome = new Map<string, ColaboradorInfo>();
  porPlanilha.forEach((info, planilha) => {
    porNome.set(chaveNome(info.c), info);
    const doTitulo = chaveNome(nomeDaPlanilha(planilha));
    if (doTitulo && !porNome.has(doTitulo)) porNome.set(doTitulo, info);
  });

  return (planilha: string): ColaboradorInfo | undefined => {
    const exato = porPlanilha.get(planilha);
    if (exato) return exato;
    const nome = nomeDaPlanilha(planilha);
    const chave = chaveNome(nome);
    const porTitulo = porNome.get(chave);
    if (porTitulo) return porTitulo;
    const time = timesPorNome.get(chave);
    return time ? { c: nome, time, st: "", timeDaPlanilha: true } : undefined;
  };
}

/** O relatório é grande (dezenas de milhares de linhas): lido em páginas. */
async function lerLancamentos(
  colaboradorDa: (planilha: string) => ColaboradorInfo | undefined,
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
    const iDesc = primeiraColuna(idx, "Descrição", "Descricao", "Descrição da Atividade");
    const iChamado = primeiraColuna(
      idx,
      "Número do Chamado/Contrato",
      "Numero do Chamado/Contrato",
      "Nº do Chamado/Contrato",
      "Chamado/Contrato",
    );
    totalPaginas = Math.max(1, Math.ceil((rel.totalRowCount || 0) / TAMANHO));

    rel.rows.forEach((r) => {
      const data = texto(r.cells[idx["Data"]]);
      const horas = numero(r.cells[idx["Duração (Horas)"]]);
      if (!data || !horas) return;

      const planilha = texto(r.cells[idx["Nome da planilha"]]);
      const info = colaboradorDa(planilha);
      const cliente = texto(r.cells[idx["Cliente"]]);
      const categoria = texto(r.cells[idx["Categoria"]]);
      const [ano, mes] = data.split("-").map(Number);
      if (!ano || !mes) return;

      // Só o que tem conteúdo vai no payload: são dezenas de milhares de linhas.
      const desc = iDesc === undefined ? "" : texto(r.cells[iDesc]);
      const ch = iChamado === undefined ? "" : texto(r.cells[iChamado]);

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
        ...(desc ? { desc } : {}),
        ...(ch ? { ch } : {}),
      });
    });

    pagina++;
  } while (pagina <= totalPaginas);

  return out;
}

/** Lê as fontes e devolve tudo já no formato do dashboard. */
export async function carregarTimesheet(revalidate = 1800): Promise<PayloadTimesheet> {
  const porPlanilha = await lerColaboradores(revalidate);

  // A planilha de times entra antes dos lançamentos porque é ela que decide o
  // time gravado em cada linha de hora.
  const timesPorNome = await lerTimes(revalidate);
  porPlanilha.forEach((info) => {
    const time = timesPorNome.get(chaveNome(info.c));
    if (!time) return;
    info.time = time;
    info.timeDaPlanilha = true;
  });

  const colaboradorDa = resolvedorDeColaborador(porPlanilha, timesPorNome);
  const [timesPorPasta, timesheet, capacidade, config] = await Promise.all([
    lerTimesPorPasta(revalidate).catch(() => new Map<string, string>()),
    lerLancamentos(colaboradorDa, revalidate),
    lerCapacidade(revalidate),
    lerConfig(revalidate),
  ]);

  // Sem time no cadastro, a pasta manda, e o Setor fica como reserva. Quando há
  // planilha de mais de um ano, vale a mais recente.
  const anoDoTime = new Map<string, number>();
  porPlanilha.forEach((info, planilha) => {
    if (info.timeDaPlanilha) return;
    const time = timesPorPasta.get(planilha);
    if (!time) return;
    const ano = anoDaPlanilha(planilha);
    if (ano >= (anoDoTime.get(info.c) ?? -1)) {
      anoDoTime.set(info.c, ano);
      info.time = time;
    }
  });

  // Um colaborador pode ter uma planilha por ano; consolidamos por nome.
  const colaboradores = new Map<string, ColaboradorInfo>();
  porPlanilha.forEach((info) => colaboradores.set(info.c, info));

  return {
    timesheet,
    capacidade,
    colaboradores: [...colaboradores.values()],
    config,
    atualizadoEm: new Date().toISOString(),
  };
}

/** Lê o Plano Estratégico ITP de todos os ciclos configurados. */
export async function carregarPlano(revalidate = 1800): Promise<{
  plano: PlanoRow[];
  atualizadoEm: string;
}> {
  const porCiclo = await Promise.all(
    FONTES.plano.map(async ({ ano, id }) => {
      const rel = await smartsheet<{ columns: Coluna[]; rows: Linha[] }>(
        `/reports/${id}?pageSize=10000&page=1`,
        revalidate,
      );
      const idx = indicePorTitulo(rel.columns);
      const out: PlanoRow[] = [];
      rel.rows.forEach((r) => {
        const atividade = texto(r.cells[idx["Primário"]]);
        if (!atividade) return;
        const status = texto(r.cells[idx["Status"]]);
        // Linhas marcadas como excluídas continuam na planilha, mas saem do plano.
        if (status === "Excluído") return;
        out.push({
          ano,
          atividade,
          status,
          execucao: texto(r.cells[idx["Execução"]]),
          concluido: r.cells[idx["Concluído"]]?.value === true,
          farol: texto(r.cells[idx["Farol"]]),
          responsavel: texto(r.cells[idx["Responsável"]]),
          prazo: texto(r.cells[idx["Prazo Final"]]),
          objetivo: texto(r.cells[idx["Objetivo Estratégico"]]),
          perspectiva: texto(r.cells[idx["Perspectiva"]]),
        });
      });
      return out;
    }),
  );

  return {
    plano: porCiclo.flat(),
    atualizadoEm: new Date().toISOString(),
  };
}
