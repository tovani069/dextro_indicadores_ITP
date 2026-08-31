"use client";

import { useMemo, useState } from "react";

import { fmt2, rotuloCat, stripPrefix } from "@/lib/timesheet";
import type { TSRow } from "@/lib/types";

type Col = "c" | "d" | "cl" | "cat" | "h";

type Props = {
  /** Lançamentos já filtrados pela barra de filtros da seção. */
  rows: TSRow[];
  /** Clique no nome — usado para filtrar a seção pelo colaborador. */
  onColab?: (colab: string) => void;
};

/** Quantas linhas entram por vez, conforme a rolagem chega ao fim. */
const PAGINA = 60;

/** Altura de ~6 linhas: o resto rola dentro do próprio card. */
const ALTURA = 264;

const fmtData = (iso: string) =>
  iso ? `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "";

/**
 * A base de lançamentos como ela é, no formato do relatório de origem:
 * uma linha por lançamento, com nome, data, cliente, categoria, chamado,
 * duração e descrição. Segue o recorte dos filtros da seção.
 */
export default function TabelaLancamentos({ rows, onColab }: Props) {
  const [col, setCol] = useState<Col>("d");
  const [dir, setDir] = useState(-1);
  const [limite, setLimite] = useState(PAGINA);
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.c, r.cl, r.cat, r.ch, r.desc].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [rows, busca]);

  const ordenadas = useMemo(() => {
    const out = [...filtradas];
    out.sort((a, b) => {
      if (col === "h") return (a.h - b.h) * dir;
      // Empate na data cai para o nome, para a lista não dançar a cada render.
      const cmp = String(a[col] ?? "").localeCompare(String(b[col] ?? ""), "pt-BR");
      return (cmp || a.c.localeCompare(b.c, "pt-BR")) * dir;
    });
    return out;
  }, [filtradas, col, dir]);

  const visiveis = ordenadas.slice(0, limite);

  function ordenar(c: Col) {
    if (col === c) setDir((d) => d * -1);
    else {
      setCol(c);
      setDir(c === "h" || c === "d" ? -1 : 1);
    }
    setLimite(PAGINA);
  }

  const seta = (c: Col) => (col === c ? (dir === 1 ? " ↑" : " ↓") : "");

  return (
    <div className="table-card">
      <div className="table-header">
        <span className="table-title">Preenchimento dia a dia</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            className="input-busca"
            placeholder="Buscar nome, cliente, chamado, descrição…"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setLimite(PAGINA);
            }}
          />
          <span className="table-count">
            {ordenadas.length.toLocaleString("pt-BR")} lançamentos
          </span>
        </div>
      </div>

      <div
        style={{ maxHeight: ALTURA, overflow: "auto" }}
        // Sem botão: chegando perto do fim da rolagem, entra mais um punhado
        // de linhas. Renderizar as 33 mil de uma vez travaria a página.
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
            setLimite((l) => (l < ordenadas.length ? l + PAGINA : l));
          }
        }}
      >
        <table>
          <thead>
            <tr>
              <th style={{ position: "sticky", top: 0, zIndex: 2, width: 44, cursor: "default" }}>#</th>
              <th style={{ position: "sticky", top: 0, zIndex: 2 }} onClick={() => ordenar("c")}>
                Nome{seta("c")}
              </th>
              <th style={{ position: "sticky", top: 0, zIndex: 2, width: 92 }} onClick={() => ordenar("d")}>
                Data{seta("d")}
              </th>
              <th style={{ position: "sticky", top: 0, zIndex: 2 }} onClick={() => ordenar("cl")}>
                Cliente{seta("cl")}
              </th>
              <th style={{ position: "sticky", top: 0, zIndex: 2 }} onClick={() => ordenar("cat")}>
                Categoria{seta("cat")}
              </th>
              <th style={{ position: "sticky", top: 0, zIndex: 2, cursor: "default" }}>
                Número do Chamado/Contrato
              </th>
              <th
                style={{ position: "sticky", top: 0, zIndex: 2, textAlign: "right", width: 110 }}
                onClick={() => ordenar("h")}
              >
                Duração (Horas){seta("h")}
              </th>
              <th style={{ position: "sticky", top: 0, zIndex: 2, cursor: "default" }}>Descrição</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: "var(--text3)", padding: 20 }}>
                  Nenhum lançamento para os filtros selecionados.
                </td>
              </tr>
            )}
            {visiveis.map((r, i) => (
              <tr key={`${r.c}|${r.d}|${r.cl}|${r.cat}|${i}`}>
                <td className="mono" style={{ fontSize: 11, color: "var(--text3)" }}>
                  {i + 1}
                </td>
                <td
                  style={{ whiteSpace: "nowrap", cursor: onColab ? "pointer" : undefined }}
                  title={onColab ? "Filtrar por " + r.c : undefined}
                  onClick={() => onColab?.(r.c)}
                >
                  {r.c}
                </td>
                <td className="mono" style={{ whiteSpace: "nowrap" }}>
                  {fmtData(r.d)}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{stripPrefix(r.cl)}</td>
                <td style={{ whiteSpace: "nowrap", color: r.b ? "#00C8A0" : "var(--text2)" }}>
                  {rotuloCat(r.cat)}
                </td>
                <td className="mono" style={{ fontSize: 11 }}>
                  {r.ch ?? ""}
                </td>
                <td className="mono" style={{ textAlign: "right" }}>
                  {fmt2(r.h)}
                </td>
                <td style={{ fontSize: 11, color: "var(--text3)" }}>{r.desc ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        {visiveis.length.toLocaleString("pt-BR")} de {ordenadas.length.toLocaleString("pt-BR")}
        {visiveis.length < ordenadas.length && " · role a tabela para ver mais"}
      </div>
    </div>
  );
}
