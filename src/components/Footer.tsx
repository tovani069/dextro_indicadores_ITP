"use client";

import { useEffect, useState } from "react";

export default function Footer() {
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    );
  }, []);

  return (
    <div className="footer">
      <div className="footer-col">
        IT Protect · Dashboard Diretoria de Operações 2026
      </div>
      <div
        className="footer-col center mono"
        style={{ fontSize: 10, color: "var(--text3)" }}
      >
        Plano de Ação · Orçamento · Timesheet
      </div>
      <div className="footer-col right mono" style={{ fontSize: 10 }}>
        {dateStr}
      </div>
    </div>
  );
}
