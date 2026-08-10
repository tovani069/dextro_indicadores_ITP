"use client";

import type { CSSProperties, ReactNode } from "react";

import { useValorAnimado } from "@/lib/animacao";

type Props = {
  label: ReactNode;
  /** Valor pronto para exibição. Ignorado quando `numero` é informado. */
  value?: ReactNode;
  /** Valor numérico; a exibição é interpolada até ele quando os filtros mudam. */
  numero?: number;
  /** Formatação aplicada ao valor interpolado. */
  formatar?: (n: number) => string;
  sub?: ReactNode;
  /** Gradiente da faixa superior do card. */
  grad: string;
  valueColor?: string;
  valueStyle?: CSSProperties;
};

/** Card de KPI padrão do dashboard (faixa colorida + rótulo + valor). */
export default function KpiCard({
  label,
  value,
  numero,
  formatar,
  sub,
  grad,
  valueColor,
  valueStyle,
}: Props) {
  const animado = useValorAnimado(numero ?? 0);
  const conteudo =
    numero !== undefined && formatar ? formatar(animado) : value;
  // Valores não numéricos trocam com um fade curto em vez de saltar.
  const chave =
    numero === undefined && (typeof value === "string" || typeof value === "number")
      ? String(value)
      : undefined;

  return (
    <div className="kpi-card">
      <div className="kpi-accent" style={{ background: grad }} />
      <div className="kpi-body">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value mono" style={{ color: valueColor, ...valueStyle }}>
          <span key={chave} className={chave ? "anim-surge" : undefined}>
            {conteudo}
          </span>
        </div>
        {sub !== undefined && <div className="kpi-sub mono">{sub}</div>}
      </div>
    </div>
  );
}
