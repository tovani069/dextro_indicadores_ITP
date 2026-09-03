"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useData } from "@/lib/data-context";
import {
  limparMapa,
  mapaDoPlano,
  mapaSalvo,
  MAX_OBJETIVOS,
  salvarMapa,
  type IconeId,
  type MapaDados,
} from "@/lib/mapa";

/** Ícones do mapa — os mesmos traços do dashboard da Premazon. */
const ICONES: Record<IconeId, React.ReactNode> = {
  missao: (
    <>
      <circle cx="11" cy="13" r="8" />
      <circle cx="11" cy="13" r="4" />
      <circle cx="11" cy="13" r="1" />
      <path d="M11 13 21 3" />
      <path d="M17 3h4v4" />
    </>
  ),
  visao: (
    <>
      <path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  valores: (
    <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1Z" />
  ),
  lideranca: (
    <>
      <rect x="2.5" y="3.5" width="19" height="14" rx="1.5" />
      <path d="M12 17.5v3M8 20.5h8" />
      <path d="M6.5 13.5V9M10.5 13.5V6.5M14.5 13.5v-3M18.5 13.5V8" />
    </>
  ),
  financas: (
    <>
      <rect x="2.5" y="7.5" width="15" height="9" rx="1.5" />
      <circle cx="10" cy="12" r="2.2" />
      <path d="M6.5 4.5h15v9" />
    </>
  ),
  mercado: (
    <>
      <path d="M6.5 21.5V10l4.5-8a2.6 2.6 0 0 1 2.5 3l-1 5h5.6a2.4 2.4 0 0 1 2.3 3l-1.6 7a2.4 2.4 0 0 1-2.3 1.5Z" />
      <rect x="1.5" y="10" width="5" height="11.5" rx="1" />
    </>
  ),
  processos: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" />
    </>
  ),
  pessoas: (
    <>
      <circle cx="12" cy="5" r="2.8" />
      <path d="M12 10.5v7" />
      <path d="M12 12c-1.6-1.6-5-2-5 1.5S9.5 19 12 19s5-2 5-5.5-3.4-3.1-5-1.5Z" />
    </>
  ),
};

function Icone({ id, tamanho }: { id: IconeId; tamanho: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={tamanho > 27 ? 1.4 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONES[id]}
    </svg>
  );
}

const TITULO = "🗺️ Mapa Estratégico · Planejamento Estratégico ITP";

/** O que o editor está editando no momento. */
type Alvo =
  | { tipo: "mvv"; i: number }
  | { tipo: "obj"; i: number; j: number }
  | { tipo: "novo"; i: number };

