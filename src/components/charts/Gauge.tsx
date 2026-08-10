"use client";

import type { ArcElement } from "chart.js";

import ChartCanvas from "./ChartCanvas";

type Props = {
  /** Valor em percentual (0-100). */
  value: number;
  /** Cor do arco preenchido. */
  color?: string;
  /** Altura do medidor em px. */
  height?: number;
};

/**
 * Medidor semicircular com o percentual escrito no centro.
 * O número é lido do arco desenhado, então acompanha a animação quando o
 * valor muda por conta de um filtro.
 */
export default function Gauge({ value, color = "#4F8EFF", height = 74 }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ position: "relative", height }}>
      <ChartCanvas
        deps={[pct, color]}
        build={() => ({
          type: "doughnut",
          data: {
            labels: ["", ""],
            datasets: [
              {
                data: [pct, 100 - pct],
                backgroundColor: [color, "rgba(128,136,176,0.18)"],
                borderWidth: 0,
                circumference: 180,
                rotation: 270,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            events: [],
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false },
              datalabels: { display: false },
            },
          },
          plugins: [
            {
              id: "gauge-texto",
              afterDraw(chart) {
                const area = chart.chartArea;
                if (!area) return;

                // Percentual e cor saem do gráfico, não de um valor capturado:
                // assim o texto acompanha a transição do arco.
                const dataset = chart.data.datasets[0];
                const arco = chart.getDatasetMeta(0)?.data?.[0] as ArcElement | undefined;
                const alvo = Number((dataset.data as number[])[0]) || 0;
                const atual =
                  arco && typeof arco.circumference === "number"
                    ? Math.max(0, Math.min(100, (arco.circumference / Math.PI) * 100))
                    : alvo;
                const cores = dataset.backgroundColor as string[];
                const cor = Array.isArray(cores) ? cores[0] : color;

                const ctx = chart.ctx;
                const cx = (area.left + area.right) / 2;
                const cy = area.bottom;
                ctx.save();
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillStyle = cor;
                ctx.font = "600 17px 'IBM Plex Mono', monospace";
                ctx.fillText(atual.toFixed(2).replace(".", ",") + "%", cx, cy);
                ctx.restore();
              },
            },
          ],
        })}
      />
    </div>
  );
}
