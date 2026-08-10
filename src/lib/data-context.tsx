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
  ORC_PESSOAL_SEED,
  ORC_RECORDS_SEED,
  PLANO_SEED,
  TIMESHEET_SEED,
} from "@/data";
import { STORAGE_KEYS } from "./constants";
import type { CapacidadeRow, OrcPessoal, OrcRecord, PlanoRow, TSRow } from "./types";

export type DatasetKey = "timesheet" | "plano" | "orcamento";

type DataContextValue = {
  timesheet: TSRow[];
  /** Horas disponíveis por colaborador/mês; vazio enquanto não for importada. */
  capacidade: CapacidadeRow[];
  plano: PlanoRow[];
  orcRecords: OrcRecord[];
  orcPessoal: OrcPessoal[];
  /** `false` até o primeiro efeito ler o localStorage (evita mismatch de hidratação). */
  hydrated: boolean;
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

function persist(key: string, rows: unknown[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch (e) {
    console.error("Falha ao salvar dados em " + key, e);
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [timesheet, setTimesheetState] = useState<TSRow[]>(TIMESHEET_SEED);
  const [capacidade, setCapacidadeState] = useState<CapacidadeRow[]>([]);
  const [plano, setPlanoState] = useState<PlanoRow[]>(PLANO_SEED);
  const [orcRecords, setOrcRecordsState] = useState<OrcRecord[]>(ORC_RECORDS_SEED);
  const [orcPessoal, setOrcPessoalState] = useState<OrcPessoal[]>(ORC_PESSOAL_SEED);
  const [hydrated, setHydrated] = useState(false);

  // Dados importados ficam no navegador e substituem os embutidos.
  useEffect(() => {
    const ts = readStored<TSRow>(STORAGE_KEYS.timesheet);
    if (ts) setTimesheetState(ts);
    const cap = readStored<CapacidadeRow>(STORAGE_KEYS.capacidade);
    if (cap) setCapacidadeState(cap);
    const pl = readStored<PlanoRow>(STORAGE_KEYS.plano);
    if (pl) setPlanoState(pl);
    const rec = readStored<OrcRecord>(STORAGE_KEYS.orcRecords);
    if (rec) setOrcRecordsState(rec);
    const pes = readStored<OrcPessoal>(STORAGE_KEYS.orcPessoal);
    if (pes) setOrcPessoalState(pes);
    setHydrated(true);
  }, []);

  const setTimesheet = useCallback((rows: TSRow[], cap?: CapacidadeRow[]) => {
    persist(STORAGE_KEYS.timesheet, rows);
    setTimesheetState(rows);
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
      setTimesheetState(TIMESHEET_SEED);
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
