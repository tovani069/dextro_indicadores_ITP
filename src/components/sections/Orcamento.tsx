"use client";

import { useMemo, useState } from "react";

import ChartCanvas from "@/components/charts/ChartCanvas";
import { linhaVertical } from "@/components/charts/plugins";
import FilterDropdown from "@/components/FilterDropdown";
import FiltrosAtivos, { type Pill } from "@/components/FiltrosAtivos";
import KpiCard from "@/components/KpiCard";
import {
  MES_ABBR,
  ORC_CAT_COLORS,
  ORC_MES_ATUAL_IDX,
  ORC_PCT_EXEC,
  ORC_PROJ_COLORS,
  ORC_REPACTUACOES,
} from "@/lib/constants";
import { useData } from "@/lib/data-context";
import { fmtBRL, fmtBRLCompact } from "@/lib/format";
import type { OrcRecord } from "@/lib/types";

type SortCol = keyof Pick<
  OrcRecord,
  "grupo" | "desc" | "proj" | "bud_inicial" | "bud" | "exec_total" | "variacao" | "pct"
>;

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "ok", label: "✅ Dentro do orçamento" },
  { value: "acima", label: "🔴 Acima do orçamento" },
  { value: "zerado", label: "⚪ Sem execução" },
];

/** Percentual de execução de uma linha (0-100). */
function pctExec(r: OrcRecord) {
  return r.bud > 0 ? Math.round((r.exec_total / r.bud) * 100) : 0;
}

function pctColor(pct: number) {
  return pct > 100 ? "#FF5C6A" : pct > 0 ? "#00C8A0" : "#8890B0";
}

