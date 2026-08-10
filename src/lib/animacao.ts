"use client";

import { useEffect, useRef, useState } from "react";

/** Duração padrão das transições de valor, alinhada à dos gráficos. */
export const DURACAO_PADRAO = 480;

function preferSemAnimacao() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Interpola o número exibido até o novo valor (easeOutQuart), para que os
 * indicadores acompanhem a animação dos gráficos em vez de saltar.
 */
export function useValorAnimado(alvo: number, duracao = DURACAO_PADRAO): number {
  const [valor, setValor] = useState(alvo);
  const atualRef = useRef(alvo);

  useEffect(() => {
    const de = atualRef.current;
    if (de === alvo) return;
    if (preferSemAnimacao()) {
      atualRef.current = alvo;
      setValor(alvo);
      return;
    }
    let raf = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / duracao);
      const e = 1 - Math.pow(1 - p, 4);
      const v = de + (alvo - de) * e;
      atualRef.current = v;
      setValor(v);
      if (p < 1) raf = requestAnimationFrame(passo);
      else atualRef.current = alvo;
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, duracao]);

  return valor;
}
