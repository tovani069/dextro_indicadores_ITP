"use client";

import { useEffect, useRef, useState } from "react";

import { useData, type DatasetKey } from "@/lib/data-context";
import {
  exportOrcamento,
  exportPlano,
  exportTimesheet,
  parseOrcamento,
  parsePlano,
  parseTimesheet,
  readWorkbook,
} from "@/lib/xlsx-io";

const ICONS = {
  imp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  exp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  sav: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <polyline points="3 3 3 8 8 8" />
    </svg>
  ),
};

const TITLES: Record<DatasetKey, string> = {
  timesheet: "Dados · Timesheet",
  plano: "Dados · Plano de Ação",
  orcamento: "Dados · Orçamento",
};

const ACCEPT: Record<DatasetKey, string> = {
  timesheet: ".xlsx,.xls,.csv",
  plano: ".xlsx,.xls,.csv",
  orcamento: ".xlsx,.xls",
};

type Status = "idle" | "loading" | "done" | "error";

type Props = { dataset: DatasetKey; onClose: () => void };

export default function DataMenu({ dataset, onClose }: Props) {
  const data = useData();
  const [status, setStatus] = useState<Status>("idle");
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // dispara a transição de entrada do overlay
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStatus("loading");
    try {
      const wb = await readWorkbook(file);
      if (dataset === "timesheet") {
        const rows = await parseTimesheet(wb);
        if (!rows.length) throw new Error('Nenhum lançamento encontrado. Confira a coluna "Colaborador".');
        data.setTimesheet(rows);
      } else if (dataset === "plano") {
        const rows = await parsePlano(wb);
        if (!rows.length) throw new Error('Nenhuma atividade encontrada. Confira a coluna "Atividade".');
        data.setPlano(rows);
      } else {
        const { records, pessoal } = await parseOrcamento(wb);
        if (!records.length && !pessoal.length) {
          throw new Error(
            'Nenhum dado de orçamento encontrado.\nUse o modelo exportado (abas "Orçamento" e "Pessoal").',
          );
        }
        data.setOrcamento(records, pessoal);
      }
      setStatus("done");
      setTimeout(onClose, 950);
    } catch (err) {
      console.error(err);
      setStatus("error");
      alert("Erro ao importar: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  function onExport() {
    if (dataset === "timesheet") exportTimesheet(data.timesheet);
    else if (dataset === "plano") exportPlano(data.plano);
    else exportOrcamento(data.orcRecords, data.orcPessoal);
    onClose();
  }

  function onRestore() {
    const titulo =
      dataset === "timesheet" ? "Timesheet" : dataset === "plano" ? "Plano de Ação" : "Orçamento";
    if (
      confirm(
        "Restaurar os dados originais de " +
          titulo +
          "?\nIsso descarta os dados importados neste navegador.",
      )
    ) {
      data.restore(dataset);
      onClose();
    }
  }

  return (
    <div
      className={"dm-overlay" + (visible ? " show" : "")}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dm-card">
        <div className="dm-title">{TITLES[dataset]}</div>
        <div className="dm-sub">Escolha uma ação</div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT[dataset]}
          style={{ display: "none" }}
          onChange={onFile}
        />

        <button className="dm-opt" onClick={() => inputRef.current?.click()}>
          {ICONS.imp}
          <span>{dataset === "orcamento" ? "Importar Excel" : "Importar Excel/CSV"}</span>
          <span className="dm-opt-ind">
            {status === "loading" && <div className="dm-spin" />}
            {status === "done" && (
              <svg width="22" height="22" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="22" fill="none" stroke="#00C8A0" strokeWidth="4.5" />
                <path d="M16 27 l7 7 l13 -14" stroke="#00C8A0" fill="none" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {status === "error" && (
              <svg width="22" height="22" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="22" fill="none" stroke="#FF5C6A" strokeWidth="4.5" />
                <path d="M19 19 l14 14 M33 19 l-14 14" stroke="#FF5C6A" fill="none" strokeWidth="4.5" strokeLinecap="round" />
              </svg>
            )}
          </span>
        </button>

        <button className="dm-opt" onClick={onExport}>
          {ICONS.exp}
          <span>Exportar modelo</span>
        </button>

        <button className="dm-opt" onClick={onRestore}>
          {ICONS.sav}
          <span>Restaurar original</span>
        </button>

        <button className="dm-close" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}
