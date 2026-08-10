"use client";

import { useEffect, useMemo, useState } from "react";

import ChartCanvas from "@/components/charts/ChartCanvas";
import { CHARGE_TARGET, MESES, MES_ABBR, TS_CAT_COLORS } from "@/lib/constants";
import {
  chargBg,
  chargColor,
  chargLabel,
  fmtH,
  resumoColaborador,
  rotuloCat,
  stripPrefix,
} from "@/lib/timesheet";
import type { TSRow } from "@/lib/types";

type Props = {
  colab: string;
  /** Lançamentos já filtrados pela barra de filtros da seção. */
  rows: TSRow[];
  onClose: () => void;
};

/** Detalhe do colaborador em destaque, sobre o restante da tela desfocado. */
export default function ColabDetalhe({ colab, rows, onClose }: Props) {
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
    // trava a rolagem do fundo enquanto o detalhe está aberto
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowAnterior;
    };
  }, [onClose]);

  const { linhas, total, billable, nonBillable, chargeability } = useMemo(
    () => resumoColaborador(rows, colab),
    [rows, colab],
  );
  const cor = chargColor(chargeability);

  const time = linhas.find((r) => r.time)?.time;
  const status = linhas.find((r) => r.st)?.st;

  /** Chargeability mês a mês, só nos meses com lançamentos. */
  const meses = useMemo(
    () =>
      MESES.map((mes, i) => {
        const mr = linhas.filter((r) => r.m === mes);
        if (!mr.length) return null;
        const t = mr.reduce((a, r) => a + r.h, 0);
        const b = mr.filter((r) => r.b).reduce((a, r) => a + r.h, 0);
        return { rotulo: MES_ABBR[i], total: t, pct: t > 0 ? Math.round((b / t) * 100) : 0 };
      }).filter((m): m is { rotulo: string; total: number; pct: number } => m !== null),
    [linhas],
  );

  const categorias = useMemo(() => {
    const m: Record<string, number> = {};
    linhas.forEach((r) => (m[r.cat] = (m[r.cat] || 0) + r.h));
    return Object.entries(m)
      .filter(([, h]) => h > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [linhas]);

  const clientes = useMemo(() => {
    const m: Record<string, number> = {};
    linhas.filter((r) => r.b).forEach((r) => (m[r.cl] = (m[r.cl] || 0) + r.h));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [linhas]);

  return (
    <div
      className={"modal-overlay" + (visivel ? " show" : "")}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={"Detalhe de " + colab}
    >
      <div className={"modal-card" + (visivel ? " anim-cartao" : "")}>
        {/* Cabeçalho */}
        <div
          className="modal-topo"
          style={{ background: `linear-gradient(120deg,${cor}22,transparent)` }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: `linear-gradient(135deg,${cor}CC,${cor}55)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {colab[0]}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{colab}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
                {time && (
                  <span className="chip" style={{ background: "rgba(79,142,255,.14)", color: "#4F8EFF" }}>
                    {time}
                  </span>
                )}
                {status && (
                  <span className="chip" style={{ background: "var(--bg4)", color: "var(--text3)" }}>
                    {status}
                  </span>
                )}
                <span className="chip" style={{ background: chargBg(chargeability), color: cor }}>
                  {chargLabel(chargeability)}
                </span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className="mono" style={{ fontSize: 38, fontWeight: 700, color: cor, lineHeight: 1 }}>
              {chargeability}%
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
              chargeability
            </div>
          </div>
          <button className="modal-fechar" onClick={onClose} title="Fechar (Esc)" aria-label="Fechar">
            ×
          </button>
        </div>

        <div style={{ padding: "18px 22px 22px" }}>
          {/* Números */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
              gap: 10,
              marginBottom: 18,
            }}
          >
            {[
              { rotulo: "Horas totais", valor: fmtH(total), cor: "var(--text)" },
              { rotulo: "Billable", valor: fmtH(billable), cor: "#00C8A0" },
              { rotulo: "Non-billable", valor: fmtH(nonBillable), cor: "#FF5C6A" },
              { rotulo: "Lançamentos", valor: linhas.length.toLocaleString("pt-BR"), cor: "var(--text2)" },
            ].map((k) => (
              <div
                key={k.rotulo}
                style={{
                  background: "var(--bg3)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 14px",
                }}
              >
                <div className="kpi-label">{k.rotulo}</div>
                <div className="mono" style={{ fontSize: 19, fontWeight: 600, color: k.cor }}>
                  {k.valor}
                </div>
              </div>
            ))}
          </div>

          {/* Barra de chargeability com a marca da meta */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10,
              color: "var(--text3)",
              marginBottom: 5,
            }}
          >
            <span>Chargeability</span>
            <span className="mono">Meta: {CHARGE_TARGET}%</span>
          </div>
          <div
            style={{
              height: 10,
              background: "var(--bg4)",
              borderRadius: 5,
              overflow: "hidden",
              position: "relative",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: Math.max(chargeability, 2) + "%",
                height: "100%",
                borderRadius: 5,
                background: `linear-gradient(90deg,${cor}EE,${cor}88)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: CHARGE_TARGET + "%",
                width: 2,
                height: "100%",
                background: "#FF9B00BB",
              }}
            />
          </div>

          {/* Evolução mensal */}
          {meses.length > 1 && (
            <>
              <div className="modal-secao">Evolução mensal</div>
              <div style={{ position: "relative", height: 170, marginBottom: 20 }}>
                <ChartCanvas
                  deps={[meses]}
                  build={(ctx, canvas) => {
                    const h = canvas.offsetHeight || 170;
                    const g = ctx.createLinearGradient(0, 0, 0, h);
                    g.addColorStop(0, cor + "55");
                    g.addColorStop(1, cor + "00");
                    return {
                      type: "line",
                      data: {
                        labels: meses.map((m) => m.rotulo),
                        datasets: [
                          {
                            label: "Chargeability",
                            data: meses.map((m) => m.pct),
                            borderColor: cor,
                            borderWidth: 2.5,
                            pointRadius: 4,
                            pointBackgroundColor: cor,
                            backgroundColor: g,
                            fill: true,
                            tension: 0.35,
                          },
                          {
                            label: `Meta ${CHARGE_TARGET}%`,
                            data: meses.map(() => CHARGE_TARGET),
                            borderColor: "#FF9B00BB",
                            borderWidth: 1.5,
                            borderDash: [6, 4],
                            pointRadius: 0,
                            fill: false,
                          },
                        ],
                      },
                      options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { labels: { color: "#9096B0", font: { size: 10 }, boxWidth: 10 } },
                          datalabels: {
                            color: "#9096B0",
                            font: { size: 10, weight: 600 },
                            align: "top",
                            formatter: (v: number, c: { datasetIndex: number }) =>
                              c.datasetIndex === 0 ? v + "%" : "",
                          },
                          tooltip: {
                            callbacks: {
                              afterBody: (items: { dataIndex: number }[]) =>
                                "  " + fmtH(meses[items[0].dataIndex].total) + " no mês",
                            },
                          },
                        },
                        scales: {
                          x: { grid: { display: false }, ticks: { color: "#9096B0", font: { size: 11 } } },
                          y: {
                            beginAtZero: true,
                            max: 100,
                            grid: { color: "rgba(128,136,176,0.12)" },
                            ticks: {
                              color: "#9096B0",
                              font: { size: 10 },
                              callback: (v: string | number) => v + "%",
                            },
                          },
                        },
                      },
                    };
                  }}
                />
              </div>
            </>
          )}

          {/* Categorias e clientes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div className="modal-secao">Por categoria</div>
              {categorias.map(([cat, h]) => {
                const cc = TS_CAT_COLORS[cat] || "#6C3FFF";
                const pct = total > 0 ? Math.round((h / total) * 100) : 0;
                return (
                  <div key={cat} style={{ marginBottom: 9 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: "var(--text2)",
                        marginBottom: 3,
                      }}
                    >
                      <span>{rotuloCat(cat)}</span>
                      <span className="mono" style={{ color: cc }}>
                        {fmtH(h)} · {pct}%
                      </span>
                    </div>
                    <div style={{ height: 5, background: "var(--bg4)", borderRadius: 3 }}>
                      <div
                        style={{ width: pct + "%", height: "100%", background: cc, borderRadius: 3 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <div className="modal-secao">
                Clientes billable
                <span style={{ color: "var(--text3)", fontWeight: 400 }}> · {clientes.length}</span>
              </div>
              <div style={{ maxHeight: 240, overflowY: "auto", paddingRight: 4 }}>
                {clientes.length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>
                    Nenhuma hora faturável no recorte atual.
                  </div>
                )}
                {clientes.map(([cl, h]) => {
                  const pct = billable > 0 ? Math.round((h / billable) * 100) : 0;
                  return (
                    <div
                      key={cl}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 11,
                        color: "var(--text2)",
                        padding: "5px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {stripPrefix(cl)}
                      </span>
                      <span className="mono" style={{ color: "var(--text3)", fontSize: 10 }}>
                        {pct}%
                      </span>
                      <span className="mono" style={{ color: "var(--text)", minWidth: 46, textAlign: "right" }}>
                        {fmtH(h)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
