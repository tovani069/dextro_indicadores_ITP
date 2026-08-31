"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { MES_ABBR } from "@/lib/constants";
import { JORNADA_PADRAO, ehDiaUtil } from "@/lib/capacidade";
import { rotuloCat, stripPrefix } from "@/lib/timesheet";
import type { TSRow } from "@/lib/types";

type Props = {
  colab: string;
  /** Lançamentos do colaborador, já filtrados pela barra de filtros da seção. */
  linhas: TSRow[];
  /** Período dos filtros (YYYY-MM-DD); vazio = sem limite. */
  periodo?: { de: string; ate: string };
  onClose: () => void;
};

export type Dia = {
  iso: string;
  /** Chave do mês (`YYYY-MM`), usada para agrupar. */
  mes: string;
  horas: number;
  billable: number;
  util: boolean;
  cats: string[];
  clientes: string[];
};

const DIA_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

const proximoDia = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
};

const ultimoDoMes = (iso: string) => {
  const [a, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
};

const semanaDe = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return DIA_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
};

/** Horas com no máximo uma casa — 7,5h não pode virar 8h aqui. */
export const fmtHd = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "h";

const rotuloMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return `${MES_ABBR[m - 1]}/${a}`;
};

export const corDia = (d: Dia) =>
  !d.util ? "#6C3FFF" : d.horas >= JORNADA_PADRAO ? "#00C8A0" : d.horas > 0 ? "#FF9B00" : "#FF5C6A";

/**
 * Monta o dia a dia do colaborador a partir dos lançamentos já filtrados:
 * um item por dia útil da janela — inclusive os que ficaram em branco, que é
 * onde o "% Preenchimento" se perde — mais os fins de semana com lançamento.
 */
export function useDiasPreenchimento(linhas: TSRow[], periodo?: { de: string; ate: string }) {
  const dias = useMemo<Dia[]>(() => {
    const porDia = new Map<string, TSRow[]>();
    linhas.forEach((r) => {
      if (!r.d) return;
      const l = porDia.get(r.d);
      if (l) l.push(r);
      else porDia.set(r.d, [r]);
    });
    const datas = [...porDia.keys()].sort();
    if (!datas.length) return [];

    // A janela cobre os meses inteiros com lançamentos — a capacidade também é
    // mensal (dias úteis × jornada), então os dias vazios do mês entram na
    // conta. O período dos filtros e a data de hoje só apertam essa janela.
    const ultimo = datas[datas.length - 1];
    let ini = datas[0].slice(0, 8) + "01";
    let fim = ultimoDoMes(ultimo);
    if (periodo?.de && periodo.de > ini) ini = periodo.de;
    if (periodo?.ate && periodo.ate < fim) fim = periodo.ate;
    const hoje = hojeISO();
    if (fim > hoje) fim = hoje > ultimo ? hoje : ultimo;

    const out: Dia[] = [];
    for (let iso = ini; iso <= fim; iso = proximoDia(iso)) {
      const rs = porDia.get(iso);
      const util = ehDiaUtil(iso);
      // Fim de semana e feriado só aparecem quando houve lançamento neles.
      if (!util && !rs) continue;
      const horas = rs?.reduce((a, r) => a + r.h, 0) ?? 0;
      out.push({
        iso,
        mes: iso.slice(0, 7),
        horas,
        billable: rs?.filter((r) => r.b).reduce((a, r) => a + r.h, 0) ?? 0,
        util,
        cats: [...new Set(rs?.map((r) => rotuloCat(r.cat)) ?? [])],
        clientes: [...new Set(rs?.filter((r) => r.b).map((r) => stripPrefix(r.cl)) ?? [])],
      });
    }
    return out;
  }, [linhas, periodo]);

  const resumo = useMemo(() => {
    const uteis = dias.filter((d) => d.util);
    const preenchidos = uteis.filter((d) => d.horas > 0);
    const horas = dias.reduce((a, d) => a + d.horas, 0);
    const meta = uteis.length * JORNADA_PADRAO;
    return {
      uteis: uteis.length,
      preenchidos: preenchidos.length,
      vazios: uteis.length - preenchidos.length,
      horas,
      meta,
      pct: meta > 0 ? Math.round((horas / meta) * 100) : 0,
    };
  }, [dias]);

  /** Totais por mês, para a linha de separação da tabela. */
  const totaisMes = useMemo(() => {
    const m = new Map<string, { horas: number; uteis: number }>();
    dias.forEach((d) => {
      const t = m.get(d.mes) ?? { horas: 0, uteis: 0 };
      t.horas += d.horas;
      if (d.util) t.uteis++;
      m.set(d.mes, t);
    });
    return m;
  }, [dias]);

  return { dias, resumo, totaisMes };
}

