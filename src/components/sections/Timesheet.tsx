"use client";

import { useMemo, useState } from "react";

import ChartCanvas from "@/components/charts/ChartCanvas";
import Gauge from "@/components/charts/Gauge";
import RankBars from "@/components/charts/RankBars";
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
import { estimarCapacidade, JORNADA_PADRAO } from "@/lib/capacidade";
import { useData } from "@/lib/data-context";
import {
  abrevCat,
  chargBg,
  chargColor,
  chargLabel,
  fmt2,
  fmtH,
  fmtMil,
  rotuloCat,
  stripPrefix,
} from "@/lib/timesheet";
import type { TSRow } from "@/lib/types";
import ColabDetalhe from "./ColabDetalhe";

type Tipo = "todos" | "billable" | "nonbillable";

type Filtros = {
  colabs: string[];
  anos: string[];
  meses: string[];
  cats: string[];
  clientes: string[];
  times: string[];
  sts: string[];
  tipo: Tipo;
  /** Período (YYYY-MM-DD); vazio = sem limite. */
  de: string;
  ate: string;
};

const FILTROS_VAZIOS: Filtros = {
  colabs: [],
  anos: [],
  meses: [],
  cats: [],
  clientes: [],
  times: [],
  sts: [],
  tipo: "todos",
  de: "",
  ate: "",
};

/** Grupos de filtro que são listas de valores (usados por dropdowns, pills e cross-filter). */
type GrupoLista = "colabs" | "anos" | "meses" | "cats" | "clientes" | "times" | "sts";

type RankCol = "total" | "billable" | "non_billable" | "chargeability";

/** Valor usado quando o colaborador não tem time/status cadastrado. */
const NAO_INFORMADO = "Não informado";


