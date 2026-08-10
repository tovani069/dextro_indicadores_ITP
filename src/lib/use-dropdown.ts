"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Acompanha a duração de `.anim-recolhe`. */
const SAIDA_MS = 170;
/** Folga mínima até a borda da janela. */
const MARGEM = 10;

/**
 * Abre/fecha uma lista suspensa: fecha ao clicar fora ou apertar Esc, mantém o
 * menu montado durante a animação de saída e o alinha à direita do botão
 * quando abrir para a direita estouraria a largura da página.
 */
export function useDropdown() {
  const [aberto, setAberto] = useState(false);
  const [montado, setMontado] = useState(false);
  const [alinharFim, setAlinharFim] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function onDocClick(e: MouseEvent) {
      const alvo = e.target as Node;
      // Um item removido pelo próprio clique já saiu do DOM: não é "clique fora".
      if (!alvo.isConnected) return;
      if (!wrapRef.current?.contains(alvo)) setAberto(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [aberto]);

  useEffect(() => {
    if (aberto) {
      setMontado(true);
      return;
    }
    if (!montado) return;
    const t = setTimeout(() => setMontado(false), SAIDA_MS);
    return () => clearTimeout(t);
  }, [aberto, montado]);

  // Decide o lado antes da pintura, para o menu não "pular" depois de aberto.
  useLayoutEffect(() => {
    if (!montado || !aberto) return;
    const menu = menuRef.current;
    const wrap = wrapRef.current;
    if (!menu || !wrap) return;
    const largura = menu.offsetWidth;
    const inicio = wrap.getBoundingClientRect().left;
    setAlinharFim(inicio + largura > window.innerWidth - MARGEM);
  }, [montado, aberto]);

  return {
    aberto,
    montado,
    wrapRef,
    menuRef,
    alternar: () => setAberto((a) => !a),
    fechar: () => setAberto(false),
    /** Classes do menu: animação de entrada/saída e lado de abertura. */
    classeMenu:
      (aberto ? "anim-sobe" : "anim-recolhe") + (alinharFim ? " ts-dd-fim" : ""),
  };
}
