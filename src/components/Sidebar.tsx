"use client";

import { ABAS_CONTROLES, ABAS_INDICADORES } from "@/lib/constants";
import type { SetorId } from "@/lib/types";

type Props = {
  setor: SetorId;
  collapsed: boolean;
  onSelect: (s: SetorId) => void;
  /** Abre a aba Timesheet sozinha em uma nova guia. */
  onCompartilhar: () => void;
};

export default function Sidebar({ setor, collapsed, onSelect, onCompartilhar }: Props) {
  /** O ícone de link só existe na aba do Timesheet, que tem endereço próprio. */
  const aba = (a: { id: SetorId; label: string; dot: string }) => (
    <button
      key={a.id}
      className={"nav-btn" + (setor === a.id ? " active" : "")}
      onClick={() => onSelect(a.id)}
    >
      <div className="nav-dot" style={{ background: a.dot }} />
      <span className="nav-label">{a.label}</span>
      {a.id === "timesheet" && (
        <span
          className="nav-link"
          title="Abrir só esta aba em uma nova guia"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onCompartilhar();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onCompartilhar();
            }
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </span>
      )}
    </button>
  );

  return (
    <div className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="sidebar-nav">
        {ABAS_INDICADORES.map(aba)}
        <div className="nav-sep" />
        {ABAS_CONTROLES.map(aba)}
      </div>
    </div>
  );
}
