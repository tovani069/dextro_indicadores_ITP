"use client";

import { useEffect, useRef, useState } from "react";

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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

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
          "ts-dd-btn" + (open ? " ts-dd-active" : "") + (hasVal ? " ts-dd-has-val" : "")
        }
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ts-dd-label">{btnLabel}</span>
        <span className="ts-dd-arrow">▾</span>
      </button>
      <div className={"ts-dd-menu" + (wide ? " ts-dd-wide" : "") + (open ? " ts-dd-open" : "")}>
        {searchable && (
          <input
            className="ts-dd-search"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        {visible.map((o) => (
          <label
            key={o.value}
            className={
              "ts-dd-item" + (selected.includes(o.value) ? " ts-dd-selected" : "")
            }
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
    </div>
  );
}
