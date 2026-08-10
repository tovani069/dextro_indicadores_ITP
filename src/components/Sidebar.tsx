"use client";

import { Fragment } from "react";
import { SECTIONS } from "@/lib/constants";
import type { DatasetKey } from "@/lib/data-context";
import type { SetorId } from "@/lib/types";

const DATA_MENUS: Partial<Record<SetorId, DatasetKey>> = {
  timesheet: "timesheet",
  plano: "plano",
  orcamento: "orcamento",
};

type Props = {
  setor: SetorId;
  collapsed: boolean;
  onSelect: (s: SetorId) => void;
  onOpenDataMenu: (d: DatasetKey) => void;
};

export default function Sidebar({ setor, collapsed, onSelect, onOpenDataMenu }: Props) {
  return (
    <div className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="sidebar-nav">
        {SECTIONS.map((sec, i) => {
          const dataset = DATA_MENUS[sec.id];
          return (
            <Fragment key={sec.id}>
              {i > 0 && <div className="nav-sep" />}
              <button
                className={"nav-btn" + (setor === sec.id ? " active" : "")}
                onClick={() => onSelect(sec.id)}
              >
                <div className="nav-dot" style={{ background: sec.dot }} />
                <span className="nav-label">
                  {sec.icon} {sec.label}
                </span>
                {dataset && (
                  <span
                    className="nav-dots"
                    style={{ marginLeft: "auto" }}
                    title="Importar / Exportar dados"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDataMenu(dataset);
                    }}
                  >
                    ⋮
                  </span>
                )}
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
