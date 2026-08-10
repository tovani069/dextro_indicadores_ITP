"use client";

import { useMemo, useState } from "react";

import FilterDropdown from "@/components/FilterDropdown";
import FiltrosAtivos, { type Pill } from "@/components/FiltrosAtivos";
import KpiCard from "@/components/KpiCard";
import { OBJ_COLORS, PERSPECTIVA_CORES, PLANO_EXEC_CORES } from "@/lib/constants";
import { useData } from "@/lib/data-context";
import { splitHighlight } from "@/lib/format";
import type { PlanoRow } from "@/lib/types";

type SortCol = "atividade" | "objetivo" | "prazo" | "execucao";

type Filtros = {
  anos: string[];
  perspectivas: string[];
  execucoes: string[];
  objetivos: string[];
};

const VAZIO: Filtros = { anos: [], perspectivas: [], execucoes: [], objetivos: [] };

/** "5. Concluído" → "Concluído" */
const semPrefixo = (s: string) => s.replace(/^\d+\.\s*/, "");

/** Data ISO → dd/mm/aaaa */
function dataBR(iso: string) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** Dias de atraso de uma ação em aberto. */
function diasAtraso(r: PlanoRow) {
  if (!r.prazo || r.concluido) return 0;
  const hoje = new Date();
  const prazo = new Date(r.prazo + "T00:00:00");
  const dias = Math.floor((hoje.getTime() - prazo.getTime()) / 86400000);
  return dias > 0 ? dias : 0;
}

