"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useData } from "@/lib/data-context";

type Props = { onClose: () => void };

/**
 * Gera um link público que abre somente a aba Timesheet, opcionalmente já
 * filtrada por um time — é o que se manda para cada diretor avaliar a equipe
 * dele sem ver as demais seções do dashboard.
 */
export default function CompartilharTimesheet({ onClose }: Props) {
  const { timesheet } = useData();
  const [time, setTime] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisivel(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const times = useMemo(
    () => [...new Set(timesheet.map((r) => r.time).filter(Boolean))].sort() as string[],
    [timesheet],
  );

  const link = useMemo(() => {
    const base =
      typeof window === "undefined" ? "" : window.location.origin + "/timesheet";
    return time ? `${base}?time=${encodeURIComponent(time)}` : base;
  }, [time]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Sem permissão de área de transferência: seleciona para copiar à mão.
      const campo = document.getElementById("link-timesheet") as HTMLInputElement | null;
      campo?.select();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
  }

  const conteudo = (
    <div
      className={"modal-overlay" + (visivel ? " show" : "")}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Compartilhar Timesheet"
    >
      <div
        className={"modal-card" + (visivel ? " anim-cartao" : "")}
        style={{ width: "min(94vw,520px)" }}
      >
        <div className="modal-topo" style={{ paddingBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
              Compartilhar Timesheet
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 4 }}>
              Quem abrir o link vê apenas esta aba, sem as demais seções.
            </div>
          </div>
          <button className="modal-fechar" onClick={onClose} title="Fechar (Esc)" aria-label="Fechar">
            ×
          </button>
        </div>

        <div style={{ padding: "18px 22px 22px" }}>
          <div className="modal-secao">Recorte</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
            <button
              className={"line-sel-btn" + (time === "" ? " active" : "")}
              onClick={() => setTime("")}
            >
              Todos os times
            </button>
            {times.map((t) => (
              <button
                key={t}
                className={"line-sel-btn" + (time === t ? " active" : "")}
                onClick={() => setTime(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="modal-secao">Link</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="link-timesheet"
              className="search-box"
              style={{ flex: 1, width: "auto" }}
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button className="btn-copiar" onClick={copiar}>
              {copiado ? "✓ Copiado" : "Copiar"}
            </button>
          </div>

          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              marginTop: 14,
              fontSize: 11.5,
              color: "var(--text3)",
              textDecoration: "underline",
            }}
          >
            Abrir em uma nova aba para conferir
          </a>
        </div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(conteudo, document.body);
}
