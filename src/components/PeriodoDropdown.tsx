"use client";

import { useDropdown } from "@/lib/use-dropdown";

type Props = {
  de: string;
  ate: string;
  /** Limites vindos dos dados. */
  min: string;
  max: string;
  onChange: (de: string, ate: string) => void;
};

const curto = (iso: string) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a.slice(2)}`;
};

/** Filtro de período (equivale ao slicer "Date" do relatório), em lista suspensa. */
export default function PeriodoDropdown({ de, ate, min, max, onChange }: Props) {
  const { aberto, montado, wrapRef, menuRef, alternar, classeMenu } = useDropdown();
  const temVal = Boolean(de || ate);

  const rotulo = temVal ? `${curto(de) || "…"} → ${curto(ate) || "…"}` : "Período";

  return (
    <div className="ts-dd-wrap" ref={wrapRef}>
      <button
        className={
          "ts-dd-btn" + (aberto ? " ts-dd-active" : "") + (temVal ? " ts-dd-has-val" : "")
        }
        onClick={alternar}
        title="Filtrar por período"
      >
        <span className="ts-dd-label">{rotulo}</span>
        <span className="ts-dd-arrow">▾</span>
      </button>
      {montado && (
        <div ref={menuRef} className={"ts-dd-menu periodo-menu " + classeMenu}>
          <label className="periodo-linha">
            <span>De</span>
            <input
              type="date"
              min={min}
              max={max}
              value={de}
              onChange={(e) => onChange(e.target.value, ate)}
            />
          </label>
          <label className="periodo-linha">
            <span>Até</span>
            <input
              type="date"
              min={min}
              max={max}
              value={ate}
              onChange={(e) => onChange(de, e.target.value)}
            />
          </label>
          {temVal && (
            <button className="periodo-limpar" onClick={() => onChange("", "")}>
              Limpar período
            </button>
          )}
        </div>
      )}
    </div>
  );
}
