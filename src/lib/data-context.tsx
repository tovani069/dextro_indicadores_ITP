"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

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
};

const DataContext = createContext<DataContextValue | null>(null);

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

  useEffect(() => {
    try {
      CHAVES_OBSOLETAS.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* modo privado: segue sem limpar */
    }
    setHydrated(true);

    let cancelado = false;
    fetch("/api/timesheet")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((p: PayloadApi) => {
        if (cancelado || !p?.timesheet?.length) return;
        setTimesheet(
          enriquecer(p.timesheet.map((r) => ({ ...r, m: r.m || MESES[r.mo - 1] || "" }))),
        );
        if (p.capacidade?.length) setCapacidade(p.capacidade);
        setOrigem("smartsheet");
        setAtualizadoEm(p.atualizadoEm);
      })
      .catch((e) => {
        console.error("Smartsheet indisponível; exibindo os dados embutidos.", e);
      });
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
  }, []);

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
    }),
    [timesheet, capacidade, plano, planoCarregando, hydrated, origem, atualizadoEm],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData precisa estar dentro de <DataProvider>");
  return ctx;
}
