"use client";

import { useMemo, useState } from "react";

import ChartCanvas from "@/components/charts/ChartCanvas";
import FilterDropdown, { type FilterOption } from "@/components/FilterDropdown";
import FilterPills, { type Pill } from "@/components/FilterPills";
import KpiCard from "@/components/KpiCard";
import {
  CHARGE_TARGET,
  MESES,
  MES_ABBR,
  MES_ORD,
  TS_CAT_COLORS,
} from "@/lib/constants";
import { useData } from "@/lib/data-context";
import type { TSRow } from "@/lib/types";

type Tipo = "todos" | "billable" | "nonbillable";
type Filtros = {
  colabs: string[];
  anos: string[];
  meses: string[];
  cats: string[];
  clientes: string[];
  tipo: Tipo;
};

const FILTROS_VAZIOS: Filtros = {
  colabs: [],
  anos: [],
  meses: [],
  cats: [],
  clientes: [],
  tipo: "todos",
};

type RankCol = "total" | "billable" | "non_billable" | "chargeability";

const stripPrefix = (s: string) => s.replace(/^\d+\.\s*/, "");
const stripCatPrefix = (s: string) => s.replace(/^\d+\. /, "");

/** Cor conforme a distância da meta de chargeability. */
function chargColor(v: number) {
  return v >= CHARGE_TARGET ? "#00C8A0" : v >= 50 ? "#FF9B00" : "#FF5C6A";
}

