"use client";

import { useMemo, useState } from "react";

import ChartCanvas from "@/components/charts/ChartCanvas";
import KpiCard from "@/components/KpiCard";
import { INDICADORES } from "@/data";
import {
  IND_GRUPOS,
  IND_GRUPO_COLORS,
  IND_NIVEL_COLORS,
  MES_ABBR,
} from "@/lib/constants";
import { indFmt, indGetStatus, indStatusInfo } from "@/lib/indicadores";
import type { Indicador } from "@/lib/types";

export default function Indicadores() {
  const [fGrupo, setFGrupo] = useState("");
  const [fNivel, setFNivel] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [search, setSearch] = useState("");

  const all = INDICADORES;
  const ativos = all.filter((i) => i.status_ind === "Ativo").length;
  const comDados = all.filter((i) => i.valores.some((v) => v !== null)).length;
  const noAlvo = all.filter((i) => indGetStatus(i) === "ok").length;
  const atencao = all.filter((i) => indGetStatus(i) === "warn").length;

  const filtrados = useMemo(
    () =>
      all.filter((ind) => {
        if (fGrupo && ind.grupo !== fGrupo) return false;
        if (fNivel && ind.nivel !== fNivel) return false;
        if (fStatus && ind.status_ind !== fStatus) return false;
        if (search && !ind.ind.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [all, fGrupo, fNivel, fStatus, search],
  );

  const caInd = all.find((i) => i.id === "ca_alcancado");
  const detInd = all.find((i) => i.id === "tempo_deteccao");
  const resInd = all.find((i) => i.id === "tempo_resolucao_inc");

  function limpar() {
    setFGrupo("");
    setFNivel("");
    setFStatus("");
    setSearch("");
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div className="section-title" style={{ margin: 0, fontSize: 15 }}>
            📊 Indicadores · Diretoria de Operações
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}
          >
            Acompanhamento 2026 · Jan–Abr
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <KpiCard label="Total" value={all.length} sub="indicadores" grad="linear-gradient(90deg,#6C3FFF,#4F8EFF)" />
        <KpiCard label="Ativos" value={ativos} sub="monitorados" grad="linear-gradient(90deg,#00D4A0,#20C0FF)" />
        <KpiCard label="Com Dados" value={comDados} sub="com leituras 2026" grad="linear-gradient(90deg,#4F8EFF,#20C0FF)" />
        <KpiCard label="✅ No Alvo" value={noAlvo} sub="dentro da meta" grad="linear-gradient(90deg,#00D4A0,#20C0FF)" />
        <KpiCard label="🟡 Atenção" value={atencao} sub="abaixo da meta" grad="linear-gradient(90deg,#FF9B00,#FFB020)" />
      </div>

      {/* Resumo por grupo */}
      <div className="section-title" style={{ marginBottom: 12 }}>
        Resumo por Grupo
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {IND_GRUPOS.map((g) => {
          const items = all.filter((i) => i.grupo === g);
          if (!items.length) return null;
          const ok = items.filter((i) => indGetStatus(i) === "ok").length;
          const warn = items.filter((i) => indGetStatus(i) === "warn").length;
          const nd = items.filter((i) => indGetStatus(i) === "nd").length;
          const col = IND_GRUPO_COLORS[g] || "#6C3FFF";
          const pct = Math.round((ok / items.length) * 100);
          return (
            <div
              key={g}
              style={{
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "14px 16px",
                boxShadow: "var(--shadow)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: col, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{g}</span>
                </div>
                <span className="mono" style={{ fontSize: 11, color: col, fontWeight: 600 }}>
                  {items.length} ind.
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 8, background: "rgba(0,200,160,.15)", color: "#00C8A0" }}>
                  ✅ {ok} no alvo
                </span>
                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 8, background: "rgba(255,155,0,.15)", color: "#FF9B00" }}>
                  🟡 {warn} atenção
                </span>
                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 8, background: "var(--bg4)", color: "var(--text3)" }}>
                  ⚪ {nd} s/dados
                </span>
              </div>
              <div style={{ height: 6, background: "var(--bg4)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    width: pct + "%",
                    height: "100%",
                    background: `linear-gradient(90deg,${col}EE,${col}66)`,
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">% CA Alcançado (meta ≥ 70%)</span>
          </div>
          <div style={{ position: "relative", height: 180 }}>
            {caInd && (
              <ChartCanvas
                deps={[caInd.id, caInd.valores]}
                build={(ctx, canvas) => {
                  const labels = MES_ABBR.slice(0, 6);
                  const h = canvas.offsetHeight || 180;
                  const g = ctx.createLinearGradient(0, 0, 0, h);
                  g.addColorStop(0, "#6C3FFF55");
                  g.addColorStop(1, "#6C3FFF00");
                  return {
                    type: "line",
                    data: {
                      labels,
                      datasets: [
                        {
                          label: "% CA Alcançado",
                          data: caInd.valores.slice(0, 6),
                          borderColor: "#6C3FFF",
                          borderWidth: 2.5,
                          pointRadius: 5,
                          pointBackgroundColor: "#6C3FFF",
                          backgroundColor: g,
                          fill: true,
                          tension: 0.35,
                          spanGaps: true,
                        },
                        {
                          label: "Meta 70%",
                          data: labels.map(() => 70),
                          borderColor: "#FF9B00BB",
                          borderWidth: 1.5,
                          borderDash: [6, 4],
                          pointRadius: 0,
                          fill: false,
                          tension: 0,
                        },
                      ],
                    },
                    options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { labels: { color: "#9096B0", font: { size: 10 }, boxWidth: 10 } },
                        datalabels: {
                          color: "#fff",
                          font: { size: 10, weight: 600 },
                          formatter: (v: number | null, c: { datasetIndex: number }) =>
                            c.datasetIndex === 0 && v !== null ? v + "%" : "",
                          anchor: "end",
                          align: "top",
                        },
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: "#9096B0", font: { size: 11 } } },
                        y: {
                          beginAtZero: false,
                          min: 50,
                          max: 100,
                          grid: { color: "rgba(255,255,255,0.04)" },
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
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">SOC/MDR — Tempos Médios</span>
          </div>
          <div style={{ position: "relative", height: 180 }}>
            {detInd && resInd && (
              <ChartCanvas
                deps={[detInd.valores, resInd.valores]}
                build={(ctx, canvas) => {
                  const h = canvas.offsetHeight || 180;
                  const g1 = ctx.createLinearGradient(0, 0, 0, h);
                  g1.addColorStop(0, "#FF5C6AEE");
                  g1.addColorStop(1, "#FF5C6A44");
                  const g2 = ctx.createLinearGradient(0, 0, 0, h);
                  g2.addColorStop(0, "#4F8EFFEE");
                  g2.addColorStop(1, "#4F8EFF44");
                  return {
                    type: "bar",
                    data: {
                      labels: MES_ABBR.slice(0, 4),
                      datasets: [
                        {
                          label: "Detecção (min)",
                          data: detInd.valores.slice(0, 4),
                          backgroundColor: g1,
                          borderRadius: 6,
                          borderSkipped: false,
                          maxBarThickness: 32,
                        },
                        {
                          label: "Resolução (h)",
                          data: resInd.valores.slice(0, 4),
                          backgroundColor: g2,
                          borderRadius: 6,
                          borderSkipped: false,
                          maxBarThickness: 32,
                        },
                      ],
                    },
                    options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { labels: { color: "#9096B0", font: { size: 10 }, boxWidth: 10 } },
                        datalabels: {
                          color: "#fff",
                          font: { size: 10, weight: 600 },
                          formatter: (v: number | null) => (v !== null ? v : ""),
                          anchor: "end",
                          align: "start",
                        },
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: "#9096B0", font: { size: 11 } } },
                        y: {
                          beginAtZero: true,
                          grid: { color: "rgba(255,255,255,0.04)" },
                          ticks: { color: "#9096B0", font: { size: 10 } },
                        },
                      },
                    },
                  };
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
          padding: "10px 14px",
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}
      >
        <select
          className="filter-sel"
          style={{ width: "auto", margin: 0 }}
          value={fGrupo}
          onChange={(e) => setFGrupo(e.target.value)}
        >
          <option value="">Todos os Grupos</option>
          {IND_GRUPOS.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select
          className="filter-sel"
          style={{ width: "auto", margin: 0 }}
          value={fNivel}
          onChange={(e) => setFNivel(e.target.value)}
        >
          <option value="">Todos os Níveis</option>
          <option>Estratégico</option>
          <option>Tático</option>
          <option>Operacional</option>
        </select>
        <select
          className="filter-sel"
          style={{ width: "auto", margin: 0 }}
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
        >
          <option value="">Todos os Status</option>
          <option>Ativo</option>
          <option>Inativo</option>
        </select>
        <input
          className="search-box"
          placeholder="Buscar indicador..."
          style={{ flex: 1, minWidth: 160 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-link" onClick={limpar}>
          ✕ Limpar
        </button>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {filtrados.length === 0 ? (
          <div style={{ color: "var(--text3)", fontSize: 13, padding: 20, gridColumn: "1/-1" }}>
            Nenhum indicador para os filtros selecionados.
          </div>
        ) : (
          filtrados.map((ind) => <IndicadorCard key={ind.id} ind={ind} />)
        )}
      </div>
    </>
  );
}

function IndicadorCard({ ind }: { ind: Indicador }) {
  const st = indGetStatus(ind);
  const si = indStatusInfo(st);
  const nc = IND_NIVEL_COLORS[ind.nivel] || IND_NIVEL_COLORS["Operacional"];
  const gc = IND_GRUPO_COLORS[ind.grupo] || "#6C3FFF";
  const vals = ind.valores;
  const hasData = vals.some((v) => v !== null);
  const lastVal = hasData ? [...vals].reverse().find((v) => v !== null) ?? null : null;

  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ height: 3, background: gc }} />
      <div style={{ padding: "14px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 8,
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", lineHeight: 1.35, flex: 1 }}>
            {ind.ind}
          </div>
          <span
            style={{
              fontSize: 9,
              padding: "2px 7px",
              borderRadius: 10,
              background: si.bg,
              color: si.color,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {si.emoji} {si.label}
          </span>
        </div>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 8, background: nc.bg, color: nc.color }}>
            {ind.nivel}
          </span>
          <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 8, background: gc + "22", color: gc }}>
            {ind.grupo}
          </span>
          <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 8, background: "var(--bg4)", color: "var(--text3)" }}>
            {ind.period}
          </span>
          {ind.status_ind === "Inativo" && (
            <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 8, background: "rgba(255,92,106,.12)", color: "#FF5C6A" }}>
              Inativo
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 9, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 2 }}>
              Último valor
            </div>
            <div
              className="mono"
              style={{ fontSize: 24, fontWeight: 700, color: lastVal !== null ? si.color : "var(--text3)" }}
            >
              {indFmt(ind, lastVal)}
            </div>
          </div>
          {ind.meta_label && ind.meta_label !== "—" && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 2 }}>
                Meta
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>
                {ind.meta_label}
              </div>
            </div>
          )}
        </div>

        {/* Mini tabela mensal */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "8px 0",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            marginBottom: 8,
          }}
        >
          {MES_ABBR.slice(0, 6).map((m, i) => {
            const v = vals[i];
            let cellColor = "var(--text3)";
            if (v !== null && v !== undefined && ind.meta_val !== null) {
              const ok = ind.meta_dir === "max" ? v <= ind.meta_val : v >= ind.meta_val;
              cellColor = ok ? "#00C8A0" : "#FF9B00";
            }
            return (
              <div key={m} style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 8, color: "var(--text3)", marginBottom: 2 }}>{m}</div>
                <div className="mono" style={{ fontSize: 10, fontWeight: 600, color: cellColor }}>
                  {v !== null && v !== undefined ? indFmt(ind, v) : "—"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sparkline */}
        <div style={{ position: "relative", height: 48, marginTop: 4 }}>
          {hasData && (
            <ChartCanvas
              deps={[ind.id, vals]}
              build={(ctx, canvas) => {
                const h = canvas.offsetHeight || 48;
                const g = ctx.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, gc + "55");
                g.addColorStop(1, gc + "00");
                return {
                  type: "line",
                  data: {
                    labels: MES_ABBR.slice(0, 12),
                    datasets: [
                      {
                        data: vals,
                        borderColor: gc,
                        borderWidth: 1.5,
                        pointRadius: 2.5,
                        pointBackgroundColor: gc,
                        backgroundColor: g,
                        fill: true,
                        tension: 0.35,
                        spanGaps: true,
                      },
                    ],
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, datalabels: { display: false } },
                    scales: { x: { display: false }, y: { display: false } },
                    animation: false,
                  },
                };
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
