"use client";

import { Fragment } from "react";
import { SECTIONS } from "@/lib/constants";
import type { SetorId } from "@/lib/types";

type Props = {
  setor: SetorId;
  collapsed: boolean;
  onSelect: (s: SetorId) => void;
  /** Abre o gerador de link da aba Timesheet. */
  onCompartilhar: () => void;
};

export default function Sidebar({ setor, collapsed, onSelect, onCompartilhar }: Props) {
  return (
    <div className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="sidebar-nav">
        {SECTIONS.map((sec, i) => (
          <Fragment key={sec.id}>
            {i > 0 && <div className="nav-sep" />}
            <button
              className={"nav-btn" + (setor === sec.id ? " active" : "")}
              onClick={() => onSelect(sec.id)}
            >
              <div className="nav-dot" style={{ background: sec.dot }} />
              <span className="nav-label">
                {sec.icon} {sec.label}
              </span>
              {sec.id === "timesheet" && (
                <span
                  className="nav-link"
                  title="Gerar link só desta aba"
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
          </Fragment>
        ))}
      </div>
    </div>
  );
}