export default function PlanoAcao() {
  const { plano, planoCarregando } = useData();
  const [f, setF] = useState<Filtros>(VAZIO);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("prazo");
  const [sortDir, setSortDir] = useState(1);

  const opcoes = useMemo(() => {
    const unicos = (fn: (r: PlanoRow) => string) =>
      [...new Set(plano.map(fn).filter(Boolean))].sort();
    return {
      anos: [...new Set(plano.map((r) => String(r.ano)))].sort(),
      perspectivas: unicos((r) => r.perspectiva),
      execucoes: unicos((r) => r.execucao),
      objetivos: unicos((r) => r.objetivo),
    };
  }, [plano]);

  const rows = useMemo(
    () =>
      plano.filter((r) => {
        if (f.anos.length && !f.anos.includes(String(r.ano))) return false;
        if (f.perspectivas.length && !f.perspectivas.includes(r.perspectiva)) return false;
        if (f.execucoes.length && !f.execucoes.includes(r.execucao)) return false;
        if (f.objetivos.length && !f.objetivos.includes(r.objetivo)) return false;
        return true;
      }),
    [plano, f],
  );

  const tabela = useMemo(() => {
    const q = search.toLowerCase();
    const filtradas = q ? rows.filter((r) => r.atividade.toLowerCase().includes(q)) : rows;
    return [...filtradas].sort(
      (a, b) => String(a[sortCol] || "").localeCompare(String(b[sortCol] || "")) * sortDir,
    );
  }, [rows, search, sortCol, sortDir]);

  function toggle(grupo: keyof Filtros, valor: string) {
    setF((p) => ({
      ...p,
      [grupo]: p[grupo].includes(valor)
        ? p[grupo].filter((v) => v !== valor)
        : [...p[grupo], valor],
    }));
  }

  function sortBy(col: SortCol) {
    if (sortCol === col) setSortDir((d) => d * -1);
    else {
      setSortCol(col);
      setSortDir(1);
    }
  }

  const pills: Pill[] = [];
  (
    [
      ["anos", "Ano"],
      ["perspectivas", "Perspectiva"],
      ["execucoes", "Execução"],
      ["objetivos", "Objetivo"],
    ] as const
  ).forEach(([grupo, rotulo]) => {
    f[grupo].forEach((v) => pills.push({ grupo, rotulo, valor: v, texto: semPrefixo(v) }));
  });

  // ── Números ─────────────────────────────────────────────────────────
  const total = rows.length;
  const concluidas = rows.filter((r) => r.concluido).length;
  const emExecucao = rows.filter((r) => !r.concluido && r.execucao.startsWith("2")).length;
  const naoIniciadas = rows.filter((r) => !r.concluido && r.execucao.startsWith("1")).length;
  const emAtraso = rows.filter((r) => r.status === "Em Atraso").length;
  const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  /** Progresso por objetivo estratégico (só os preenchidos). */
  const porObjetivo = useMemo(() => {
    const m: Record<string, { total: number; done: number; exec: number }> = {};
    rows.forEach((r) => {
      if (!r.objetivo) return;
      m[r.objetivo] = m[r.objetivo] || { total: 0, done: 0, exec: 0 };
      m[r.objetivo].total++;
      if (r.concluido) m[r.objetivo].done++;
      else if (r.execucao.startsWith("2")) m[r.objetivo].exec++;
    });
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  if (planoCarregando && !plano.length) {
    return (
      <>
        <div className="section-title">📋 Plano de Ação · Planejamento Estratégico ITP</div>
        <div style={{ color: "var(--text3)", fontSize: 13, padding: 20 }}>
          Lendo o plano no Smartsheet…
        </div>
      </>
    );
  }

  if (!plano.length) {
    return (
      <>
        <div className="section-title">📋 Plano de Ação · Planejamento Estratégico ITP</div>
        <div style={{ color: "var(--text3)", fontSize: 13, padding: 20 }}>
          Não foi possível ler o plano no Smartsheet. Recarregue a página em alguns instantes.
        </div>
      </>
    );
  }

  return (
    <>
      <div className="section-title">📋 Plano de Ação · Planejamento Estratégico ITP</div>

      {/* Filtros */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 16,
          padding: "9px 12px",
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}
      >
        <FilterDropdown
          label="Ano"
          options={opcoes.anos.map((a) => ({ value: a, label: a }))}
          selected={f.anos}
          onToggle={(v) => toggle("anos", v)}
        />
        <FilterDropdown
          label="Perspectiva"
          wide
          options={opcoes.perspectivas.map((p) => ({
            value: p,
            label: semPrefixo(p),
            color: PERSPECTIVA_CORES[p.charAt(0)] || "#6C3FFF",
          }))}
          selected={f.perspectivas}
          onToggle={(v) => toggle("perspectivas", v)}
        />
        <FilterDropdown
          label="Execução"
          options={opcoes.execucoes.map((e) => ({
            value: e,
            label: semPrefixo(e),
            color: PLANO_EXEC_CORES[e.charAt(0)] || "#8890B0",
          }))}
          selected={f.execucoes}
          onToggle={(v) => toggle("execucoes", v)}
        />
        <FilterDropdown
          label="Objetivo"
          wide
          searchable
          options={opcoes.objetivos.map((o) => ({ value: o, label: o }))}
          selected={f.objetivos}
          onToggle={(v) => toggle("objetivos", v)}
        />
        <input
          className="search-box"
          placeholder="Buscar ação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ width: 1, height: 24, background: "var(--border2)", margin: "0 2px" }} />
        <button className="btn-link" onClick={() => setF(VAZIO)}>
          ✕ Limpar
        </button>
        <FiltrosAtivos
          pills={pills}
          onRemove={(grupo, valor) => toggle(grupo as keyof Filtros, valor)}
        />
      </div>

      {/* KPIs */}
      <div
        className="plano-kpis"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", marginBottom: 20 }}
      >
        <KpiCard label="Total de Ações" numero={total} formatar={(n) => String(Math.round(n))} grad="linear-gradient(90deg,#6C3FFF,#4F8EFF)" />
        <KpiCard label="Concluídas" numero={concluidas} formatar={(n) => String(Math.round(n))} grad="linear-gradient(90deg,#00D4A0,#20C0FF)" />
        <KpiCard label="Em Execução" numero={emExecucao} formatar={(n) => String(Math.round(n))} grad="linear-gradient(90deg,#4F8EFF,#20C0FF)" />
        <KpiCard label="Não Iniciadas" numero={naoIniciadas} formatar={(n) => String(Math.round(n))} grad="linear-gradient(90deg,#FF9B00,#FFB020)" />
        <KpiCard label="⏰ Em Atraso" numero={emAtraso} formatar={(n) => String(Math.round(n))} grad="linear-gradient(90deg,#FF5C6A,#FF8C00)" />
      </div>

      {/* Progresso global */}
      <div className="prog-global-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text2)" }}>
            Progresso Global do Plano Estratégico
          </span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
            {pct}%
          </span>
        </div>
        <div className="prog-global-bar">
          <div className="prog-global-fill" style={{ width: pct + "%" }} />
        </div>
      </div>

      {/* Progresso por objetivo */}
      {porObjetivo.length > 0 && (
        <>
          <div className="section-title" style={{ marginBottom: 14 }}>
            Progresso por Objetivo Estratégico
          </div>
          <div
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "18px 22px",
              marginBottom: 20,
              boxShadow: "var(--shadow)",
            }}
          >
            {porObjetivo.map(([obj, v]) => {
              const p = Math.round((v.done / v.total) * 100);
              const col = OBJ_COLORS[obj] || PERSPECTIVA_CORES[obj.charAt(0)] || "#6C3FFF";
              return (
                <div key={obj} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{ fontSize: 11, color: "var(--text2)", flex: 1, marginRight: 12, fontWeight: 500 }}
                    >
                      {obj}
                    </span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: col }}>
                      {p}%{" "}
                      <span style={{ color: "var(--text3)", fontWeight: 400, fontSize: 9 }}>
                        ({v.done}/{v.total} conc.)
                      </span>
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                    <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: "rgba(0,200,160,.15)", color: "#00C8A0" }}>
                      {v.done} Concluídas
                    </span>
                    <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: "rgba(79,142,255,.15)", color: "#4F8EFF" }}>
                      {v.exec} Em execução
                    </span>
                    <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: "var(--bg4)", color: "var(--text3)" }}>
                      {v.total - v.done - v.exec} Demais
                    </span>
                  </div>
                  <div style={{ height: 8, background: "var(--bg4)", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        width: p + "%",
                        height: "100%",
                        borderRadius: 4,
                        background: `linear-gradient(90deg,${col}EE,${col}66)`,
                        transition: "width .6s",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Tabela */}
      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Ações do Plano</span>
          <span className="table-count">{tabela.length} ações</span>
        </div>
        <table>
          <thead>
            <tr>
              <th onClick={() => sortBy("execucao")} style={{ width: 130 }}>
                Execução
              </th>
              <th onClick={() => sortBy("atividade")}>Ação ↕</th>
              <th onClick={() => sortBy("objetivo")} style={{ minWidth: 150 }}>
                Objetivo
              </th>
              <th style={{ minWidth: 120 }}>Responsável</th>
              <th onClick={() => sortBy("prazo")} style={{ minWidth: 90 }}>
                Prazo
              </th>
              <th style={{ minWidth: 90 }}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {tabela.map((r, i) => {
              const cor = PLANO_EXEC_CORES[r.execucao.charAt(0)] || "#8890B0";
              const objCor = OBJ_COLORS[r.objetivo] || PERSPECTIVA_CORES[r.objetivo.charAt(0)] || "#6E748A";
              const atraso = diasAtraso(r);
              return (
                <tr key={r.atividade + r.ano + i}>
                  <td>
                    <span className="status-badge" style={{ background: cor + "22", color: cor }}>
                      {semPrefixo(r.execucao) || "—"}
                    </span>
                  </td>
                  <td style={{ maxWidth: 340 }}>
                    {splitHighlight(r.atividade, search).map((part, j) =>
                      part.hit ? (
                        <em key={j} className="hl">
                          {part.text}
                        </em>
                      ) : (
                        <span key={j}>{part.text}</span>
                      ),
                    )}
                    <span className="mono" style={{ fontSize: 9, color: "var(--text3)", marginLeft: 6 }}>
                      {r.ano}
                    </span>
                  </td>
                  <td>
                    {r.objetivo ? (
                      <span
                        className="dir-badge"
                        style={{ background: objCor + "22", color: objCor, fontSize: 9 }}
                        title={r.objetivo}
                      >
                        {r.objetivo.length > 34 ? r.objetivo.slice(0, 32) + "…" : r.objetivo}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ fontSize: 11 }}>{r.responsavel || "—"}</td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {dataBR(r.prazo)}
                  </td>
                  <td>
                    {r.concluido ? (
                      <span className="status-badge" style={{ background: "rgba(0,200,160,.15)", color: "#00C8A0" }}>
                        ✅ Concluída
                      </span>
                    ) : atraso > 0 ? (
                      <span className="status-badge" style={{ background: "rgba(255,92,106,.15)", color: "#FF5C6A" }}>
                        ⏰ {atraso}d de atraso
                      </span>
                    ) : (
                      <span className="status-badge" style={{ background: "var(--bg4)", color: "var(--text3)" }}>
                        {r.status || "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="table-footer">
          Exibindo {tabela.length} de {plano.length} ações do Planejamento Estratégico ITP
        </div>
      </div>
    </>
  );
}
