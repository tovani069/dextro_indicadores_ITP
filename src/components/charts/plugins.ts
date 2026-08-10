import type { Plugin } from "chart.js";

/**
 * Linha vertical no ponto sob o cursor, como a régua de rastreio do Power BI.
 * Lê os elementos ativos do tooltip, então acompanha o modo de interação do
 * gráfico (use `interaction: { mode: "index", intersect: false }`).
 */
export const linhaVertical: Plugin = {
  id: "linha-vertical",
  afterDraw(chart) {
    const ativos = chart.tooltip?.getActiveElements?.() ?? [];
    if (!ativos.length || !chart.chartArea) return;
    const x = ativos[0].element.x;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(128,136,176,0.55)";
    ctx.stroke();
    ctx.restore();
  },
};
