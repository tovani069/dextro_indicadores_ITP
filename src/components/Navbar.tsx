"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import { useData } from "@/lib/data-context";

type Props = {
  /** Ausente na página compartilhada, que não tem barra lateral. */
  onToggleSidebar?: () => void;
};

export default function Navbar({ onToggleSidebar }: Props) {
  const { atualizadoEm, carregando, recarregar } = useData();
  const [dateStr, setDateStr] = useState("");

  // A hora da leitura só é conhecida no cliente — evita divergência com o
  // HTML do servidor.
  useEffect(() => {
    const d = atualizadoEm ? new Date(atualizadoEm) : new Date();
    setDateStr(
      d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [atualizadoEm]);

  function toggleTheme() {
    const el = document.documentElement;
    const next = el.getAttribute("data-theme") === "dark" ? "light" : "dark";
    el.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEYS.theme, next);
    } catch {
      /* modo privado: segue sem persistir */
    }
  }

  return (
    <nav className="navbar">
      {onToggleSidebar && (
        <button className="nav-toggle" onClick={onToggleSidebar} aria-label="Menu">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M2 4h14M2 9h14M2 14h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-itp-dark.png" alt="IT Protect" className="nav-logo logo-dark" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-itp-light.png" alt="IT Protect" className="nav-logo logo-white" />

      <div className="nav-divider" />

      <div className="nav-title">
        <span className="nav-title-main">Diretoria de Operações</span>
        <span className="nav-title-sub">DASHBOARD ESTRATÉGICO 2026</span>
      </div>

      <div className="nav-right">
        <span className="nav-date mono">
          {carregando ? "Lendo o Smartsheet…" : dateStr && "Atualizado " + dateStr}
        </span>
        <button
          className="theme-btn"
          onClick={recarregar}
          disabled={carregando}
          title="Ler a planilha agora, ignorando o cache"
        >
          <span className={carregando ? "girando" : undefined} style={{ display: "inline-block" }}>
            ↻
          </span>{" "}
          Atualizar
        </button>
        <button className="theme-btn" onClick={toggleTheme}>
          Tema
        </button>
        <div className="nav-divider" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo_dextro_light.png"
          className="nav-dextro nav-dextro-light"
          alt="Dextro"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo_dextro_dark.png"
          className="nav-dextro nav-dextro-dark"
          alt="Dextro"
        />
      </div>
    </nav>
  );
}
