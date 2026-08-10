"use client";

export type Pill = { grupo: string; rotulo: string; valor: string; texto: string };

type Props = { pills: Pill[]; onRemove: (grupo: string, valor: string) => void };

/** Chips dos filtros ativos, com “×” para remover cada um. */
export default function FilterPills({ pills, onRemove }: Props) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, flex: 1, minWidth: 0 }}>
      {pills.map((p) => (
        <span
          key={p.grupo + "|" + p.valor}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10,
            padding: "2px 7px",
            borderRadius: 10,
            background: "rgba(79,142,255,.10)",
            border: "1px solid rgba(79,142,255,.22)",
            color: "var(--text2)",
          }}
        >
          <span style={{ color: "var(--text3)", fontSize: 9 }}>{p.rotulo}:</span>
          {p.texto}
          <span
            style={{ cursor: "pointer", color: "var(--text3)", fontSize: 11 }}
            onClick={() => onRemove(p.grupo, p.valor)}
          >
            ×
          </span>
        </span>
      ))}
    </div>
  );
}
