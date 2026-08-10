import type { CSSProperties, ReactNode } from "react";

type Props = {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  /** Gradiente da faixa superior do card. */
  grad: string;
  valueColor?: string;
  valueStyle?: CSSProperties;
};

/** Card de KPI padrão do dashboard (faixa colorida + rótulo + valor). */
export default function KpiCard({ label, value, sub, grad, valueColor, valueStyle }: Props) {
  return (
    <div className="kpi-card">
      <div className="kpi-accent" style={{ background: grad }} />
      <div className="kpi-body">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value mono" style={{ color: valueColor, ...valueStyle }}>
          {value}
        </div>
        {sub !== undefined && <div className="kpi-sub mono">{sub}</div>}
      </div>
    </div>
  );
}
