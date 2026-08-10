"use client";

import { useEffect, useRef, useState } from "react";

/** Acompanha a duração de `.anim-recolhe`. */
const SAIDA_MS = 170;

/**
 * Abre/fecha uma lista suspensa: fecha ao clicar fora ou apertar Esc e mantém
 * o menu montado durante a animação de saída.
 */
export function useDropdown() {
  const [aberto, setAberto] = useState(false);
  const [montado, setMontado] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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

  return {
    aberto,
    montado,
    wrapRef,
    alternar: () => setAberto((a) => !a),
    fechar: () => setAberto(false),
    /** Classe de animação do menu conforme está entrando ou saindo. */
    classeAnimacao: aberto ? "anim-sobe" : "anim-recolhe",
  };
}
