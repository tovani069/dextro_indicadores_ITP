"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  COLABORADORES,
  ORC_PESSOAL_SEED,
  ORC_RECORDS_SEED,
  PLANO_SEED,
  TIMESHEET_SEED,
} from "@/data";
import { MESES, STORAGE_KEYS } from "./constants";
import { ehFaturavel } from "./timesheet";
import type { CapacidadeRow, OrcPessoal, OrcRecord, PlanoRow, TSRow } from "./types";

export type DatasetKey = "timesheet" | "plano" | "orcamento";

/** De onde vieram os lançamentos exibidos. */
export type OrigemTimesheet = "smartsheet" | "importado" | "embutido";

/** Resposta de /api/timesheet (o nome do mês é derivado aqui para encurtar o payload). */
type PayloadApi = {
  timesheet: (Omit<TSRow, "m"> & { m?: string })[];
  capacidade: CapacidadeRow[];
  colaboradores: { c: string; time: string; st: string }[];
  atualizadoEm: string;
};

type DataContextValue = {
  timesheet: TSRow[];
  /** Horas disponíveis por colaborador/mês; vazio enquanto não for importada. */
  capacidade: CapacidadeRow[];
  plano: PlanoRow[];
  orcRecords: OrcRecord[];
  orcPessoal: OrcPessoal[];
  /** `false` até o primeiro efeito ler o localStorage (evita mismatch de hidratação). */
  hydrated: boolean;
  /** Origem dos lançamentos exibidos. */
  origem: OrigemTimesheet;
  /** Momento da leitura do Smartsheet (ISO), quando aplicável. */
  atualizadoEm: string | null;
  setTimesheet: (rows: TSRow[], capacidade?: CapacidadeRow[]) => void;
  setPlano: (rows: PlanoRow[]) => void;
  setOrcamento: (records: OrcRecord[] | null, pessoal: OrcPessoal[] | null) => void;
  restore: (dataset: DatasetKey) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

function readStored<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? (parsed as T[]) : null;
  } catch (e) {
    console.error("Falha ao ler dados salvos de " + key, e);
    return null;
  }
}

const INFO_COLAB = new Map(COLABORADORES.map((i) => [i.c, i]));

/**
 * Normaliza os lançamentos de qualquer origem: aplica a regra de faturável
 * (pela categoria) e completa Time/Status a partir de
 * `data/colaboradores.json` quando o lançamento não os traz.
 */
function enriquecer(rows: TSRow[]): TSRow[] {
  return rows.map((r) => {
    const info = INFO_COLAB.get(r.c);
    const b = ehFaturavel(r.cat);
    if (!info || (r.time && r.st)) return b === r.b ? r : { ...r, b };
    return { ...r, b, time: r.time ?? info.time, st: r.st ?? info.st };
  });
}

function persist(key: string, rows: unknown[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch (e) {
    console.error("Falha ao salvar dados em " + key, e);
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [timesheet, setTimesheetState] = useState<TSRow[]>(() => enriquecer(TIMESHEET_SEED));
  const [capacidade, setCapacidadeState] = useState<CapacidadeRow[]>([]);
  const [plano, setPlanoState] = useState<PlanoRow[]>(PLANO_SEED);
  const [orcRecords, setOrcRecordsState] = useState<OrcRecord[]>(ORC_RECORDS_SEED);
  const [orcPessoal, setOrcPessoalState] = useState<OrcPessoal[]>(ORC_PESSOAL_SEED);
  const [hydrated, setHydrated] = useState(false);
  const [origem, setOrigem] = useState<OrigemTimesheet>("embutido");
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);

  // Dados importados ficam no navegador e substituem os embutidos.
  useEffect(() => {
    const ts = readStored<TSRow>(STORAGE_KEYS.timesheet);
    if (ts) setTimesheetState(enriquecer(ts));
    const cap = readStored<CapacidadeRow>(STORAGE_KEYS.capacidade);
    if (cap) setCapacidadeState(cap);
    const pl = readStored<PlanoRow>(STORAGE_KEYS.plano);
    if (pl) setPlanoState(pl);
    const rec = readStored<OrcRecord>(STORAGE_KEYS.orcRecords);
    if (rec) setOrcRecordsState(rec);
    const pes = readStored<OrcPessoal>(STORAGE_KEYS.orcPessoal);
    if (pes) setOrcPessoalState(pes);
    setHydrated(true);

    // Uma importação manual é uma escolha explícita do usuário: tem prioridade
    // sobre a leitura automática do Smartsheet.
    if (ts) {
      setOrigem("importado");
      return;
    }

    let cancelado = false;
    fetch("/api/timesheet")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((p: PayloadApi) => {
        if (cancelado || !p?.timesheet?.length) return;
        setTimesheetState(
          enriquecer(p.timesheet.map((r) => ({ ...r, m: r.m || MESES[r.mo - 1] || "" }))),
        );
        if (p.capacidade?.length) setCapacidadeState(p.capacidade);
        setOrigem("smartsheet");
        setAtualizadoEm(p.atualizadoEm);
      })
      .catch((e) => {
        console.error("Smartsheet indisponível; exibindo os dados embutidos.", e);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const setTimesheet = useCallback((rows: TSRow[], cap?: CapacidadeRow[]) => {
    persist(STORAGE_KEYS.timesheet, rows);
    setTimesheetState(enriquecer(rows));
    if (cap && cap.length) {
      persist(STORAGE_KEYS.capacidade, cap);
      setCapacidadeState(cap);
    }
  }, []);

  const setPlano = useCallback((rows: PlanoRow[]) => {
    persist(STORAGE_KEYS.plano, rows);
    setPlanoState(rows);
  }, []);

  const setOrcamento = useCallback(
    (records: OrcRecord[] | null, pessoal: OrcPessoal[] | null) => {
      if (records && records.length) {
        persist(STORAGE_KEYS.orcRecords, records);
        setOrcRecordsState(records);
      }
      if (pessoal && pessoal.length) {
        persist(STORAGE_KEYS.orcPessoal, pessoal);
        setOrcPessoalState(pessoal);
      }
    },
    [],
  );

  const restore = useCallback((dataset: DatasetKey) => {
    if (dataset === "timesheet") {
      localStorage.removeItem(STORAGE_KEYS.timesheet);
      localStorage.removeItem(STORAGE_KEYS.capacidade);
      setTimesheetState(enriquecer(TIMESHEET_SEED));
      setCapacidadeState([]);
    } else if (dataset === "plano") {
      localStorage.removeItem(STORAGE_KEYS.plano);
      setPlanoState(PLANO_SEED);
    } else {
      localStorage.removeItem(STORAGE_KEYS.orcRecords);
      localStorage.removeItem(STORAGE_KEYS.orcPessoal);
      setOrcRecordsState(ORC_RECORDS_SEED);
      setOrcPessoalState(ORC_PESSOAL_SEED);
    }
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      timesheet,
      capacidade,
      plano,
      orcRecords,
      orcPessoal,
      hydrated,
      origem,
      atualizadoEm,
      setTimesheet,
      setPlano,
      setOrcamento,
      restore,
    }),
    [
      timesheet,
      capacidade,
      plano,
      orcRecords,
      orcPessoal,
      hydrated,
      origem,
      atualizadoEm,
      setTimesheet,
      setPlano,
      setOrcamento,
      restore,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData precisa estar dentro de <DataProvider>");
  return ctx;
}