export default function MapaEstrategico() {
  const { plano, planoCarregando } = useData();

  /** O mapa do plano é o padrão; o que foi editado na tela tem prioridade. */
  const padrao = useMemo(() => mapaDoPlano(plano), [plano]);
  const [dados, setDados] = useState<MapaDados | null>(null);
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  // O que está salvo só é lido no cliente — o servidor não tem localStorage.
  useEffect(() => {
    setDados(mapaSalvo() ?? padrao);
  }, [padrao]);

  const ciclos = useMemo(
    () => [...new Set(plano.map((r) => r.ano))].sort((a, b) => a - b),
    [plano],
  );
  const periodo =
    ciclos.length === 0
      ? ""
      : ciclos.length === 1
        ? String(ciclos[0])
        : `${ciclos[0]}–${ciclos[ciclos.length - 1]}`;

  if (!dados || (planoCarregando && !plano.length)) {
    return (
      <>
        <div className="section-title">{TITULO}</div>
        <div style={{ color: "var(--text3)", fontSize: 13, padding: 20 }}>
          Lendo o plano no Smartsheet…
        </div>
      </>
    );
  }

  const editado = mapaSalvo() !== null;

  function aplicar(novo: MapaDados) {
    setDados(novo);
    salvarMapa(novo);
  }

  function abrir(a: Alvo) {
    setAlvo(a);
    setConfirmandoExclusao(false);
    if (a.tipo === "mvv") setRascunho(dados!.mvv[a.i].txt);
    else if (a.tipo === "obj") setRascunho(dados!.persp[a.i].objs[a.j]);
    else setRascunho("");
  }

  function gravar() {
    if (!alvo || !dados) return;
    const texto = rascunho.trim();
    if (!texto) {
      setAlvo(null);
      return;
    }
    const novo: MapaDados = {
      mvv: dados.mvv.map((m) => ({ ...m })),
      persp: dados.persp.map((p) => ({ ...p, objs: [...p.objs] })),
    };
    if (alvo.tipo === "mvv") novo.mvv[alvo.i].txt = texto;
    else if (alvo.tipo === "obj") novo.persp[alvo.i].objs[alvo.j] = texto;
    else novo.persp[alvo.i].objs.push(texto);
    aplicar(novo);
    setAlvo(null);
  }

  function excluir() {
    if (!alvo || alvo.tipo !== "obj" || !dados) return;
    const novo: MapaDados = {
      mvv: dados.mvv.map((m) => ({ ...m })),
      persp: dados.persp.map((p) => ({ ...p, objs: [...p.objs] })),
    };
    novo.persp[alvo.i].objs.splice(alvo.j, 1);
    aplicar(novo);
    setAlvo(null);
  }

  const contexto =
    alvo?.tipo === "mvv" ? dados.mvv[alvo.i].lbl : alvo ? dados.persp[alvo.i].nome : "";
  const corAlvo =
    alvo?.tipo === "mvv" ? dados.mvv[alvo.i].bg : alvo ? dados.persp[alvo.i].cor : "#888";
  const tituloEditor =
    alvo?.tipo === "mvv"
      ? "Editar " + dados.mvv[alvo.i].lbl.toLowerCase()
      : alvo?.tipo === "obj"
        ? `Editar objetivo ${alvo.j + 1}`
        : alvo
          ? `Novo objetivo ${dados.persp[alvo.i].objs.length + 1}`
          : "";

  const editor = alvo && (
    <div
      className="modal-overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) setAlvo(null);
      }}
    >
      <div className="mp-card anim-cartao">
        <div className="mp-ctx">
          <span className="mp-dot" style={{ background: corAlvo }} />
          <span>{contexto}</span>
        </div>
        <div className="mp-title">{tituloEditor}</div>
        <div className="mp-sub">
          A alteração fica salva neste navegador. Para valer para todo mundo, o texto
          precisa ir para a planilha.
        </div>
        <textarea
          className="mp-input"
          value={rascunho}
          autoFocus
          spellCheck
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) gravar();
            if (e.key === "Escape") setAlvo(null);
          }}
        />
        <div className="mp-row">
          {alvo.tipo === "obj" && (
            <button
              type="button"
              className={"mp-btn mp-btn-del" + (confirmandoExclusao ? " mp-confirma" : "")}
              onClick={() => (confirmandoExclusao ? excluir() : setConfirmandoExclusao(true))}
            >
              {confirmandoExclusao ? "Confirmar exclusão" : "Excluir"}
            </button>
          )}
          <button type="button" className="mp-btn mp-btn-cancel" onClick={() => setAlvo(null)}>
            Cancelar
          </button>
          <button type="button" className="mp-btn mp-btn-ok" onClick={gravar}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="section-title">{TITULO}</div>

      {dados.persp.length === 0 ? (
        <div style={{ color: "var(--text3)", fontSize: 13, padding: 20, lineHeight: 1.7 }}>
          As faixas do mapa vêm das colunas <b>Perspectiva</b> e <b>Objetivo Estratégico</b> do
          Plano Estratégico ITP. Assim que essas colunas estiverem preenchidas na planilha, o
          mapa se monta sozinho.
        </div>
      ) : (
        <div className="mapa-card">
          <div className="mapa-header">
            <span className="mapa-title">Mapa Estratégico — IT Protect</span>
            <span className="mapa-dica">Duplo clique em um card para editar</span>
            {editado && (
              <button
                className="btn-link"
                onClick={() => {
                  limparMapa();
                  setDados(padrao);
                }}
                title="Descarta as edições e volta ao que está na planilha"
              >
                Restaurar da planilha
              </button>
            )}
            {periodo && <span className="mapa-periodo">{periodo}</span>}
          </div>

          <div className="mapa-body">
            <div className="mapa-topo">
              {dados.mvv.map((m, i) => (
                <div
                  key={m.lbl}
                  className="mapa-mvv mapa-edit"
                  style={{ background: m.bg }}
                  onDoubleClick={() => abrir({ tipo: "mvv", i })}
                  title="Duplo clique para editar"
                >
                  <div className="mapa-mvv-ico">
                    <Icone id={m.ico} tamanho={30} />
                  </div>
                  <div className="mapa-mvv-lbl">{m.lbl}</div>
                  <p className="mapa-mvv-txt">{m.txt}</p>
                </div>
              ))}
            </div>

            {dados.persp.map((p, i) => (
              <div
                key={p.nome}
                className="mapa-persp"
                style={{ "--mc": p.cor, "--ml": p.claro } as React.CSSProperties}
              >
                <div className="mapa-persp-lbl">
                  <span className="mapa-persp-ico">
                    <Icone id={p.ico} tamanho={26} />
                  </span>
                  <span className="mapa-persp-nome">{p.nome}</span>
                </div>
                <div className="mapa-trilho">
                  {p.objs.map((o, j) => (
                    <div
                      key={j}
                      className="mapa-obj mapa-edit"
                      onDoubleClick={() => abrir({ tipo: "obj", i, j })}
                      title="Duplo clique para editar"
                    >
                      {o}
                    </div>
                  ))}
                  {p.objs.length < MAX_OBJETIVOS && (
                    <button
                      type="button"
                      className="mapa-add"
                      onClick={() => abrir({ tipo: "novo", i })}
                      title={`Adicionar objetivo (máximo de ${MAX_OBJETIVOS} por faixa)`}
                      aria-label={`Adicionar objetivo em ${p.nome}`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* O bloco da seção anima com `transform`, e um ancestral transformado
          ancoraria o `position: fixed` do editor nele em vez da janela. */}
      {editor && typeof document !== "undefined" && createPortal(editor, document.body)}
    </>
  );
}
