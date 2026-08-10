"use client";

import { useEffect, useState } from "react";

import { useDropdown } from "@/lib/use-dropdown";

export type FilterOption = { value: string; label: string; color?: string };

type Props = {
  /** Rótulo padrão do botão, exibido quando nada está selecionado. */
  label: string;
  options: FilterOption[];
  /** Valores selecionados (no modo `single` use zero ou um valor). */
  selected: string[];
  onToggle: (value: string) => void;
  mode?: "multi" | "single";
  searchable?: boolean;
  wide?: boolean;
};

/** Remove o prefixo numérico usado nos códigos de cliente/categoria ("13. ITP"). */
function stripPrefix(s: string) {
  return s.replace(/^\d+\.\s*/, "");
}

/** Dropdown de filtro (multi-seleção ou opção única) usado em Timesheet e Orçamento. */
export default function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  mode = "multi",
  searchable = false,
  wide = false,
}: Props) {
  const { aberto, montado, wrapRef, menuRef, alternar, classeMenu } = useDropdown();
  const [query, setQuery] = useState("");

  // A busca não deve sobreviver ao fechamento do menu.
  useEffect(() => {
    if (!aberto) setQuery("");
  }, [aberto]);

  const hasVal =
    mode === "single" ? selected.length > 0 && selected[0] !== "" : selected.length > 0;

  let btnLabel = label;
  if (mode === "single") {
    if (hasVal) {
      const opt = options.find((o) => o.value === selected[0]);
      btnLabel = (opt?.label ?? selected[0]).slice(0, 18);
    }
  } else if (selected.length === 1) {
    btnLabel = stripPrefix(selected[0]);
  } else if (selected.length > 1) {
    btnLabel = `${label} (${selected.length})`;
  }

  const visible = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div className="ts-dd-wrap" ref={wrapRef}>
      <button
        className={
          "ts-dd-btn" + (aberto ? " ts-dd-active" : "") + (hasVal ? " ts-dd-has-val" : "")
        }
        onClick={alternar}
      >
        <span className="ts-dd-label">{btnLabel}</span>
        <span className="ts-dd-arrow">▾</span>
      </button>
      {montado && (
        <div
          ref={menuRef}
          className={"ts-dd-menu" + (wide ? " ts-dd-wide" : "") + " " + classeMenu}
          role="listbox"
        >
          {searchable && (
            <input
              className="ts-dd-search"
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          {visible.map((o, i) => (
            <label
              key={o.value}
              className={"ts-dd-item" + (selected.includes(o.value) ? " ts-dd-selected" : "")}
              // cascata curta, só nos primeiros itens — listas longas não podem demorar
              style={{ animationDelay: aberto ? `${Math.min(i, 8) * 22}ms` : undefined }}
              onClick={() => onToggle(o.value)}
            >
              {o.color && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: o.color,
                    flexShrink: 0,
                    display: "inline-block",
                    marginRight: 5,
                  }}
                />
              )}
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