export default function Orcamento() {
  const { orcRecords, orcPessoal } = useData();
  const [cats, setCats] = useState<string[]>([]);
  const [projs, setProjs] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [selMes, setSelMes] = useState("");
  const [lineMensal, setLineMensal] = useState(false);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("bud");
  const [sortDir, setSortDir] = useState(-1);

  const allCats = useMemo(
    () => [...new Set(orcRecords.map((r) => r.grupo))].sort(),
    [orcRecords],
  );
  const allProjs = useMemo(
    () => [...new Set(orcRecords.map((r) => r.proj).filter(Boolean))].sort(),
    [orcRecords],
  );

  const rows = useMemo(
    () =>
      orcRecords.filter((r) => {
        if (cats.length && !cats.includes(r.grupo)) return false;
        if (projs.length && !projs.includes(r.proj)) return false;
        if (status === "acima" && r.pct <= 100) return false;
        if (status === "zerado" && r.exec_total > 0) return false;
        if (status === "ok" && (r.pct === 0 || r.pct > 100)) return false;
        return true;
      }),
    [orcRecords, cats, projs, status],
  );

  // ── KPIs ────────────────────────────────────────────────────────────
  const budAtual = rows.reduce((a, r) => a + r.bud, 0);
  const budInicial = rows.reduce(
    (a, r) => a + (r.bud_inicial !== undefined ? r.bud_inicial : r.bud),
    0,
  );
  const execTotal = rows.reduce((a, r) => a + r.exec_total, 0);
  const disponivel = budAtual - execTotal;
  const MESES_FUT = ["Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const previsto = rows.reduce(
    (a, r) => a + MESES_FUT.reduce((s, m) => s + (r.plan_mes?.[m] ?? 0), 0),
    0,
  );
  const supl = budAtual - budInicial;
  const pctKpi = budAtual > 0 ? ((execTotal / budAtual) * 100).toFixed(1) : "0.0";
  const suplIsNeg = supl < 0;
  const suplLabel = suplIsNeg ? "Contingenciamento" : supl > 0 ? "Suplementação" : "Sem alteração";
  const suplPct = budInicial > 0 ? Math.abs((supl / budInicial) * 100).toFixed(1) : "0.0";

  // ── Tabela detalhada ────────────────────────────────────────────────
  const tableData = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q
      ? rows.filter((r) => (r.desc + r.conta + r.grupo).toLowerCase().includes(q))
      : rows;
    return [...filtered].sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      return typeof va === "string"
        ? va.localeCompare(String(vb)) * sortDir
        : ((va as number) - (vb as number)) * sortDir;
    });
  }, [rows, search, sortCol, sortDir]);

  function sortBy(col: SortCol) {
    if (sortCol === col) setSortDir((d) => d * -1);
    else {
      setSortCol(col);
      setSortDir(-1);
    }
  }

  function toggleCat(v: string) {
    setCats((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }
  function toggleProj(v: string) {
    setProjs((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }
  function limpar() {
    setCats([]);
    setProjs([]);
    setStatus("");
  }

  const pills: Pill[] = [
    ...cats.map((c) => ({ grupo: "cats", rotulo: "Cat", valor: c, texto: c })),
    ...projs.map((p) => ({ grupo: "projs", rotulo: "Projeto", valor: p, texto: p })),
  ];
  if (status) {
    pills.push({
      grupo: "status",
      rotulo: "Status",
      valor: status,
      texto: STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
    });
  }
  function removePill(grupo: string, valor: string) {
    if (grupo === "cats") toggleCat(valor);
    else if (grupo === "projs") toggleProj(valor);
    else setStatus("");
  }

  // ── Séries dos gráficos ─────────────────────────────────────────────
  const execMes = MES_ABBR.map((m) => rows.reduce((a, r) => a + (r.exec[m] || 0), 0));
  const budMes = MES_ABBR.map((m) =>
    Math.round(rows.reduce((a, r) => a + (r.plan_mes?.[m] ?? r.bud / 12), 0)),
  );

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
            💰 Controle Orçamentário · Diretoria de Operações
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
            Budget 2026 · Acompanhamento Mensal · Delivery (ST + SOC + Serv. Profissionais)
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
        <FilterDropdown
          label="Categoria"
          options={allCats.map((c) => ({
            value: c,
            label: c,
            color: ORC_CAT_COLORS[c] || "#6C3FFF",
          }))}
          selected={cats}
          onToggle={toggleCat}
        />
        <FilterDropdown
          label="Projeto"
          options={allProjs.map((p) => ({ value: p, label: p }))}
          selected={projs}
          onToggle={toggleProj}
        />
        <FilterDropdown
          label="Status"
          mode="single"
          options={STATUS_OPTIONS}
          selected={status ? [status] : []}
          onToggle={(v) => setStatus(v)}
        />
        <div style={{ width: 1, height: 24, background: "var(--border2)", margin: "0 2px" }} />
        <button className="btn-link" onClick={limpar}>
          ✕ Limpar
        </button>
        <FiltrosAtivos pills={pills} onRemove={removePill} />
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6,1fr)",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <KpiCard
          label="Orçamento Inicial"
          value={fmtBRLCompact(budInicial)}
          sub="Delivery (v.1)"
          grad="linear-gradient(90deg,#6C3FFF,#4F8EFF)"
          valueStyle={{ fontSize: 13 }}
        />
        <KpiCard
          label={suplLabel}
          value={fmtBRLCompact(supl)}
          sub={(suplIsNeg ? "▼ " : "▲ ") + suplPct + "% do orçamento inicial"}
          grad={
            suplIsNeg
              ? "linear-gradient(90deg,#FF5C6A,#FF8C00)"
              : "linear-gradient(90deg,#FF9B00,#FFB020)"
          }
          valueColor={suplIsNeg ? "#FF5C6A" : "#FF9B00"}
          valueStyle={{ fontSize: 13 }}
        />
        <KpiCard
          label="Executado"
          value={fmtBRLCompact(execTotal)}
          sub={pctKpi + "% do orçamento atual"}
          grad="linear-gradient(90deg,#4F8EFF,#20C0FF)"
          valueStyle={{ fontSize: 13 }}
        />
        <KpiCard
          label="Disponível"
          value={fmtBRLCompact(disponivel)}
          sub="saldo a comprometer"
          grad="linear-gradient(90deg,#00D4A0,#20C0FF)"
          valueStyle={{ fontSize: 13 }}
        />
        <KpiCard
          label="Previsto a Executar"
          value={fmtBRLCompact(previsto)}
          sub="Jul–Dez · planejado v.3"
          grad="linear-gradient(90deg,#FF5C6A,#FF9B00)"
          valueStyle={{ fontSize: 13 }}
        />
        <KpiCard
          label="Repactuações"
          value={ORC_REPACTUACOES + "x"}
          sub="versões do orçamento"
          grad="linear-gradient(90deg,#6C3FFF,#FF40A0)"
          valueStyle={{ fontSize: 13 }}
        />
      </div>

      {/* Execução global */}
      <div
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "14px 18px",
          marginBottom: 16,
          boxShadow: "var(--shadow)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>
            Execução Global do Budget 2026 · Diretoria de Operações
          </span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
            {ORC_PCT_EXEC}%
          </span>
        </div>
        <div style={{ height: 10, background: "var(--bg4)", borderRadius: 5, overflow: "hidden" }}>
          <div
            style={{
              width: ORC_PCT_EXEC + "%",
              height: "100%",
              borderRadius: 5,
              background: "linear-gradient(90deg,#6C3FFFEE,#4F8EFF88)",
              transition: "width .6s",
            }}
          />
        </div>
      </div>

      {/* Planejado × Realizado × Projetado */}
      <div style={{ marginBottom: 16 }}>
        <div className="chart-card">
          <div className="chart-header" style={{ flexWrap: "wrap", gap: 8 }}>
            <span className="chart-title">
              📈 Budget Acumulado: Planejado × Realizado × Projetado
            </span>
            <label
              style={{
                fontSize: 9,
                color: "var(--text3)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={lineMensal}
                onChange={(e) => setLineMensal(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              Ver mensal
            </label>
          </div>
          <div style={{ position: "relative", height: 220 }}>
            <ChartCanvas
              deps={[rows, lineMensal]}
              build={(ctx, canvas) => {
                const h = canvas.offsetHeight || 240;
                let ae = 0;
                let ab = 0;
                const acumExec = execMes.map((v) => {
                  ae += v;
                  return Math.round(ae);
                });
                const acumBud = budMes.map((v) => {
                  ab += v;
                  return Math.round(ab);
                });
                const mediaReal =
                  execMes.slice(0, ORC_MES_ATUAL_IDX + 1).reduce((a, v) => a + v, 0) /
                  (ORC_MES_ATUAL_IDX + 1);
                const acumProj = MES_ABBR.map((_, i) => {
                  if (i < ORC_MES_ATUAL_IDX) return null;
                  if (i === ORC_MES_ATUAL_IDX) return acumExec[ORC_MES_ATUAL_IDX];
                  return Math.round(acumExec[ORC_MES_ATUAL_IDX] + mediaReal * (i - ORC_MES_ATUAL_IDX));
                });
                const mesProj = MES_ABBR.map((_, i) =>
                  i <= ORC_MES_ATUAL_IDX ? null : Math.round(mediaReal),
                );

                const yScale = {
                  beginAtZero: true,
                  grid: { color: "rgba(255,255,255,0.04)" },
                  ticks: {
                    color: "#9096B0",
                    font: { size: 10 },
                    callback: (v: string | number) =>
                      Number(v) >= 1000 ? "R$" + Math.round(Number(v) / 1000) + "k" : "R$" + v,
                  },
                };
                const xScale = {
                  grid: { display: false },
                  ticks: { color: "#9096B0", font: { size: 11 } },
                };

                if (!lineMensal) {
                  const gReal = ctx.createLinearGradient(0, 0, 0, h);
                  gReal.addColorStop(0, "rgba(0,200,160,0.35)");
                  gReal.addColorStop(1, "rgba(0,200,160,0)");
                  const gPlan = ctx.createLinearGradient(0, 0, 0, h);
                  gPlan.addColorStop(0, "rgba(108,63,255,0.2)");
                  gPlan.addColorStop(1, "rgba(108,63,255,0)");
                  const gProj = ctx.createLinearGradient(0, 0, 0, h);
                  gProj.addColorStop(0, "rgba(255,155,0,0.2)");
                  gProj.addColorStop(1, "rgba(255,155,0,0)");
                  return {
                    type: "line",
                    data: {
                      labels: MES_ABBR,
                      datasets: [
                        {
                          label: "Planejado acum.",
                          data: acumBud,
                          borderColor: "#6C3FFF",
                          borderWidth: 2,
                          pointRadius: 3,
                          pointBackgroundColor: "#6C3FFF",
                          backgroundColor: gPlan,
                          fill: true,
                          tension: 0.3,
                          spanGaps: true,
                        },
                        {
                          label: "Realizado acum.",
                          data: acumExec,
                          borderColor: "#00C8A0",
                          borderWidth: 2.5,
                          pointRadius: 4,
                          pointBackgroundColor: "#00C8A0",
                          backgroundColor: gReal,
                          fill: true,
                          tension: 0.3,
                          spanGaps: true,
                        },
                        {
                          label: "Projetado acum.",
                          data: acumProj,
                          borderColor: "#FF9B00",
                          borderWidth: 2,
                          borderDash: [6, 4],
                          pointRadius: 4,
                          pointBackgroundColor: "#FF9B00",
                          backgroundColor: gProj,
                          fill: true,
                          tension: 0.3,
                          spanGaps: false,
                        },
                      ],
                    },
                    plugins: [linhaVertical],
                    options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: { mode: "index", intersect: false },
                      plugins: {
                        legend: { display: false },
                        datalabels: { display: false },
                        tooltip: {
                          mode: "index",
                          intersect: false,
                          callbacks: {
                            label: (c: { dataset: { label?: string }; parsed: { y: number | null } }) =>
                              "  " +
                              c.dataset.label +
                              ": R$ " +
                              Math.round(c.parsed.y ?? 0).toLocaleString("pt-BR"),
                            afterBody: (
                              items: { datasetIndex: number; parsed: { y: number | null } }[],
                            ) => {
                              const planVal = items.find((i) => i.datasetIndex === 0)?.parsed.y;
                              const realVal = items.find((i) => i.datasetIndex === 1)?.parsed.y;
                              if (planVal && realVal) {
                                return [
                                  "─────────────────────",
                                  "  Exec. vs Plan: " + Math.round((realVal / planVal) * 100) + "%",
                                ];
                              }
                              return [];
                            },
                          },
                        },
                      },
                      scales: { x: xScale, y: yScale },
                    },
                  };
                }

                return {
                  type: "bar",
                  data: {
                    labels: MES_ABBR,
                    datasets: [
                      {
                        label: "Budget/mês",
                        data: budMes,
                        backgroundColor: "rgba(108,63,255,0.35)",
                        borderRadius: 4,
                        maxBarThickness: 28,
                        order: 3,
                      },
                      {
                        label: "Realizado",
                        data: execMes.map((v, i) => (i <= ORC_MES_ATUAL_IDX ? v : null)),
                        backgroundColor: "rgba(0,200,160,0.85)",
                        borderRadius: 4,
                        maxBarThickness: 28,
                        order: 2,
                      },
                      {
                        label: "Projetado",
                        data: mesProj,
                        backgroundColor: "rgba(255,155,0,0.6)",
                        borderRadius: 4,
                        maxBarThickness: 28,
                        order: 1,
                      },
                    ],
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { labels: { color: "#9096B0", font: { size: 10 }, boxWidth: 10 } },
                      datalabels: { display: false },
                      tooltip: {
                        mode: "index",
                        intersect: false,
                        callbacks: {
                          label: (c: { dataset: { label?: string }; parsed: { y: number | null } }) =>
                            "  " +
                            c.dataset.label +
                            ": R$ " +
                            Math.round(c.parsed.y ?? 0).toLocaleString("pt-BR"),
                        },
                      },
                    },
                    scales: { x: xScale, y: yScale },
                  },
                };
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 20, height: 2, background: "#6C3FFF" }} />
              <span style={{ fontSize: 9, color: "var(--text3)" }}>Planejado acum.</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 20, height: 2, background: "#00C8A0" }} />
              <span style={{ fontSize: 9, color: "var(--text3)" }}>Realizado acum.</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 16, height: 2, background: "#FF9B00" }} />
              <span style={{ fontSize: 9, color: "var(--text3)" }}>Projetado</span>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 9, color: "var(--text3)" }}>
              Atual: <strong style={{ color: "var(--text)" }}>Jun/2026</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Execução mensal */}
      <div style={{ marginBottom: 16 }}>
        <div className="chart-card">
          <div className="chart-header" style={{ flexWrap: "wrap", gap: 8 }}>
            <span className="chart-title">
              {selMes ? `Detalhe ${selMes} — Top 10 Itens (R$)` : "Execução Mensal de Despesas (R$)"}
            </span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button
                className={"orc-month-btn" + (selMes === "" ? " active" : "")}
                onClick={() => setSelMes("")}
              >
                Todos
              </button>
              {MES_ABBR.map((m) => (
                <button
                  key={m}
                  className={"orc-month-btn" + (selMes === m ? " active" : "")}
                  onClick={() => setSelMes(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div style={{ position: "relative", height: 260 }}>
            <ChartCanvas
              deps={[rows, selMes]}
              build={(ctx, canvas) => {
                const h = canvas.offsetHeight || 200;
                let labels: string[];
                let execData: number[];
                let budData: number[];
                if (selMes) {
                  const sorted = [...rows]
                    .filter((r) => (r.exec[selMes] || 0) > 0 || r.bud > 0)
                    .sort((a, b) => (b.exec[selMes] || 0) - (a.exec[selMes] || 0))
                    .slice(0, 10);
                  labels = sorted.map((r) =>
                    r.desc.length > 20 ? r.desc.slice(0, 19) + "…" : r.desc,
                  );
                  execData = sorted.map((r) => r.exec[selMes] || 0);
                  budData = sorted.map((r) => Math.round(r.bud / 12));
                } else {
                  labels = MES_ABBR;
                  execData = execMes;
                  budData = MES_ABBR.map(() =>
                    Math.round(rows.reduce((a, r) => a + r.bud, 0) / 12),
                  );
                }
                const gE = ctx.createLinearGradient(0, 0, 0, h);
                gE.addColorStop(0, "#4F8EFFEE");
                gE.addColorStop(1, "#4F8EFF33");
                const gB = ctx.createLinearGradient(0, 0, 0, h);
                gB.addColorStop(0, "#6C3FFF55");
                gB.addColorStop(1, "#6C3FFF11");
                return {
                  type: "bar",
                  data: {
                    labels,
                    datasets: [
                      {
                        label: "Budget Mensal",
                        data: budData,
                        backgroundColor: gB,
                        borderRadius: 4,
                        borderSkipped: false,
                        maxBarThickness: 28,
                        order: 2,
                      },
                      {
                        label: "Executado",
                        data: execData,
                        backgroundColor: gE,
                        borderRadius: 4,
                        borderSkipped: false,
                        maxBarThickness: 28,
                        order: 1,
                      },
                    ],
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { labels: { color: "#9096B0", font: { size: 10 }, boxWidth: 10 } },
                      datalabels: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (c: { dataset: { label?: string }; parsed: { y: number | null } }) =>
                            "  " +
                            c.dataset.label +
                            ": R$ " +
                            Math.round(c.parsed.y ?? 0).toLocaleString("pt-BR"),
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          color: "#9096B0",
                          font: { size: selMes ? 9 : 11 },
                          maxRotation: selMes ? 35 : 0,
                        },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: "rgba(255,255,255,0.04)" },
                        ticks: {
                          color: "#9096B0",
                          font: { size: 10 },
                          callback: (v: string | number) =>
                            Number(v) > 0 ? "R$" + Math.round(Number(v) / 1000) + "k" : 0,
                        },
                      },
                    },
                  },
                };
              }}
            />
          </div>
          {selMes && <TabelaDoMes rows={rows} mes={selMes} />}
        </div>
      </div>

      {/* Barras por categoria e projeto */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Budget vs Executado por Categoria</span>
          </div>
          <div style={{ position: "relative", height: 220 }}>
            <ChartCanvas
              deps={[rows]}
              build={() => {
                const grupos = [...new Set(rows.map((r) => r.grupo))];
                return {
                  type: "bar",
                  data: {
                    labels: grupos,
                    datasets: [
                      {
                        label: "Budget",
                        data: grupos.map((g) =>
                          rows.filter((r) => r.grupo === g).reduce((a, r) => a + r.bud, 0),
                        ),
                        backgroundColor: "rgba(108,63,255,0.3)",
                        borderRadius: 4,
                        maxBarThickness: 28,
                      },
                      {
                        label: "Executado",
                        data: grupos.map((g) =>
                          rows.filter((r) => r.grupo === g).reduce((a, r) => a + r.exec_total, 0),
                        ),
                        backgroundColor: "rgba(79,142,255,0.85)",
                        borderRadius: 4,
                        maxBarThickness: 28,
                      },
                    ],
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { labels: { color: "#9096B0", font: { size: 10 }, boxWidth: 10 } },
                      datalabels: { display: false },
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: "#9096B0", font: { size: 9 } } },
                      y: {
                        beginAtZero: true,
                        grid: { color: "rgba(255,255,255,0.04)" },
                        ticks: {
                          color: "#9096B0",
                          font: { size: 10 },
                          callback: (v: string | number) =>
                            Number(v) > 0 ? "R$" + Math.round(Number(v) / 1000) + "k" : 0,
                        },
                      },
                    },
                  },
                };
              }}
            />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Budget vs Executado por Projeto</span>
          </div>
          <div style={{ position: "relative", height: 220 }}>
            <ChartCanvas
              deps={[rows]}
              build={() => {
                const projetos = [...new Set(rows.map((r) => r.proj).filter(Boolean))];
                return {
                  type: "bar",
                  data: {
                    labels: projetos,
                    datasets: [
                      {
                        label: "Budget",
                        data: projetos.map((p) =>
                          rows.filter((r) => r.proj === p).reduce((a, r) => a + r.bud, 0),
                        ),
                        backgroundColor: "rgba(108,63,255,0.3)",
                        borderRadius: 4,
                        maxBarThickness: 28,
                      },
                      {
                        label: "Executado",
                        data: projetos.map((p) =>
                          rows.filter((r) => r.proj === p).reduce((a, r) => a + r.exec_total, 0),
                        ),
                        backgroundColor: projetos.map(
                          (p) => (ORC_PROJ_COLORS[p] || "#6C3FFF") + "CC",
                        ),
                        borderRadius: 4,
                        maxBarThickness: 28,
                      },
                    ],
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { labels: { color: "#9096B0", font: { size: 10 }, boxWidth: 10 } },
                      datalabels: { display: false },
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: "#9096B0", font: { size: 9 } } },
                      y: {
                        beginAtZero: true,
                        grid: { color: "rgba(255,255,255,0.04)" },
                        ticks: {
                          color: "#9096B0",
                          font: { size: 10 },
                          callback: (v: string | number) =>
                            Number(v) > 0 ? "R$" + Math.round(Number(v) / 1000) + "k" : 0,
                        },
                      },
                    },
                  },
                };
              }}
            />
          </div>
        </div>
      </div>

      {/* Quadro de pessoal */}
      <div className="section-title" style={{ marginBottom: 12 }}>
        👥 Quadro de Pessoal · Budget Operações 2026
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {orcPessoal.map((p, i) => {
          const col = p.status === "Ativo" ? "#00C8A0" : "#FF9B00";
          const tipocol =
            p.tipo === "Vaga Nova" ? "#4F8EFF" : p.tipo === "Movimentação" ? "#6C3FFF" : "#FF9B00";
          return (
            <div
              key={p.nome + i}
              style={{
                background: "var(--bg2)",
                border: `1px solid ${col}33`,
                borderRadius: 10,
                padding: 14,
                boxShadow: `0 2px 8px ${col}15`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{p.nome}</div>
                <span
                  style={{
                    fontSize: 9,
                    padding: "2px 7px",
                    borderRadius: 8,
                    background: col + "22",
                    color: col,
                  }}
                >
                  {p.status}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 9,
                    padding: "2px 7px",
                    borderRadius: 8,
                    background: tipocol + "22",
                    color: tipocol,
                  }}
                >
                  {p.tipo}
                </span>
                {p.regime && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 7px",
                      borderRadius: 8,
                      background: "var(--bg4)",
                      color: "var(--text3)",
                    }}
                  >
                    {p.regime}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 8,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{p.admissao}</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: col }}>
                  R$ {p.salario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
              {p.obs && (
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text3)",
                    marginTop: 6,
                    padding: "6px 8px",
                    background: "var(--bg3)",
                    borderRadius: 6,
                  }}
                >
                  {p.obs}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detalhamento */}
      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Detalhamento de Despesas</span>
          <span className="table-count">{tableData.length} itens</span>
          <input
            className="search-box"
            placeholder="Buscar item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <table>
          <thead>
            <tr>
              <th onClick={() => sortBy("grupo")} style={{ minWidth: 90 }}>
                Grupo
              </th>
              <th onClick={() => sortBy("desc")} style={{ minWidth: 160 }}>
                Descrição
              </th>
              <th onClick={() => sortBy("proj")} style={{ minWidth: 70 }}>
                Projeto
              </th>
              <th onClick={() => sortBy("bud_inicial")} style={{ minWidth: 90 }}>
                Orç. Inicial
              </th>
              <th onClick={() => sortBy("bud")} style={{ minWidth: 80 }} title="Diferença v.1→v.3">
                Supl./Cont.
              </th>
              <th onClick={() => sortBy("bud")} style={{ minWidth: 90 }}>
                Orç. Atual
              </th>
              <th onClick={() => sortBy("exec_total")} style={{ minWidth: 90 }}>
                Executado
              </th>
              <th onClick={() => sortBy("variacao")} style={{ minWidth: 90 }}>
                Saldo
              </th>
              <th onClick={() => sortBy("pct")} style={{ minWidth: 60 }}>
                % Exec.
              </th>
              <th style={{ minWidth: 70 }}>Barra</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((r, i) => {
              const execed = r.exec_total || 0;
              const budAtualRow = r.bud || 0;
              const budInic = r.bud_inicial !== undefined ? r.bud_inicial : budAtualRow;
              const saldo = budAtualRow - execed;
              const pct = pctExec(r);
              const suplRow = budAtualRow - budInic;
              const pc = pctColor(pct);
              const catCol = ORC_CAT_COLORS[r.grupo] || "#6C3FFF";
              const suplStr =
                suplRow === 0 ? "—" : (suplRow > 0 ? "+" : "▼ ") + fmtBRL(suplRow);
              return (
                <tr key={r.codigo + r.desc + i}>
                  <td>
                    <span
                      className="dir-badge"
                      style={{ background: catCol + "22", color: catCol, fontSize: 9 }}
                    >
                      {r.grupo || "—"}
                    </span>
                  </td>
                  <td style={{ maxWidth: 190, fontSize: 11 }}>{r.desc}</td>
                  <td style={{ fontSize: 10, color: "var(--text3)" }}>{r.proj || "—"}</td>
                  <td className="mono" style={{ fontSize: 10, color: "var(--text3)" }}>
                    {fmtBRL(budInic)}
                  </td>
                  <td
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: suplRow < 0 ? "#FF5C6A" : suplRow > 0 ? "#FF9B00" : "var(--text3)",
                      fontWeight: 600,
                    }}
                  >
                    {suplStr}
                  </td>
                  <td className="mono" style={{ fontSize: 11, fontWeight: 500 }}>
                    {fmtBRL(budAtualRow)}
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: "#4F8EFF", fontWeight: 600 }}>
                    {execed > 0 ? fmtBRL(execed) : "—"}
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: saldo >= 0 ? "#00C8A0" : "#FF5C6A" }}>
                    {fmtBRL(saldo)}
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: pc, fontWeight: 600 }}>
                    {execed > 0 ? pct + "%" : "—"}
                  </td>
                  <td>
                    <div
                      style={{
                        width: 70,
                        height: 5,
                        background: "var(--bg4)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: Math.min(pct, 100) + "%",
                          height: "100%",
                          background: pc,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Detalhamento item a item do mês selecionado, abaixo do gráfico mensal. */
function TabelaDoMes({ rows, mes }: { rows: OrcRecord[]; mes: string }) {
  const items = rows
    .map((r) => ({
      grupo: r.grupo,
      desc: r.desc,
      proj: r.proj,
      exec_mes: r.exec[mes] || 0,
      bud_mensal: Math.round(r.plan_mes?.[mes] ?? r.bud / 12),
      pct: r.bud > 0 ? Math.round(((r.exec[mes] || 0) / (r.bud / 12)) * 100) : 0,
    }))
    .filter((r) => r.exec_mes > 0 || r.bud_mensal > 0)
    .sort((a, b) => b.exec_mes - a.exec_mes);

  const totalExec = items.reduce((a, r) => a + r.exec_mes, 0);
  const totalBud = items.reduce((a, r) => a + r.bud_mensal, 0);
  const totalPct = totalBud > 0 ? Math.round((totalExec / totalBud) * 100) : 0;

  const th = { textAlign: "left" as const, padding: "4px 6px", fontWeight: 500 };
  const thRight = { ...th, textAlign: "right" as const };

  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          fontSize: 11,
          color: "var(--text2)",
          fontWeight: 600,
          marginBottom: 8,
          padding: "6px 0",
          borderTop: "1px solid var(--border)",
        }}
      >
        Detalhamento de {mes} &nbsp;·&nbsp;{" "}
        <span style={{ color: "#4F8EFF" }}>Executado: {fmtBRL(totalExec)}</span> &nbsp;/&nbsp;{" "}
        <span style={{ color: "var(--text3)" }}>Budget Mensal: {fmtBRL(totalBud)}</span> &nbsp;·&nbsp;{" "}
        <span style={{ color: pctColor(totalPct) }}>{totalPct}%</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ fontSize: 10, color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>
            <th style={th}>Categoria</th>
            <th style={th}>Descrição</th>
            <th style={th}>Projeto</th>
            <th style={thRight}>Budget/mês</th>
            <th style={thRight}>Executado {mes}</th>
            <th style={thRight}>% Exec.</th>
            <th style={th}>Barra</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r, i) => {
            const pc = pctColor(r.pct);
            const catCol = ORC_CAT_COLORS[r.grupo] || "#6C3FFF";
            return (
              <tr key={r.desc + i} style={{ borderBottom: "1px solid var(--border)", fontSize: 10 }}>
                <td style={{ padding: "4px 6px" }}>
                  <span
                    style={{
                      fontSize: 8,
                      padding: "1px 5px",
                      borderRadius: 6,
                      background: catCol + "22",
                      color: catCol,
                    }}
                  >
                    {r.grupo}
                  </span>
                </td>
                <td style={{ padding: "4px 6px", color: "var(--text2)", maxWidth: 160 }}>{r.desc}</td>
                <td style={{ padding: "4px 6px", color: "var(--text3)" }}>{r.proj || "—"}</td>
                <td className="mono" style={{ padding: "4px 6px", textAlign: "right", color: "var(--text3)" }}>
                  {fmtBRL(r.bud_mensal)}
                </td>
                <td
                  className="mono"
                  style={{ padding: "4px 6px", textAlign: "right", color: "#4F8EFF", fontWeight: 600 }}
                >
                  {r.exec_mes > 0 ? fmtBRL(r.exec_mes) : "—"}
                </td>
                <td
                  className="mono"
                  style={{ padding: "4px 6px", textAlign: "right", color: pc, fontWeight: 600 }}
                >
                  {r.exec_mes > 0 ? r.pct + "%" : "—"}
                </td>
                <td style={{ padding: "4px 6px" }}>
                  <div style={{ width: 70, height: 4, background: "var(--bg4)", borderRadius: 2 }}>
                    <div
                      style={{
                        width: Math.min(r.pct, 100) + "%",
                        height: "100%",
                        background: pc,
                        borderRadius: 2,
                      }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
