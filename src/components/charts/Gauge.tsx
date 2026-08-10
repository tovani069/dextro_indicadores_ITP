"use client";

import ChartCanvas from "./ChartCanvas";

type Props = {
  /** Valor em percentual (0-100). */
  value: number;
  /** Cor do arco preenchido. */
  color?: string;
  /** Altura do medidor em px. */
  height?: number;
};

/** Medidor semicircular com o percentual escrito no centro (padrão do relatório do BI). */
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
            plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } },
          },
          plugins: [
            {
              id: "gauge-texto",
              afterDraw(chart) {
                const area = chart.chartArea;
                if (!area) return;
                const ctx = chart.ctx;
                const cx = (area.left + area.right) / 2;
                const cy = area.bottom;
                ctx.save();
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillStyle = color;
                ctx.font = "600 17px 'IBM Plex Mono', monospace";
                ctx.fillText(pct.toFixed(2).replace(".", ",") + "%", cx, cy);
                ctx.restore();
              },
            },
          ],
        })}
      />
    </div>
  );
}