export default function Timesheet() {
  const { timesheet } = useData();
  const [f, setF] = useState<Filtros>(FILTROS_VAZIOS);
  const [rankCol, setRankCol] = useState<RankCol>("chargeability");
  const [rankDir, setRankDir] = useState(-1);

  // ── Listas de opções ────────────────────────────────────────────────
  const allColabs = useMemo(
    () => [...new Set(timesheet.map((r) => r.c))].sort(),
    [timesheet],
  );
  const allAnos = useMemo(
    () => [...new Set(timesheet.map((r) => r.a))].sort().map(String),
    [timesheet],
  );
  const allMeses = useMemo(
    () =>
      [...new Set(timesheet.map((r) => r.m))].sort(
        (a, b) => (MES_ORD[a] || 9) - (MES_ORD[b] || 9),
      ),
    [timesheet],
  );
  const allCats = useMemo(
    () => [...new Set(timesheet.map((r) => r.cat))].filter(Boolean).sort(),
    [timesheet],
  );
  const allClientes = useMemo(() => {
    const horas: Record<string, number> = {};
    timesheet.filter((r) => r.b).forEach((r) => (horas[r.cl] = (horas[r.cl] || 0) + r.h));
    return Object.keys(horas)
      .filter(Boolean)
      .sort((a, b) => horas[b] - horas[a]);
  }, [timesheet]);

  // ── Filtragem ───────────────────────────────────────────────────────
  const rows = useMemo(
    () =>
      timesheet.filter((r) => {
        if (f.colabs.length && !f.colabs.includes(r.c)) return false;
        if (f.anos.length && !f.anos.includes(String(r.a))) return false;
        if (f.meses.length && !f.meses.includes(r.m)) return false;
        if (f.cats.length && !f.cats.includes(r.cat)) return false;
        if (f.clientes.length && !f.clientes.includes(r.cl)) return false;
        if (f.tipo === "billable" && !r.b) return false;
        if (f.tipo === "nonbillable" && r.b) return false;
        return true;
      }),
    [timesheet, f],
  );

  function toggle(grupo: keyof Omit<Filtros, "tipo">, value: string) {
    setF((prev) => {
      const arr = prev[grupo];
      return {
        ...prev,
        [grupo]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  }

  const pills: Pill[] = [];
  ([
    ["colabs", "Colab"],
    ["anos", "Ano"],
    ["meses", "Mês"],
    ["cats", "Cat"],
    ["clientes", "Cliente"],
  ] as const).forEach(([grupo, rotulo]) => {
    f[grupo].forEach((v) =>
      pills.push({ grupo, rotulo, valor: v, texto: stripPrefix(v) }),
    );
  });
  if (f.tipo !== "todos") {
    pills.push({ grupo: "tipo", rotulo: "Tipo", valor: f.tipo, texto: f.tipo });
  }

  function removePill(grupo: string, valor: string) {
    if (grupo === "tipo") setF((p) => ({ ...p, tipo: "todos" }));
    else toggle(grupo as keyof Omit<Filtros, "tipo">, valor);
  }

  // ── KPIs ────────────────────────────────────────────────────────────
  const totalHrs = rows.reduce((a, r) => a + r.h, 0);
  const billHrs = rows.filter((r) => r.b).reduce((a, r) => a + r.h, 0);
  const nonBill = totalHrs - billHrs;
  const teamCharg = totalHrs > 0 ? Math.round((billHrs / totalHrs) * 100) : 0;
  const colabs = useMemo(() => [...new Set(rows.map((r) => r.c))].sort(), [rows]);
  const colabChargs = colabs.map((c) => {
    const cr = rows.filter((r) => r.c === c);
    const t = cr.reduce((a, r) => a + r.h, 0);
    const b = cr.filter((r) => r.b).reduce((a, r) => a + r.h, 0);
    return t > 0 ? (b / t) * 100 : 0;
  });
  const acima = colabChargs.filter((v) => v >= CHARGE_TARGET).length;
  const abaixo = colabChargs.filter((v) => v < CHARGE_TARGET).length;

  // ── Ranking ─────────────────────────────────────────────────────────
  const rank = useMemo(() => {
    const list = colabs.map((colab) => {
      const cr = rows.filter((r) => r.c === colab);
      const total = cr.reduce((a, r) => a + r.h, 0);
      const billable = cr.filter((r) => r.b).reduce((a, r) => a + r.h, 0);
      return {
        colab,
        total: Math.round(total),
        billable: Math.round(billable),
        non_billable: Math.round(total - billable),
        chargeability: total > 0 ? Math.round((billable / total) * 100) : 0,
      };
    });
    return list.sort((a, b) => (a[rankCol] - b[rankCol]) * rankDir);
  }, [colabs, rows, rankCol, rankDir]);

  function sortRank(col: RankCol) {
    if (rankCol === col) setRankDir((d) => d * -1);
    else {
      setRankCol(col);
      setRankDir(-1);
    }
  }

  const catOptions: FilterOption[] = allCats.map((c) => ({
    value: c,
    label: stripCatPrefix(c),
    color: TS_CAT_COLORS[c] || "#6C3FFF",
  }));

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
            ⏱ Controle Timesheet — Operações
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
            Meta chargeability: <span style={{ color: "#FF9B00" }}>≥{CHARGE_TARGET}%</span>
          </div>
        </div>
      </div>

      {/* Barra de filtros */}
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
          label="Colaborador"
          options={allColabs.map((c) => ({ value: c, label: c }))}
          selected={f.colabs}
          onToggle={(v) => toggle("colabs", v)}
        />
        <FilterDropdown
          label="Ano"
          options={allAnos.map((a) => ({ value: a, label: a }))}
          selected={f.anos}
          onToggle={(v) => toggle("anos", v)}
        />
        <FilterDropdown
          label="Mês"
          options={allMeses.map((m) => ({ value: m, label: m }))}
          selected={f.meses}
          onToggle={(v) => toggle("meses", v)}
        />
        <FilterDropdown
          label="Categoria"
          options={catOptions}
          selected={f.cats}
          onToggle={(v) => toggle("cats", v)}
        />
        <FilterDropdown
          label="Tipo"
          mode="single"
          options={[
            { value: "todos", label: "Todos" },
            { value: "billable", label: "Billable" },
            { value: "nonbillable", label: "Non-Billable" },
          ]}
          selected={f.tipo === "todos" ? [] : [f.tipo]}
          onToggle={(v) => setF((p) => ({ ...p, tipo: v as Tipo }))}
        />
        <FilterDropdown
          label="Cliente / Contrato"
          wide
          searchable
          options={allClientes.map((c) => ({ value: c, label: stripPrefix(c) }))}
          selected={f.clientes}
          onToggle={(v) => toggle("clientes", v)}
        />
        <div style={{ width: 1, height: 24, background: "var(--border2)", margin: "0 2px" }} />
        <button className="btn-link" onClick={() => setF(FILTROS_VAZIOS)}>
          ✕ Limpar
        </button>
        <FilterPills pills={pills} onRemove={removePill} />
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <KpiCard
          label="Horas Totais"
          value={Math.round(totalHrs) + "h"}
          sub={rows.length.toLocaleString("pt-BR") + " registros"}
          grad="linear-gradient(90deg,#6C3FFF,#4F8EFF)"
        />
        <KpiCard
          label="Horas Billable"
          value={Math.round(billHrs) + "h"}
          sub="em clientes/projetos"
          grad="linear-gradient(90deg,#00D4A0,#20C0FF)"
        />
        <KpiCard
          label="Non-Billable"
          value={Math.round(nonBill) + "h"}
          sub="internas ITP"
          grad="linear-gradient(90deg,#FF5C6A,#FF8C00)"
        />
        <KpiCard
          label="Chargeability"
          value={teamCharg + "%"}
          sub="média filtrada"
          grad={
            teamCharg >= CHARGE_TARGET
              ? "linear-gradient(90deg,#00D4A0,#20C0FF)"
              : "linear-gradient(90deg,#FF5C6A,#FF8C00)"
          }
        />
        <KpiCard
          label={`Meta ≥${CHARGE_TARGET}%`}
          value={`${acima} ✅ / ${abaixo} 🔴`}
          sub="acima / abaixo da meta"
          grad="linear-gradient(90deg,#6C3FFF,#FF40A0)"
        />
      </div>

      {/* Gráficos — linha 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, marginBottom: 16 }}>
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Chargeability por Colaborador</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--text3)" }}>
              meta <span style={{ color: "#FF9B00" }}>{CHARGE_TARGET}%</span>
            </span>
          </div>
          <div style={{ position: "relative", height: 200 }}>
            <ChartCanvas
              deps={[rows]}
              build={(ctx, canvas) => {
                const h = canvas.offsetHeight || 200;
                const vals = colabs.map((c) => {
                  const cr = rows.filter((r) => r.c === c);
                  const t = cr.reduce((a, r) => a + r.h, 0);
                  const b = cr.filter((r) => r.b).reduce((a, r) => a + r.h, 0);
                  return t > 0 ? Math.round((b / t) * 100) : 0;
                });
                const grads = vals.map((v) => {
                  const g = ctx.createLinearGradient(0, 0, 0, h);
                  const col = chargColor(v);
                  g.addColorStop(0, col + "EE");
                  g.addColorStop(1, col + "33");
                  return g;
                });
                return {
                  type: "bar",
                  data: {
                    labels: colabs.map((c) => c.split(" ")[0]),
                    datasets: [
                      {
                        data: vals,
                        backgroundColor: grads,
                        borderWidth: 0,
                        borderRadius: 8,
                        borderSkipped: false,
                        maxBarThickness: 52,
                      },
                    ],
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      datalabels: {
                        color: "#fff",
                        font: { size: 11, weight: 600 },
                        formatter: (v: number) => v + "%",
                        anchor: "end",
                        align: "start",
                      },
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: "#9096B0", font: { size: 11 } } },
                      y: {
                        beginAtZero: true,
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
                  plugins: [
                    {
                      id: "linha-meta",
                      afterDraw(chart) {
                        const area = chart.chartArea;
                        const y = chart.scales.y;
                        if (!area || !y) return;
                        const c = chart.ctx;
                        const yPos = y.getPixelForValue(CHARGE_TARGET);
                        c.save();
                        c.strokeStyle = "#FF9B00CC";
                        c.lineWidth = 1.5;
                        c.setLineDash([6, 4]);
                        c.beginPath();
                        c.moveTo(area.left, yPos);
                        c.lineTo(area.right, yPos);
                        c.stroke();
                        c.fillStyle = "#FF9B00";
                        c.font = "bold 10px IBM Plex Mono,monospace";
                        c.fillText("Meta " + CHARGE_TARGET + "%", area.right - 72, yPos - 5);
                        c.restore();
                      },
                    },
                  ],
                };
              }}
            />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Billable vs Non-Billable</span>
          </div>
          <div style={{ position: "relative", height: 170 }}>
            <ChartCanvas
              deps={[rows]}
              build={(ctx, canvas) => {
                const w = canvas.offsetWidth || 220;
                const h = canvas.offsetHeight || 170;
                const gB = ctx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, h * 0.5);
                gB.addColorStop(0, "#00FFD0CC");
                gB.addColorStop(1, "#00C8A055");
                const gN = ctx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, h * 0.5);
                gN.addColorStop(0, "#FF5C6ACC");
                gN.addColorStop(1, "#FF9B0055");
                return {
                  type: "doughnut",
                  data: {
                    labels: ["Billable", "Non-Billable"],
                    datasets: [
                      {
                        data: [Math.round(billHrs), Math.round(nonBill)],
                        backgroundColor: [gB, gN],
                        borderWidth: 0,
                        hoverOffset: 5,
                      },
                    ],
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "65%",
                    plugins: {
                      legend: { display: false },
                      datalabels: {
                        color: "#fff",
                        font: { size: 10, weight: 600 },
                        formatter: (v: number) => {
                          const tot = Math.round(billHrs) + Math.round(nonBill);
                          return tot > 0 ? Math.round((v / tot) * 100) + "%" : "0%";
                        },
                      },
                    },
                  },
                };
              }}
            />
          </div>
          <div style={{ marginTop: 6 }}>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: "#00C8A0" }} />
                Billable ({Math.round(billHrs)}h)
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: "#FF5C6A" }} />
                Non-Bill. ({Math.round(nonBill)}h)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos — linha 2 */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}
      >
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Evolução Mensal (Chargeability)</span>
          </div>
          <div style={{ position: "relative", height: 180 }}>
            <ChartCanvas
              deps={[rows]}
              build={(ctx, canvas) => {
                const h = canvas.offsetHeight || 180;
                const anos = [...new Set(rows.map((r) => r.a))].sort();
                const LINE_COLS = ["#4F8EFF", "#00C8A0", "#FF9B00", "#FF40A0"];
                const datasets = anos.map((ano, i) => {
                  const col = LINE_COLS[i % LINE_COLS.length];
                  const g = ctx.createLinearGradient(0, 0, 0, h);
                  g.addColorStop(0, col + "55");
                  g.addColorStop(1, col + "00");
                  const data = MESES.map((mes) => {
                    const mr = rows.filter((r) => r.a === ano && r.m === mes);
                    const t = mr.reduce((a, r) => a + r.h, 0);
                    const b = mr.filter((r) => r.b).reduce((a, r) => a + r.h, 0);
                    return t > 0 ? Math.round((b / t) * 100) : null;
                  });
                  return {
                    label: String(ano),
                    data,
                    borderColor: col,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: col,
                    pointBorderColor: "transparent",
                    backgroundColor: g,
                    fill: true,
                    tension: 0.4,
                    spanGaps: true,
                  };
                });
                return {
                  type: "line",
                  data: { labels: MES_ABBR, datasets },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { labels: { color: "#9096B0", font: { size: 10 }, boxWidth: 10 } },
                      datalabels: { display: false },
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: "#9096B0", font: { size: 11 } } },
                      y: {
                        beginAtZero: true,
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
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Horas por Categoria</span>
          </div>
          <div style={{ position: "relative", height: 180 }}>
            <ChartCanvas
              deps={[rows]}
              build={(ctx, canvas) => {
                const h = canvas.offsetHeight || 180;
                const catTotals = allCats
                  .map((cat) => ({
                    cat,
                    h: rows.filter((r) => r.cat === cat).reduce((a, r) => a + r.h, 0),
                  }))
                  .filter((x) => x.h > 0)
                  .sort((a, b) => b.h - a.h);
                const grads = catTotals.map(({ cat }) => {
                  const col = TS_CAT_COLORS[cat] || "#6C3FFF";
                  const g = ctx.createLinearGradient(0, 0, 0, h);
                  g.addColorStop(0, col + "EE");
                  g.addColorStop(1, col + "44");
                  return g;
                });
                return {
                  type: "bar",
                  data: {
                    labels: catTotals.map((x) => stripCatPrefix(x.cat)),
                    datasets: [
                      {
                        data: catTotals.map((x) => Math.round(x.h)),
                        backgroundColor: grads,
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 48,
                      },
                    ],
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: "y",
                    plugins: {
                      legend: { display: false },
                      datalabels: {
                        color: "#fff",
                        font: { size: 10, weight: 600 },
                        anchor: "end",
                        align: "end",
                        formatter: (v: number) => v + "h",
                      },
                    },
                    scales: {
                      x: { display: false, beginAtZero: true },
                      y: { grid: { display: false }, ticks: { color: "#9096B0", font: { size: 10 } } },
                    },
                  },
                };
              }}
            />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Top Clientes Billable</span>
          </div>
          <div style={{ position: "relative", height: 180 }}>
            <ChartCanvas
              deps={[rows]}
              build={(ctx, canvas) => {
                const h = canvas.offsetHeight || 180;
                const totals: Record<string, number> = {};
                rows.filter((r) => r.b).forEach((r) => (totals[r.cl] = (totals[r.cl] || 0) + r.h));
                const top10 = Object.entries(totals)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10);
                const g = ctx.createLinearGradient(0, 0, h * 2, 0);
                g.addColorStop(0, "#20C0FFEE");
                g.addColorStop(1, "#4F8EFF55");
                return {
                  type: "bar",
                  data: {
                    labels: top10.map(([c]) => stripPrefix(c).slice(0, 10)),
                    datasets: [
                      {
                        data: top10.map(([, hrs]) => Math.round(hrs)),
                        backgroundColor: g,
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 28,
                      },
                    ],
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: "y",
                    plugins: {
                      legend: { display: false },
                      datalabels: {
                        color: "#fff",
                        font: { size: 9, weight: 600 },
                        anchor: "end",
                        align: "end",
                        formatter: (v: number) => v + "h",
                      },
                    },
                    scales: {
                      x: { display: false, beginAtZero: true },
                      y: { grid: { display: false }, ticks: { color: "#9096B0", font: { size: 9 } } },
                    },
                  },
                };
              }}
            />
          </div>
        </div>
      </div>

      {/* Cards por colaborador */}
      <div className="section-title" style={{ marginBottom: 12 }}>
        Detalhamento Individual
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {colabs.length === 0 ? (
          <div style={{ color: "var(--text3)", fontSize: 13, padding: 20 }}>
            Nenhum dado para os filtros selecionados.
          </div>
        ) : (
          colabs.map((colab) => (
            <ColabCard key={colab} colab={colab} rows={rows} cats={allCats} />
          ))
        )}
      </div>

      {/* Ranking */}
      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Ranking de Chargeability</span>
          <span className="table-count">{rank.length} colaboradores</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th>Colaborador</th>
              <th onClick={() => sortRank("total")}>Total h</th>
              <th onClick={() => sortRank("billable")}>Billable h</th>
              <th onClick={() => sortRank("non_billable")}>Non-Bill. h</th>
              <th onClick={() => sortRank("chargeability")}>Chargeability ↕</th>
              <th>Barra</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rank.map((r, i) => {
              const c = r.chargeability;
              const col = chargColor(c);
              const lbl = c >= CHARGE_TARGET ? "✅ Meta" : c >= 50 ? "🟡 Atenção" : "🔴 Abaixo";
              return (
                <tr key={r.colab}>
                  <td className="mono" style={{ fontSize: 11, color: "var(--text3)" }}>
                    {i + 1}
                  </td>
                  <td style={{ fontWeight: 500 }}>{r.colab}</td>
                  <td className="mono">{r.total}h</td>
                  <td className="mono" style={{ color: "#00C8A0" }}>
                    {r.billable}h
                  </td>
                  <td className="mono" style={{ color: "#FF5C6A" }}>
                    {r.non_billable}h
                  </td>
                  <td className="mono" style={{ color: col, fontWeight: 600 }}>
                    {c}%
                  </td>
                  <td>
                    <div
                      style={{
                        width: 100,
                        height: 6,
                        background: "var(--bg4)",
                        borderRadius: 3,
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          width: Math.max(c, 2) + "%",
                          height: "100%",
                          background: `linear-gradient(90deg,${col}EE,${col}66)`,
                          borderRadius: 3,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: CHARGE_TARGET + "%",
                          width: 1.5,
                          height: "100%",
                          background: "#FF9B00BB",
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "2px 7px",
                        borderRadius: 8,
                        background: col + "22",
                        color: col,
                      }}
                    >
                      {lbl}
                    </span>
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

function ColabCard({
  colab,
  rows,
  cats,
}: {
  colab: string;
  rows: TSRow[];
  cats: string[];
}) {
  const cr = rows.filter((r) => r.c === colab);
  const tot = cr.reduce((a, r) => a + r.h, 0);
  const bill = cr.filter((r) => r.b).reduce((a, r) => a + r.h, 0);
  const charg = tot > 0 ? Math.round((bill / tot) * 100) : 0;
  const col = chargColor(charg);
  const bg =
    charg >= CHARGE_TARGET
      ? "rgba(0,200,160,.10)"
      : charg >= 50
        ? "rgba(255,155,0,.10)"
        : "rgba(255,92,106,.10)";
  const label =
    charg >= CHARGE_TARGET ? "✅ Meta atingida" : charg >= 50 ? "🟡 Atenção" : "🔴 Abaixo da meta";

  const cliMap: Record<string, number> = {};
  cr.filter((r) => r.b).forEach((r) => (cliMap[r.cl] = (cliMap[r.cl] || 0) + r.h));
  const topCli = Object.entries(cliMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div
      style={{
        background: "var(--bg2)",
        border: `1px solid ${col}33`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: `0 2px 12px ${col}15`,
      }}
    >
      <div
        style={{
          background: `linear-gradient(90deg,${col}22,transparent)`,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: `linear-gradient(135deg,${col}CC,${col}55)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {colab[0]}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{colab}</div>
            <div style={{ fontSize: 10, color: "var(--text3)" }}>
              {Math.round(tot)}h totais · {Math.round(bill)}h bill.
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            className="mono"
            style={{
              fontSize: 24,
              fontWeight: 700,
              background: `linear-gradient(135deg,${col},${col}99)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {charg}%
          </div>
          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 8, background: bg, color: col }}>
            {label}
          </span>
        </div>
      </div>

      <div style={{ padding: "10px 14px 4px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: "var(--text3)",
            marginBottom: 4,
          }}
        >
          <span>Chargeability</span>
          <span className="mono">Meta: {CHARGE_TARGET}%</span>
        </div>
        <div
          style={{
            height: 8,
            background: "var(--bg4)",
            borderRadius: 4,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              width: Math.max(charg, 2) + "%",
              height: "100%",
              borderRadius: 4,
              background: `linear-gradient(90deg,${col}EE,${col}88)`,
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
      </div>

      {/* Chargeability mês a mês (só meses com lançamentos) */}
      <div style={{ padding: "8px 14px 10px", display: "flex", gap: 8, justifyContent: "space-around" }}>
        {MESES.map((mes, i) => {
          const mr = cr.filter((r) => r.m === mes);
          if (!mr.length) return null;
          const t = mr.reduce((a, r) => a + r.h, 0);
          const b = mr.filter((r) => r.b).reduce((a, r) => a + r.h, 0);
          const v = t > 0 ? Math.round((b / t) * 100) : null;
          const dc = v === null ? "#6E748A" : chargColor(v);
          const inicial = MES_ABBR[i];
          return (
            <div key={mes} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div className="mono" style={{ fontSize: 9, color: dc, fontWeight: 600 }}>
                {v === null ? "—" : v + "%"}
              </div>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: dc + "33",
                  border: `1.5px solid ${dc}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 8,
                  color: dc,
                }}
              >
                {inicial}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: ".6px",
              marginBottom: 6,
            }}
          >
            Por Categoria
          </div>
          {cats.map((cat) => {
            const h = cr.filter((r) => r.cat === cat).reduce((a, r) => a + r.h, 0);
            if (!h) return null;
            const cc = TS_CAT_COLORS[cat] || "#6C3FFF";
            const pct = Math.round((h / tot) * 100);
            return (
              <div key={cat} style={{ marginBottom: 4 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 9,
                    color: "var(--text3)",
                    marginBottom: 2,
                  }}
                >
                  <span>{stripCatPrefix(cat)}</span>
                  <span className="mono" style={{ color: cc }}>
                    {pct}%
                  </span>
                </div>
                <div style={{ height: 3, background: "var(--bg4)", borderRadius: 2 }}>
                  <div style={{ width: pct + "%", height: "100%", background: cc, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: "10px 14px" }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: ".6px",
              marginBottom: 6,
            }}
          >
            Top Clientes Billable
          </div>
          {topCli.map(([cl, h]) => (
            <div
              key={cl}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "var(--text3)",
                padding: "2px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {stripPrefix(cl)}
              </span>
              <span className="mono" style={{ color: "var(--text2)", paddingLeft: 8, flexShrink: 0 }}>
                {Math.round(h)}h
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