export default function Timesheet() {
  const { timesheet, capacidade } = useData();
  const [f, setF] = useState<Filtros>(FILTROS_VAZIOS);
  const [rankCol, setRankCol] = useState<RankCol>("chargeability");
  const [rankDir, setRankDir] = useState(-1);
  /** Colaborador em destaque no card ampliado; null = fechado. */
  const [detalhe, setDetalhe] = useState<string | null>(null);

  // Campos que só existem quando a base importada os traz.
  const temTime = useMemo(() => timesheet.some((r) => r.time), [timesheet]);
  const temStatus = useMemo(() => timesheet.some((r) => r.st), [timesheet]);

  // Sem a aba "Capacidade", as horas disponíveis são estimadas por dias úteis.
  const capacidadeEstimada = capacidade.length === 0;
  const capacidadeBase = useMemo(
    () => (capacidade.length ? capacidade : estimarCapacidade(timesheet)),
    [capacidade, timesheet],
  );
  const temCapacidade = capacidadeBase.length > 0;

  // ── Listas de opções ────────────────────────────────────────────────
  const allColabs = useMemo(() => [...new Set(timesheet.map((r) => r.c))].sort(), [timesheet]);
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
  // "Não informado" fica no fim da lista, depois dos valores reais.
  const ordenarComNaoInformado = (a: string, b: string) =>
    Number(a === NAO_INFORMADO) - Number(b === NAO_INFORMADO) || a.localeCompare(b);

  const allTimes = useMemo(
    () =>
      ([...new Set(timesheet.map((r) => r.time).filter(Boolean))] as string[]).sort(
        ordenarComNaoInformado,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timesheet],
  );
  const allStatus = useMemo(
    () =>
      ([...new Set(timesheet.map((r) => r.st).filter(Boolean))] as string[]).sort(
        ordenarComNaoInformado,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timesheet],
  );
  const allClientes = useMemo(() => {
    const horas: Record<string, number> = {};
    timesheet.filter((r) => r.b).forEach((r) => (horas[r.cl] = (horas[r.cl] || 0) + r.h));
    return Object.keys(horas)
      .filter(Boolean)
      .sort((a, b) => horas[b] - horas[a]);
  }, [timesheet]);
  const periodo = useMemo(() => {
    const datas = timesheet.map((r) => r.d).filter(Boolean).sort();
    return { min: datas[0] ?? "", max: datas[datas.length - 1] ?? "" };
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
        if (f.times.length && !f.times.includes(r.time ?? "")) return false;
        if (f.sts.length && !f.sts.includes(r.st ?? "")) return false;
        if (f.tipo === "billable" && !r.b) return false;
        if (f.tipo === "nonbillable" && r.b) return false;
        if (f.de && r.d && r.d < f.de) return false;
        if (f.ate && r.d && r.d > f.ate) return false;
        return true;
      }),
    [timesheet, f],
  );

  // A capacidade só responde aos filtros de pessoa e de tempo — cliente e
  // categoria são atributos do lançamento, não da disponibilidade do colaborador.
  const capacidadeFiltrada = useMemo(
    () =>
      capacidadeBase.filter((c) => {
        if (f.colabs.length && !f.colabs.includes(c.c)) return false;
        if (f.anos.length && !f.anos.includes(String(c.a))) return false;
        if (f.meses.length && !f.meses.includes(MESES[c.mo - 1])) return false;
        if (f.de && `${c.a}-${String(c.mo).padStart(2, "0")}-28` < f.de) return false;
        if (f.ate && `${c.a}-${String(c.mo).padStart(2, "0")}-01` > f.ate) return false;
        return true;
      }),
    [capacidadeBase, f],
  );

  function toggle(grupo: GrupoLista, value: string) {
    setF((prev) => {
      const arr = prev[grupo];
      return {
        ...prev,
        [grupo]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  }

  // ── Chips dos filtros ativos ────────────────────────────────────────
  const pills: Pill[] = [];
  ([
    ["colabs", "Colab"],
    ["anos", "Ano"],
    ["meses", "Mês"],
    ["cats", "Cat"],
    ["clientes", "Cliente"],
    ["times", "Time"],
    ["sts", "Status"],
  ] as const).forEach(([grupo, rotulo]) => {
    f[grupo].forEach((v) => pills.push({ grupo, rotulo, valor: v, texto: stripPrefix(v) }));
  });
  if (f.tipo !== "todos") pills.push({ grupo: "tipo", rotulo: "Tipo", valor: f.tipo, texto: f.tipo });
  if (f.de || f.ate) {
    pills.push({
      grupo: "periodo",
      rotulo: "Período",
      valor: "periodo",
      texto: `${f.de || "início"} → ${f.ate || "fim"}`,
    });
  }

  function removePill(grupo: string, valor: string) {
    if (grupo === "tipo") setF((p) => ({ ...p, tipo: "todos" }));
    else if (grupo === "periodo") setF((p) => ({ ...p, de: "", ate: "" }));
    else toggle(grupo as GrupoLista, valor);
  }

  // ── Medidas ─────────────────────────────────────────────────────────
  const horasPreenchidas = rows.reduce((a, r) => a + r.h, 0);
  const horasFaturaveis = rows.filter((r) => r.b).reduce((a, r) => a + r.h, 0);
  const nonBill = horasPreenchidas - horasFaturaveis;
  const horasDisponiveis = capacidadeFiltrada.reduce((a, c) => a + c.horas, 0);
  const pctPreenchimento = horasDisponiveis > 0 ? (horasPreenchidas / horasDisponiveis) * 100 : 0;
  const pctChargeability = horasPreenchidas > 0 ? (horasFaturaveis / horasPreenchidas) * 100 : 0;

  const colabs = useMemo(() => [...new Set(rows.map((r) => r.c))].sort(), [rows]);
  const colabChargs = colabs.map((c) => {
    const cr = rows.filter((r) => r.c === c);
    const t = cr.reduce((a, r) => a + r.h, 0);
    const b = cr.filter((r) => r.b).reduce((a, r) => a + r.h, 0);
    return t > 0 ? (b / t) * 100 : 0;
  });
  const acima = colabChargs.filter((v) => v >= CHARGE_TARGET).length;
  const abaixo = colabChargs.filter((v) => v < CHARGE_TARGET).length;

  // ── Séries dos visuais do BI ────────────────────────────────────────
  const porColabPreenchidas = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => (m[r.c] = (m[r.c] || 0) + r.h));
    return Object.entries(m).map(([value, total]) => ({ value, label: value, total }));
  }, [rows]);

  const porColabFaturaveis = useMemo(() => {
    const m: Record<string, number> = {};
    rows.filter((r) => r.b).forEach((r) => (m[r.c] = (m[r.c] || 0) + r.h));
    return Object.entries(m).map(([value, total]) => ({ value, label: value, total }));
  }, [rows]);

  const porCliente = useMemo(() => {
    const m: Record<string, number> = {};
    rows.filter((r) => r.b).forEach((r) => (m[r.cl] = (m[r.cl] || 0) + r.h));
    return Object.entries(m).map(([value, total]) => ({ value, label: value, total }));
  }, [rows]);

  const porCategoria = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => (m[r.cat || "(Em branco)"] = (m[r.cat || "(Em branco)"] || 0) + r.h));
    return Object.entries(m).map(([value, total]) => ({
      value: value === "(Em branco)" ? "" : value,
      label: value,
      total,
    }));
  }, [rows]);

  /** Série histórica por MêsAno, no formato do relatório ("2026 1"). */
  const serie = useMemo(() => {
    const chaves = [...new Set(rows.map((r) => `${r.a}|${r.mo}`))].sort((x, y) => {
      const [ax, mx] = x.split("|").map(Number);
      const [ay, my] = y.split("|").map(Number);
      return ax - ay || mx - my;
    });
    return chaves.map((k) => {
      const [ano, mo] = k.split("|").map(Number);
      const mr = rows.filter((r) => r.a === ano && r.mo === mo);
      const t = mr.reduce((a, r) => a + r.h, 0);
      const b = mr.filter((r) => r.b).reduce((a, r) => a + r.h, 0);
      const disp = capacidadeFiltrada
        .filter((c) => c.a === ano && c.mo === mo)
        .reduce((a, c) => a + c.horas, 0);
      return {
        label: `${ano} ${mo}`,
        chargeability: t > 0 ? Math.round((b / t) * 100) : null,
        preenchimento: disp > 0 ? Math.round((t / disp) * 100) : null,
      };
    });
  }, [rows, capacidadeFiltrada]);

  /**
   * Matriz Nome × Categoria, do maior total para o menor. Cabe sem rolagem
   * lateral; na vertical mostra ~10 linhas e rola dentro do card, com
   * cabeçalho e linha de total fixos.
   */
  const matriz = useMemo(() => {
    const cats = [...new Set(rows.map((r) => r.cat).filter(Boolean))].sort();
    const nomes = [...new Set(rows.map((r) => r.c))].sort();
    const celulas: Record<string, Record<string, number>> = {};
    rows.forEach((r) => {
      if (!r.cat) return;
      celulas[r.c] = celulas[r.c] || {};
      celulas[r.c][r.cat] = (celulas[r.c][r.cat] || 0) + r.h;
    });
    const todas = nomes.map((nome) => {
      const valores = cats.map((c) => celulas[nome]?.[c] ?? 0);
      return { nome, valores, total: valores.reduce((a, v) => a + v, 0) };
    });
    const totaisCol = cats.map((_, i) => todas.reduce((a, l) => a + l.valores[i], 0));
    return {
      cats,
      linhas: [...todas].sort((a, b) => b.total - a.total),
      totalColaboradores: todas.length,
      totaisCol,
      totalGeral: totaisCol.reduce((a, v) => a + v, 0),
    };
  }, [rows]);

  // ── Ranking (tabela do dashboard) ───────────────────────────────────
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
    label: rotuloCat(c),
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
            {capacidadeEstimada && (
              <>
                {" · "}
                <span title={`Horas disponíveis estimadas: dias úteis do mês × ${JORNADA_PADRAO}h, descontando feriados nacionais. Importe a aba "Capacidade" para usar os números oficiais.`}>
                  disponibilidade estimada
                </span>
              </>
            )}
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
        {temTime && (
          <FilterDropdown
            label="Time"
            options={allTimes.map((t) => ({ value: t, label: t }))}
            selected={f.times}
            onToggle={(v) => toggle("times", v)}
          />
        )}
        {temStatus && (
          <FilterDropdown
            label="Status Colab."
            options={allStatus.map((s) => ({ value: s, label: s }))}
            selected={f.sts}
            onToggle={(v) => toggle("sts", v)}
          />
        )}
        <FilterDropdown
          label="Colaborador"
          options={allColabs.map((c) => ({ value: c, label: c }))}
          selected={f.colabs}
          onToggle={(v) => toggle("colabs", v)}
          searchable
        />
        <FilterDropdown
          label="Cliente / Contrato"
          wide
          searchable
          options={allClientes.map((c) => ({ value: c, label: stripPrefix(c) }))}
          selected={f.clientes}
          onToggle={(v) => toggle("clientes", v)}
        />
        <FilterDropdown
          label="Categoria"
          options={catOptions}
          selected={f.cats}
          onToggle={(v) => toggle("cats", v)}
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

        {/* Período (equivale ao slicer "Date" do relatório) */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text3)" }}>Período</span>
          <input
            type="date"
            className="filter-sel"
            style={{ width: "auto", margin: 0, padding: "5px 7px", fontSize: 11 }}
            min={periodo.min}
            max={periodo.max}
            value={f.de}
            onChange={(e) => setF((p) => ({ ...p, de: e.target.value }))}
          />
          <span style={{ fontSize: 10, color: "var(--text3)" }}>até</span>
          <input
            type="date"
            className="filter-sel"
            style={{ width: "auto", margin: 0, padding: "5px 7px", fontSize: 11 }}
            min={periodo.min}
            max={periodo.max}
            value={f.ate}
            onChange={(e) => setF((p) => ({ ...p, ate: e.target.value }))}
          />
        </div>

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
          gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {temCapacidade && (
          <KpiCard
            label="Horas Disponíveis"
            value={fmtMil(horasDisponiveis)}
            sub={capacidadeEstimada ? `dias úteis × ${JORNADA_PADRAO}h` : "capacidade importada"}
            grad="linear-gradient(90deg,#6C3FFF,#4F8EFF)"
          />
        )}
        <KpiCard
          label="Horas Preenchidas"
          value={fmtMil(horasPreenchidas)}
          sub={rows.length.toLocaleString("pt-BR") + " registros"}
          grad="linear-gradient(90deg,#4F8EFF,#20C0FF)"
        />
        <KpiCard
          label="Horas Faturáveis"
          value={fmtMil(horasFaturaveis)}
          sub="em clientes/projetos"
          grad="linear-gradient(90deg,#00D4A0,#20C0FF)"
        />
        <KpiCard
          label="Non-Billable"
          value={fmtMil(nonBill)}
          sub="internas ITP"
          grad="linear-gradient(90deg,#FF5C6A,#FF8C00)"
        />
        {temCapacidade && (
          <div className="kpi-card">
            <div className="kpi-accent" style={{ background: "linear-gradient(90deg,#6C3FFF,#4F8EFF)" }} />
            <div className="kpi-body">
              <div className="kpi-label">% Preenchimento</div>
              <Gauge value={pctPreenchimento} color="#4F8EFF" />
            </div>
          </div>
        )}
        <div className="kpi-card">
          <div className="kpi-accent" style={{ background: "linear-gradient(90deg,#00D4A0,#20C0FF)" }} />
          <div className="kpi-body">
            <div className="kpi-label">% Chargeability</div>
            <Gauge value={pctChargeability} color={chargColor(pctChargeability)} />
          </div>
        </div>
        <KpiCard
          label={`Meta ≥${CHARGE_TARGET}%`}
          value={`${acima} ✅ / ${abaixo} 🔴`}
          sub="acima / abaixo da meta"
          grad="linear-gradient(90deg,#6C3FFF,#FF40A0)"
          valueStyle={{ fontSize: 18, whiteSpace: "nowrap" }}
        />
      </div>

      {/* Barras horizontais — clique filtra todos os visuais */}
      <div className="section-title" style={{ marginBottom: 10 }}>
        Distribuição de Horas
        <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--text3)", marginLeft: 8 }}>
          clique em uma barra para filtrar
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <RankBars
          title="Horas Preenchidas"
          items={porColabPreenchidas}
          color="#4F8EFF"
          selected={f.colabs}
          onPick={(v) => toggle("colabs", v)}
        />
        <RankBars
          title="Horas faturáveis por Colaborador"
          items={porColabFaturaveis}
          color="#00C8A0"
          selected={f.colabs}
          onPick={(v) => toggle("colabs", v)}
        />
        <RankBars
          title="Horas faturáveis por Cliente"
          items={porCliente.map((i) => ({ ...i, label: stripPrefix(i.label) }))}
          color="#20C0FF"
          selected={f.clientes}
          onPick={(v) => toggle("clientes", v)}
        />
        <RankBars
          title="Horas por Categoria"
          items={porCategoria.map((i) => ({ ...i, label: rotuloCat(i.label) }))}
          color="#6C3FFF"
          selected={f.cats}
          onPick={(v) => v && toggle("cats", v)}
        />
      </div>

      {/* Série histórica */}
      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-header">
          <span className="chart-title">
            Série histórica {temCapacidade ? "% de preenchimento e chargeability" : "% de chargeability"}
          </span>
          <span className="mono" style={{ fontSize: 9, color: "var(--text3)" }}>
            MêsAno
          </span>
        </div>
        <div style={{ position: "relative", height: 230 }}>
          <ChartCanvas
            deps={[serie]}
            build={(ctx, canvas) => {
              const h = canvas.offsetHeight || 230;
              const gPre = ctx.createLinearGradient(0, 0, 0, h);
              gPre.addColorStop(0, "rgba(108,63,255,0.35)");
              gPre.addColorStop(1, "rgba(108,63,255,0)");
              const gChg = ctx.createLinearGradient(0, 0, 0, h);
              gChg.addColorStop(0, "rgba(32,192,255,0.35)");
              gChg.addColorStop(1, "rgba(32,192,255,0)");
              const datasets = [];
              if (temCapacidade) {
                datasets.push({
                  label: "% Preenchimento",
                  data: serie.map((s) => s.preenchimento),
                  borderColor: "#6C3FFF",
                  borderWidth: 2,
                  pointRadius: 3,
                  pointBackgroundColor: "#6C3FFF",
                  backgroundColor: gPre,
                  fill: true,
                  tension: 0.3,
                  spanGaps: true,
                });
              }
              datasets.push({
                label: "% Chargeability",
                data: serie.map((s) => s.chargeability),
                borderColor: "#20C0FF",
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: "#20C0FF",
                backgroundColor: gChg,
                fill: true,
                tension: 0.3,
                spanGaps: true,
              });
              return {
                type: "line",
                data: { labels: serie.map((s) => s.label), datasets },
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
                          "  " + c.dataset.label + ": " + (c.parsed.y ?? 0) + "%",
                      },
                    },
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: "#9096B0", font: { size: 10 } } },
                    y: {
                      beginAtZero: true,
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
      </div>

      {/* Chargeability por colaborador + billable/non-billable */}
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
                        grid: { color: "rgba(128,136,176,0.12)" },
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
                        data: [Math.round(horasFaturaveis), Math.round(nonBill)],
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
                          const tot = Math.round(horasFaturaveis) + Math.round(nonBill);
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
                Billable ({fmtH(horasFaturaveis)})
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: "#FF5C6A" }} />
                Non-Bill. ({fmtH(nonBill)})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Matriz Nome × Categoria — sem rolagem lateral; a lista rola dentro do card */}
      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Horas por Colaborador e Categoria</span>
          <span className="table-count">
            {matriz.totalColaboradores} colaboradores · maiores totais primeiro
          </span>
        </div>
        <div className="matriz-scroll">
          <table className="matriz">
            <thead>
              <tr>
                <th style={{ width: "15%" }}>Nome</th>
                {matriz.cats.map((c) => (
                  <th
                    key={c}
                    title={rotuloCat(c) + " — clique para filtrar"}
                    onClick={() => toggle("cats", c)}
                  >
                    {abrevCat(c)}
                  </th>
                ))}
                <th style={{ width: "9%" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {matriz.linhas.map((l) => (
                <tr key={l.nome}>
                  <td
                    className="matriz-nome"
                    title={"Filtrar por " + l.nome}
                    onClick={() => toggle("colabs", l.nome)}
                  >
                    {l.nome}
                  </td>
                  {l.valores.map((v, i) => (
                    <td key={i} className="mono">
                      {v > 0 ? fmt2(v) : ""}
                    </td>
                  ))}
                  <td className="mono" style={{ fontWeight: 600, color: "var(--text)" }}>
                    {fmt2(l.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="matriz-total">
                <td style={{ fontWeight: 600, color: "var(--text)" }}>
                  Total ({matriz.totalColaboradores})
                </td>
                {matriz.totaisCol.map((v, i) => (
                  <td key={i} className="mono" style={{ fontWeight: 600, color: "var(--text2)" }}>
                    {v > 0 ? fmt2(v) : ""}
                  </td>
                ))}
                <td className="mono" style={{ fontWeight: 700, color: "var(--text)" }}>
                  {fmt2(matriz.totalGeral)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Cards por colaborador */}
      <div className="section-title" style={{ margin: "20px 0 12px" }}>
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
            <ColabCard
              key={colab}
              colab={colab}
              rows={rows}
              cats={allCats}
              onAbrir={() => setDetalhe(colab)}
            />
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
                  <td
                    style={{ fontWeight: 500, cursor: "pointer" }}
                    title={"Ver detalhe de " + r.colab}
                    onClick={() => setDetalhe(r.colab)}
                  >
                    {r.colab}
                  </td>
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

      {detalhe && (
        <ColabDetalhe colab={detalhe} rows={rows} onClose={() => setDetalhe(null)} />
      )}
    </>
  );
}

function ColabCard({
  colab,
  rows,
  cats,
  onAbrir,
}: {
  colab: string;
  rows: TSRow[];
  cats: string[];
  onAbrir: () => void;
}) {
  const cr = rows.filter((r) => r.c === colab);
  const tot = cr.reduce((a, r) => a + r.h, 0);
  const bill = cr.filter((r) => r.b).reduce((a, r) => a + r.h, 0);
  const charg = tot > 0 ? Math.round((bill / tot) * 100) : 0;
  const col = chargColor(charg);
  const bg = chargBg(charg);
  const label = chargLabel(charg);

  const cliMap: Record<string, number> = {};
  cr.filter((r) => r.b).forEach((r) => (cliMap[r.cl] = (cliMap[r.cl] || 0) + r.h));
  const topCli = Object.entries(cliMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div
      className="colab-card"
      role="button"
      tabIndex={0}
      title={"Ver detalhe de " + colab}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir();
        }
      }}
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
                {MES_ABBR[i]}
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
                  <span>{rotuloCat(cat)}</span>
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
