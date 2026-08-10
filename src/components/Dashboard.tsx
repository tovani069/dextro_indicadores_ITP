"use client";

import { useState } from "react";

import DataMenu from "./DataMenu";
import Footer from "./Footer";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Indicadores from "./sections/Indicadores";
import Orcamento from "./sections/Orcamento";
import PlanoAcao from "./sections/PlanoAcao";
import Timesheet from "./sections/Timesheet";
import { DataProvider, type DatasetKey } from "@/lib/data-context";
import type { SetorId } from "@/lib/types";

export default function Dashboard() {
  const [setor, setSetor] = useState<SetorId>("plano");
  const [collapsed, setCollapsed] = useState(false);
  const [dataMenu, setDataMenu] = useState<DatasetKey | null>(null);

  return (
    <DataProvider>
      <Navbar onToggleSidebar={() => setCollapsed((v) => !v)} />
      <div className="layout">
        <Sidebar
          setor={setor}
          collapsed={collapsed}
          onSelect={setSetor}
          onOpenDataMenu={setDataMenu}
        />
        <div className="main">
          {setor === "plano" && <PlanoAcao />}
          {setor === "indicadores" && <Indicadores />}
          {setor === "orcamento" && <Orcamento />}
          {setor === "timesheet" && <Timesheet />}
        </div>
      </div>
      <Footer />
      {dataMenu && <DataMenu dataset={dataMenu} onClose={() => setDataMenu(null)} />}
    </DataProvider>
  );
}
