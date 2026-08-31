"use client";

import { useMemo, useState } from "react";

import type { TSRow } from "@/lib/types";
import {
  NOTA_JORNADA,
  ResumoDias,
  TabelaDias,
  useDiasPreenchimento,
} from "./ColabDias";

type Props = {
  colab: string;
  /** Lançamentos já filtrados — só deste colaborador. */
  linhas: TSRow[];
  /** Período dos filtros (YYYY-MM-DD); vazio = sem limite. */
  periodo?: { de: string; ate: string };
};

/** Dias visíveis enquanto o card está fechado. */
const PREVIA = 3;

/**
 * Planilha de preenchimento que aparece na própria seção quando o recorte
 * está em um único colaborador. Fechada, mostra os últimos dias; a seta abre
 * o restante do período filtrado.
 */
export default function CardDiasColab({ colab, linhas, periodo }: Props) {
  const [aberto, setAberto] = useState(false);
  const { dias, resumo, totaisMes } = useDiasPreenchimento(linhas, periodo);

  // Do mais recente para o mais antigo: fechado, o card responde "o que ele
  // lançou por último" — e um dia útil em branco no topo salta à vista.
  const recentes = useMemo(() => [...dias].reverse(), [dias]);
  const visiveis = aberto ? recentes : recentes.slice(0, PREVIA);
  const restantes = recentes.length - visiveis.length;

  if (!dias.length) return null;

  return (
    <div className="chart-card" style={{ marginBottom: 16 }}>
      <div className="chart-header">
        <span className="chart-title">
          Preenchimento dia a dia
          <span style={{ fontWeight: 400, color: "var(--text3)" }}> · {colab}</span>
        </span>
        <button
          className="btn-link"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          title={aberto ? "Recolher" : `Ver todos os ${recentes.length} dias`}
        >
          {aberto ? "Ver menos" : `Ver todos os ${recentes.length} dias`}
          <span
            style={{
              display: "inline-block",
              marginLeft: 6,
              transition: "transform .25s cubic-bezier(.22,1,.36,1)",
              transform: aberto ? "rotate(180deg)" : "none",
            }}
          >
            ▾
          </span>
        </button>
      </div>

      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ marginBottom: 12 }}>
          <ResumoDias resumo={resumo} compacto />
        </div>

        <TabelaDias dias={visiveis} totaisMes={totaisMes} alturaMax={aberto ? "42vh" : undefined} />

        {!aberto && restantes > 0 && (
          <button
            className="btn-link"
            style={{ marginTop: 8 }}
            onClick={() => setAberto(true)}
          >
            + {restantes} {restantes === 1 ? "dia" : "dias"} no período
          </button>
        )}
        <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 8 }}>{NOTA_JORNADA}</div>
      </div>
    </div>
  );
}
