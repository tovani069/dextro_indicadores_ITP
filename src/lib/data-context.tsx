"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  COLABORADORES,
  ORC_PESSOAL_SEED,
  ORC_RECORDS_SEED,
  TIMESHEET_SEED,
} from "@/data";
import { MESES } from "./constants";
import { ehFaturavel } from "./timesheet";
import type { CapacidadeRow, OrcPessoal, OrcRecord, PlanoRow, TSRow } from "./types";

/** De onde vieram os lançamentos exibidos. */
export type OrigemTimesheet = "smartsheet" | "embutido";

/** Resposta de /api/timesheet (o nome do mês é derivado aqui para encurtar o payload). */
type PayloadApi = {
  timesheet: (Omit<TSRow, "m"> & { m?: string })[];
  capacidade: CapacidadeRow[];
  colaboradores: { c: string; time: string; st: string }[];
  atualizadoEm: string;
};

type DataContextValue = {
  timesheet: TSRow[];
  /** Plano Estratégico ITP; vazio enquanto a leitura não volta. */
  plano: PlanoRow[];
  /** `true` enquanto o plano ainda está sendo lido. */
  planoCarregando: boolean;
  /** Horas disponíveis por colaborador/mês, vindas do Smartsheet. */
  capacidade: CapacidadeRow[];
  orcRecords: OrcRecord[];
  orcPessoal: OrcPessoal[];
  /** `false` até a primeira leitura no cliente (evita mismatch de hidratação). */
  hydrated: boolean;
  origem: OrigemTimesheet;
  /** Momento da leitura do Smartsheet (ISO), quando aplicável. */
  atualizadoEm: string | null;
  /** `true` enquanto uma releitura do Smartsheet está em andamento. */
  carregando: boolean;
};

/** De quanto em quanto tempo a tela confere a planilha, com a aba à vista. */
const INTERVALO_MS = 30_000;

/** Intervalo mínimo entre duas leituras que ignoram o cache. */
const ESPERA_LEITURA_DIRETA_MS = 20_000;

const DataContext = createContext<DataContextValue | null>(null);

const INFO_COLAB = new Map(COLABORADORES.map((i) => [i.c, i]));

/**
 * Normaliza os lançamentos de qualquer origem: aplica a regra de faturável
 * (pela categoria) e resolve Time e Status do colaborador.
 *
 * O Time vem de `data/colaboradores.json` e **tem prioridade** sobre o Setor
 * do cadastro: a operação foi reorganizada em cinco times (MDR, Endpoint,
 * Exposure, Identity e Network) e o cadastro no Smartsheet ainda registra a
 * estrutura antiga de dois. Quando o cadastro for atualizado, basta apagar o
 * `time` do arquivo para o Setor voltar a mandar.
 *
 * O Status continua vindo do cadastro, que é a fonte viva de quem está ativo.
 */
function enriquecer(rows: TSRow[]): TSRow[] {
  return rows.map((r) => {
    const info = INFO_COLAB.get(r.c);
    const b = ehFaturavel(r.cat);
    const time = info?.time || r.time;
    const st = r.st || info?.st;
    if (b === r.b && time === r.time && st === r.st) return r;
    return { ...r, b, ...(time ? { time } : {}), ...(st ? { st } : {}) };
  });
}

/**
 * Chaves da antiga importação por planilha. Ficaram obsoletas quando os dados
 * passaram a vir do Smartsheet; são apagadas para não mascarar a base ao vivo
 * em quem já importou alguma vez.
 */
const CHAVES_OBSOLETAS = ["itpTS", "itpCapacidade", "itpPlano", "itpOrcRec", "itpOrcPes"];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [timesheet, setTimesheet] = useState<TSRow[]>(() => enriquecer(TIMESHEET_SEED));
  const [plano, setPlano] = useState<PlanoRow[]>([]);
  const [planoCarregando, setPlanoCarregando] = useState(true);
  const [capacidade, setCapacidade] = useState<CapacidadeRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [origem, setOrigem] = useState<OrigemTimesheet>("embutido");
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  /** Momento da última leitura direta, para não repetir a cada piscada de foco. */
  const ultimaDireta = useRef(0);

  /**
   * `fresh` pula o cache da rota e do CDN: é o caminho de quando alguém acabou
   * de salvar a planilha e volta para a tela.
   */
  const lerTimesheet = useCallback(async (fresh = false) => {
    if (fresh) ultimaDireta.current = Date.now();
    // Só a leitura direta acende o aviso; a checagem de fundo é silenciosa.
    if (fresh) setCarregando(true);
    try {
      const r = await fetch(
        "/api/timesheet" + (fresh ? "?fresh=1" : ""),
        fresh ? { cache: "no-store" } : undefined,
      );
      if (!r.ok) throw new Error("HTTP " + r.status);
      const p: PayloadApi = await r.json();
      if (!p?.timesheet?.length) return;
      setTimesheet(
        enriquecer(p.timesheet.map((row) => ({ ...row, m: row.m || MESES[row.mo - 1] || "" }))),
      );
      if (p.capacidade?.length) setCapacidade(p.capacidade);
      setOrigem("smartsheet");
      setAtualizadoEm(p.atualizadoEm);
    } catch (e) {
      console.error("Smartsheet indisponível; exibindo os dados embutidos.", e);
    } finally {
      if (fresh) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    try {
      CHAVES_OBSOLETAS.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* modo privado: segue sem limpar */
    }
    setHydrated(true);

    let cancelado = false;
    void lerTimesheet();
    fetch("/api/plano")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((p: { plano: PlanoRow[] }) => {
        if (!cancelado && p?.plano) setPlano(p.plano);
      })
      .catch((e) => console.error("Plano Estratégico indisponível.", e))
      .finally(() => {
        if (!cancelado) setPlanoCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [lerTimesheet]);

  /**
   * A tela se mantém sozinha: confere a planilha a cada meio minuto enquanto
   * está à vista e, ao voltar para a aba, faz uma leitura direta — que é o
   * caso de quem salvou a planilha em outra janela e volta para conferir.
   * Aba escondida não consulta nada.
   */
  useEffect(() => {
    const conferir = () => {
      if (document.visibilityState === "visible") void lerTimesheet();
    };
    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - ultimaDireta.current < ESPERA_LEITURA_DIRETA_MS) return;
      void lerTimesheet(true);
    };

    const id = window.setInterval(conferir, INTERVALO_MS);
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
    };
  }, [lerTimesheet]);

  const value = useMemo<DataContextValue>(
    () => ({
      timesheet,
      capacidade,
      plano,
      planoCarregando,
      orcRecords: ORC_RECORDS_SEED,
      orcPessoal: ORC_PESSOAL_SEED,
      hydrated,
      origem,
      atualizadoEm,
      carregando,
    }),
    [timesheet, capacidade, plano, planoCarregando, hydrated, origem, atualizadoEm, carregando],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData precisa estar dentro de <DataProvider>");
  return ctx;
}
