"use client";

import { useEffect, useRef, type DependencyList } from "react";
import Chart, { type ChartConfiguration } from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";

Chart.register(ChartDataLabels);

type Props = {
  /**
   * Monta a configuração do gráfico. Recebe o contexto 2D para permitir
   * gradientes (`ctx.createLinearGradient`), como no dashboard original.
   */
  build: (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ) => ChartConfiguration;
  /** Quando mudam, o gráfico é destruído e recriado. */
  deps?: DependencyList;
  className?: string;
};

/** Canvas do Chart.js com ciclo de vida amarrado ao componente React. */
export default function ChartCanvas({ build, deps = [], className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const chart = new Chart(canvas, buildRef.current(ctx, canvas));
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return <canvas ref={ref} className={className} />;
}