/** A planilha em si — usada no card da seção e no detalhe do colaborador. */
export function TabelaDias({
  dias,
  totaisMes,
  alturaMax,
}: {
  dias: Dia[];
  totaisMes: Map<string, { horas: number; uteis: number }>;
  /** Quando definida, a tabela rola dentro dessa altura. */
  alturaMax?: string;
}) {
  return (
    <div
      style={{
        maxHeight: alturaMax,
        overflowY: alturaMax ? "auto" : undefined,
        border: "1px solid var(--border)",
        borderRadius: 10,
      }}
    >
      <table>
        <thead>
          <tr>
            {["Dia", "Horas", "Billable", "Categorias", "Clientes"].map((h, i) => (
              <th
                key={h}
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  cursor: "default",
                  textAlign: i === 1 || i === 2 ? "right" : "left",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dias.map((d, i) => {
            const novoMes = i === 0 || d.mes !== dias[i - 1].mes;
            const t = totaisMes.get(d.mes);
            const cor = corDia(d);
            const pct = Math.min(d.horas / JORNADA_PADRAO, 1) * 100;
            return [
              novoMes && t ? (
                <tr key={"m" + d.mes}>
                  <td
                    colSpan={5}
                    style={{
                      background: "var(--bg3)",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: ".6px",
                      color: "var(--text3)",
                    }}
                  >
                    {rotuloMes(d.mes)}
                    <span className="mono" style={{ float: "right", textTransform: "none", letterSpacing: 0 }}>
                      {fmtHd(t.horas)} de {fmtHd(t.uteis * JORNADA_PADRAO)}
                    </span>
                  </td>
                </tr>
              ) : null,
              <tr key={d.iso}>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: cor, flexShrink: 0 }} />
                    <span className="mono" style={{ color: d.horas ? "var(--text)" : "var(--text3)" }}>
                      {d.iso.slice(8)}/{d.iso.slice(5, 7)}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>{semanaDe(d.iso)}</span>
                  </div>
                </td>
                <td style={{ textAlign: "right", minWidth: 96 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div
                      style={{ width: 42, height: 5, background: "var(--bg4)", borderRadius: 3, overflow: "hidden" }}
                    >
                      <div style={{ width: pct + "%", height: "100%", background: cor }} />
                    </div>
                    <span className="mono" style={{ color: d.horas ? "var(--text)" : "#FF5C6A" }}>
                      {d.horas ? fmtHd(d.horas) : "—"}
                    </span>
                  </div>
                </td>
                <td className="mono" style={{ textAlign: "right", color: "#00C8A0" }}>
                  {d.billable ? fmtHd(d.billable) : ""}
                </td>
                <td style={{ fontSize: 11 }}>{d.cats.join(", ")}</td>
                <td style={{ fontSize: 11, color: "var(--text3)" }}>{d.clientes.join(", ")}</td>
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Números do período, na mesma ordem no card da seção e no modal. */
export function ResumoDias({
  resumo,
  compacto,
}: {
  resumo: ReturnType<typeof useDiasPreenchimento>["resumo"];
  compacto?: boolean;
}) {
  const itens = [
    { rotulo: "Dias úteis", valor: String(resumo.uteis), cor: "var(--text)" },
    { rotulo: "Preenchidos", valor: String(resumo.preenchidos), cor: "#00C8A0" },
    {
      rotulo: "Sem lançamento",
      valor: String(resumo.vazios),
      cor: resumo.vazios ? "#FF5C6A" : "var(--text3)",
    },
    { rotulo: "Horas lançadas", valor: fmtHd(resumo.horas), cor: "var(--text)" },
    { rotulo: `de ${fmtHd(resumo.meta)}`, valor: resumo.pct + "%", cor: "var(--text2)" },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(112px,1fr))",
        gap: 8,
      }}
    >
      {itens.map((k) => (
        <div
          key={k.rotulo}
          style={{
            background: "var(--bg3)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: compacto ? "6px 10px" : "8px 12px",
          }}
        >
          <div className="kpi-label">{k.rotulo}</div>
          <div className="mono" style={{ fontSize: compacto ? 14 : 16, fontWeight: 600, color: k.cor }}>
            {k.valor}
          </div>
        </div>
      ))}
    </div>
  );
}

export const NOTA_JORNADA = `Jornada de referência: ${JORNADA_PADRAO}h por dia útil. Fins de semana e feriados só aparecem quando houve lançamento.`;

/**
 * Relatório dia a dia do preenchimento do colaborador, sobreposto ao card de
 * detalhe.
 */
export default function ColabDias({ colab, linhas, periodo, onClose }: Props) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisivel(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { dias, resumo, totaisMes } = useDiasPreenchimento(linhas, periodo);

  const conteudo = (
    <div
      className={"modal-overlay" + (visivel ? " show" : "")}
      style={{ zIndex: 9995 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={"Preenchimento dia a dia de " + colab}
    >
      <div className={"modal-card" + (visivel ? " anim-cartao" : "")} style={{ width: "min(96vw,780px)" }}>
        <div className="modal-topo">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
              Preenchimento dia a dia
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
              {colab} · {linhas.length.toLocaleString("pt-BR")} lançamentos no recorte atual
            </div>
          </div>
          <button className="modal-fechar" onClick={onClose} title="Fechar (Esc)" aria-label="Fechar">
            ×
          </button>
        </div>

        <div style={{ padding: "14px 22px 0" }}>
          <ResumoDias resumo={resumo} />
        </div>

        <div style={{ padding: "14px 22px 22px" }}>
          {dias.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text3)", padding: "20px 0" }}>
              Nenhum lançamento no recorte atual.
            </div>
          ) : (
            <TabelaDias dias={dias} totaisMes={totaisMes} alturaMax="52vh" />
          )}
          <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 8 }}>{NOTA_JORNADA}</div>
        </div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(conteudo, document.body);
}
