"use client";

import { useRef } from "react";

import ChartCanvas from "./ChartCanvas";

export type RankItem = {
  /** Valor usado no filtro ao clicar na barra. */
  value: string;
  /** Rótulo exibido no eixo. */
  label: string;
  total: number;
};

type Props = {
  title: string;
  items: RankItem[];
  color?: string;
  /** Sufixo do valor no rótulo da barra (ex.: "h"). */
  suffix?: string;
  /** Altura da área visível; a lista rola dentro dela, como no relatório do BI. */
  viewHeight?: number;
  /** Clique na barra — usado para o cross-filter entre os visuais. */
  onPick?: (value: string) => void;
  /** Valores atualmente filtrados (ficam destacados). */
  selected?: string[];
};

const LINHA_PX = 26;

/**
 * Barras horizontais ordenadas do maior para o menor, com rolagem vertical
 * quando há mais itens do que cabe e clique para filtrar.
 */
export default function RankBars({
  title,
  items,
  color = "#4F8EFF",
  suffix = "h",
  viewHeight = 232,
  onPick,
  selected = [],
}: Props) {
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  const ordenados = [...items].sort((a, b) => b.total - a.total);
  const alturaInterna = Math.max(viewHeight - 32, ordenados.length * LINHA_PX);
  const temSelecao = selected.length > 0;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-title">{title}</span>
        {temSelecao && (
          <span className="mono" style={{ fontSize: 9, color: "var(--text3)" }}>
            {selected.length} filtrado{selected.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div style={{ height: viewHeight, overflowY: "auto", overflowX: "hidden" }}>
        <div style={{ height: alturaInterna, position: "relative" }}>
          <ChartCanvas
            deps={[ordenados.map((i) => i.value + ":" + i.total).join("|"), selected.join("|"), color]}
            build={() => ({
              type: "bar",
              data: {
                labels: ordenados.map((i) => i.label),
                datasets: [
                  {
                    data: ordenados.map((i) => Math.round(i.total)),
                    backgroundColor: ordenados.map((i) =>
                      !temSelecao || selected.includes(i.value) ? color : color + "33",
                    ),
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 18,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                layout: { padding: { right: 42 } },
                // Clicar em qualquer ponto da faixa seleciona a barra, como no relatório.
                interaction: { mode: "index", intersect: false },
                onClick: (_e, els) => {
                  const i = els[0]?.index;
                  if (i !== undefined && pickRef.current) pickRef.current(ordenados[i].value);
                },
                onHover: (e, els) => {
                  const alvo = e.native?.target as HTMLElement | undefined;
                  if (alvo) alvo.style.cursor = els.length && pickRef.current ? "pointer" : "default";
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (c: { parsed: { x: number | null } }) =>
                        " " + Math.round(c.parsed.x ?? 0).toLocaleString("pt-BR") + suffix,
                    },
                  },
                  datalabels: {
                    color: "#9096B0",
                    font: { size: 9 },
                    anchor: "end",
                    align: "end",
                    formatter: (v: number) => v.toLocaleString("pt-BR") + suffix,
                  },
                },
                scales: {
                  x: { display: false, beginAtZero: true },
                  y: { grid: { display: false }, ticks: { color: "#9096B0", font: { size: 10 } } },
                },
              },
            })}
          />
        </div>
      </div>
    </div>
  );
}
