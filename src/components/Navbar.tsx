"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/constants";

type Props = { onToggleSidebar: () => void };

export default function Navbar({ onToggleSidebar }: Props) {
  const [dateStr, setDateStr] = useState("");

  // A data só é conhecida no cliente — evita divergência com o HTML do servidor.
  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    );
  }, []);

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
    <div className="navbar">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-itp-dark.png"
        alt="IT Protect"
        className="logo-dark"
        style={{ height: 40, objectFit: "contain" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-itp-light.png"
        alt="IT Protect"
        className="logo-white"
        style={{ height: 40, objectFit: "contain" }}
      />
      <div className="nav-divider" />
      <div>
        <div className="nav-title">Diretoria de Operações</div>
        <div className="nav-sub">Dashboard Estratégico 2026</div>
      </div>
      <div className="nav-right">
        <div className="nav-date mono">{dateStr}</div>
        <button className="btn-icon" onClick={toggleTheme} title="Alternar tema">
          🌓
        </button>
        <button className="btn-icon" onClick={onToggleSidebar} title="Sidebar">
          ☰
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
    </div>
  );
}
