"use client";

import { useDropdown } from "@/lib/use-dropdown";

export type Pill = { grupo: string; rotulo: string; valor: string; texto: string };

type Props = {
  pills: Pill[];
  onRemove: (grupo: string, valor: string) => void;
};

/**
 * Lista suspensa com os filtros aplicados. Só aparece quando há algum
 * selecionado — assim a barra de filtros não cresce a cada escolha.
 */
export default function FiltrosAtivos({ pills, onRemove }: Props) {
  const { aberto, montado, wrapRef, menuRef, alternar, classeMenu } = useDropdown();

  if (!pills.length) return null;

  return (
    <div className="ts-dd-wrap" ref={wrapRef}>
      <button
        className={"ts-dd-btn ts-dd-has-val" + (aberto ? " ts-dd-active" : "")}
        onClick={alternar}
        title="Ver e remover os filtros aplicados"
      >
        <span className="ts-dd-label">Filtros ativos</span>
        <span className="ts-dd-badge">{pills.length}</span>
        <span className="ts-dd-arrow">▾</span>
      </button>
      {montado && (
        <div ref={menuRef} className={"ts-dd-menu ts-dd-wide " + classeMenu}>
          {pills.map((p) => (
            <div key={p.grupo + "|" + p.valor} className="ts-dd-item filtro-ativo">
              <span className="filtro-grupo">{p.rotulo}</span>
              <span className="filtro-valor" title={p.texto}>
                {p.texto}
              </span>
              <button
                className="filtro-remover"
                title="Remover este filtro"
                aria-label={"Remover " + p.rotulo + ": " + p.texto}
                onClick={() => onRemove(p.grupo, p.valor)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
