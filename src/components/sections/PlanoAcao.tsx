"use client";

import { useMemo, useState } from "react";

import KpiCard from "@/components/KpiCard";
import { OBJ_COLORS, PLANO_STATUS_COLORS } from "@/lib/constants";
import { useData } from "@/lib/data-context";
import { splitHighlight } from "@/lib/format";
import type { PlanoRow } from "@/lib/types";

const OBJETIVOS = [
  "4.1 Fortalecer e Aperfeiçoar o MDR e Suporte",
  "4.2 Implantar Cultura de Gestão de Projetos",
  "1.1 Implantar a Cultura de Gestão Orientada para Indicadores",
];

const PRIO_COLORS: Record<string, string> = { Alta: "#FF5C6A", Normal: "#8890B0" };

type SortCol = keyof Pick<PlanoRow, "atividade" | "objetivo" | "prazo" | "prioridade">;

export default function PlanoAcao() {
  const { plano } = useData();
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fObj, setFObj] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("prazo");
  const [sortDir, setSortDir] = useState(1);

  const total = plano.length;
  const concluidas = plano.filter((a) => a.status === "Concluído").length;
  const andamento = plano.filter((a) => a.status === "Em andamento").length;
  const naoIniciado = plano.filter((a) => a.status === "Não iniciado").length;
  const pastDue = plano.filter((a) => a.farol === "⏰ Past Due").length;
  const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  // Progresso por objetivo estratégico
  const objs = useMemo(() => {
    const map: Record<string, { total: number; done: number; andamento: number }> = {};
    plano.forEach((a) => {
      const o = a.objetivo || "—";
      if (!map[o]) map[o] = { total: 0, done: 0, andamento: 0 };
      map[o].total++;
      if (a.status === "Concluído") map[o].done++;
      if (a.status === "Em andamento") map[o].andamento++;
    });
    return Object.entries(map).filter(([k]) => k !== "—");
  }, [plano]);

  const data = useMemo(() => {
    const filtered = plano.filter((a) => {
      if (fStatus && a.status !== fStatus) return false;
      if (fObj && a.objetivo !== fObj) return false;
      if (search && !a.atividade.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const va = a[sortCol] || "";
      const vb = b[sortCol] || "";
      return String(va).localeCompare(String(vb)) * sortDir;
    });
  }, [plano, fStatus, fObj, search, sortCol, sortDir]);

  function sortBy(col: SortCol) {
    if (sortCol === col) setSortDir((d) => d * -1);
    else {
      setSortCol(col);
      setSortDir(1);
    }
  }

  return (
    <>
      <div className="section-title">📋 Plano de Ação · Diretoria de Operações</div>

      <div
        className="plano-kpis"
        style={{ gridTemplateColumns: "repeat(5,1fr)", marginBottom: 20 }}
      >
        <KpiCard label="Total de Ações" value={total} grad="linear-gradient(90deg,#6C3FFF,#4F8EFF)" />
        <KpiCard label="Concluídas" value={concluidas} grad="linear-gradient(90deg,#00D4A0,#20C0FF)" />
        <KpiCard label="Em Andamento" value={andamento} grad="linear-gradient(90deg,#4F8EFF,#20C0FF)" />
        <KpiCard label="Não Iniciadas" value={naoIniciado} grad="linear-gradient(90deg,#FF9B00,#FFB020)" />
        <KpiCard label="⏰ Past Due" value={pastDue} grad="linear-gradient(90deg,#FF5C6A,#FF8C00)" />
      </div>

      {/* Progresso global */}
      <div className="prog-global-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text2)" }}>
            Progresso Global do Plano de Ação · Diretoria de Operações
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
        {objs.map(([k, v]) => {
          const p = Math.round((v.done / v.total) * 100);
          const col = OBJ_COLORS[k] || "#6C3FFF";
          return (
            <div key={k} style={{ marginBottom: 14 }}>
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
                  {k}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 12, fontWeight: 600, color: col }}
                >
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
                  {v.andamento} Em andamento
                </span>
                <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: "var(--bg4)", color: "var(--text3)" }}>
                  {v.total - v.done - v.andamento} Não iniciadas
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

      {/* Tabela */}
      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Ações do Plano</span>
          <span className="table-count">{data.length} ações</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              className="filter-sel"
              style={{ width: "auto", margin: 0 }}
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
            >
              <option value="">Todos os Status</option>
              <option>Concluído</option>
              <option>Em andamento</option>
              <option>Não iniciado</option>
            </select>
            <select
              className="filter-sel"
              style={{ width: "auto", margin: 0, maxWidth: 220 }}
              value={fObj}
              onChange={(e) => setFObj(e.target.value)}
            >
              <option value="">Todos os Objetivos</option>
              {OBJETIVOS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <input
              className="search-box"
              placeholder="Buscar ação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>Status</th>
              <th onClick={() => sortBy("atividade")}>Atividade ↕</th>
              <th onClick={() => sortBy("objetivo")}>Objetivo</th>
              <th onClick={() => sortBy("prazo")}>Prazo</th>
              <th onClick={() => sortBy("prioridade")}>Prioridade</th>
              <th>Farol</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a, i) => {
              const sc = PLANO_STATUS_COLORS[a.status] || PLANO_STATUS_COLORS["Não iniciado"];
              const oc = OBJ_COLORS[a.objetivo] || "#6E748A";
              const objShort = (a.objetivo || "—").replace(/^\d+\.\d+\s+/, "");
              const objLabel = objShort.length > 35 ? objShort.slice(0, 33) + "…" : objShort;
              return (
                <tr key={a.atividade + i}>
                  <td>
                    <span className="status-badge" style={{ background: sc.bg, color: sc.color }}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ maxWidth: 280 }}>
                    {splitHighlight(a.atividade, search).map((part, j) =>
                      part.hit ? (
                        <em key={j} className="hl">
                          {part.text}
                        </em>
                      ) : (
                        <span key={j}>{part.text}</span>
                      ),
                    )}
                  </td>
                  <td>
                    <span
                      className="dir-badge"
                      style={{ background: oc + "22", color: oc, fontSize: 9 }}
                      title={a.objetivo || "—"}
                    >
                      {objLabel}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {a.prazo}
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        background: a.prioridade === "Alta" ? "rgba(255,92,106,.15)" : "var(--bg4)",
                        color: PRIO_COLORS[a.prioridade] || "#8890B0",
                      }}
                    >
                      {a.prioridade}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{a.farol || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="table-footer">
          Exibindo {data.length} de {plano.length} ações da Diretoria de Operações
        </div>
      </div>
    </>
  );
}
