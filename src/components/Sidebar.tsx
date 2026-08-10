"use client";

import { Fragment } from "react";
import { SECTIONS } from "@/lib/constants";
import type { SetorId } from "@/lib/types";

type Props = {
  setor: SetorId;
  collapsed: boolean;
  onSelect: (s: SetorId) => void;
};

export default function Sidebar({ setor, collapsed, onSelect }: Props) {
  return (
    <div className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="sidebar-nav">
        {SECTIONS.map((sec, i) => (
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
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
