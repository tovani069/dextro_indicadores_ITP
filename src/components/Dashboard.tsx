"use client";

import { useState } from "react";

import CompartilharTimesheet from "./CompartilharTimesheet";
import Footer from "./Footer";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Indicadores from "./sections/Indicadores";
import Orcamento from "./sections/Orcamento";
import PlanoAcao from "./sections/PlanoAcao";
import Timesheet from "./sections/Timesheet";
import { DataProvider } from "@/lib/data-context";
import type { SetorId } from "@/lib/types";

export default function Dashboard() {
  const [setor, setSetor] = useState<SetorId>("plano");
  const [collapsed, setCollapsed] = useState(false);
  const [compartilhar, setCompartilhar] = useState(false);

  return (
    <DataProvider>
      <Navbar onToggleSidebar={() => setCollapsed((v) => !v)} />
      <div className="layout">
        <Sidebar
          setor={setor}
          collapsed={collapsed}
          onSelect={setSetor}
          onCompartilhar={() => setCompartilhar(true)}
        />
        <div className="main">
          {/* A key remonta o bloco a cada troca de aba, disparando a animação de entrada. */}
          <div key={setor} className="anim-sobe">
            {setor === "plano" && <PlanoAcao />}
            {setor === "indicadores" && <Indicadores />}
            {setor === "orcamento" && <Orcamento />}
            {setor === "timesheet" && <Timesheet />}
          </div>
        </div>
      </div>
      <Footer />
      {compartilhar && <CompartilharTimesheet onClose={() => setCompartilhar(false)} />}
    </DataProvider>
  );
}
