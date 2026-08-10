"use client";

import { useEffect, useRef, type DependencyList } from "react";
import Chart, { type ChartConfiguration } from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";

Chart.register(ChartDataLabels);

// Mesma linguagem de movimento do resto do dashboard: curto, com saída suave.
Chart.defaults.animation = {
  ...Chart.defaults.animation,
  duration: 480,
  easing: "easeOutQuart",
};
Chart.defaults.transitions.active.animation.duration = 220;

type Props = {
  /**
   * Monta a configuração do gráfico. Recebe o contexto 2D para permitir
   * gradientes (`ctx.createLinearGradient`), como no dashboard original.
   */
  build: (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ) => ChartConfiguration;
  /** Quando mudam, o gráfico recebe os novos dados. */
  deps?: DependencyList;
  className?: string;
};

/**
 * Canvas do Chart.js com ciclo de vida amarrado ao componente React.
 *
 * Quando as dependências mudam, os dados são aplicados ao gráfico existente
 * para que a transição seja animada; só recriamos o gráfico se o tipo mudar.
 */
export default function ChartCanvas({ build, deps = [], className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cfg = buildRef.current(ctx, canvas);
    const atual = chartRef.current;

    // `config` do Chart.js aceita configurações sem `type` no topo, daí a leitura defensiva.
    const tipoAtual = (atual?.config as { type?: string } | undefined)?.type;
    if (atual && tipoAtual === cfg.type) {
      atual.data = cfg.data;
      if (cfg.options) atual.options = cfg.options;
      atual.update();
      return;
    }

    atual?.destroy();
    chartRef.current = new Chart(canvas, cfg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Destrói apenas quando o componente sai da tela.
  useEffect(
    () => () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    },
    [],
  );

  return <canvas ref={ref} className={className} />;
}
