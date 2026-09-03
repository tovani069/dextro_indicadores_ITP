"use client";

import { useState } from "react";

import Footer from "./Footer";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Indicadores from "./sections/Indicadores";
import MapaEstrategico from "./sections/MapaEstrategico";
import Orcamento from "./sections/Orcamento";
import PlanoAcao from "./sections/PlanoAcao";
import Timesheet from "./sections/Timesheet";
import { DataProvider } from "@/lib/data-context";
import type { SetorId } from "@/lib/types";

/**
 * Endereço do Timesheet para quem está de fora — o painel completo não existe
 * nele. `NEXT_PUBLIC_TIMESHEET_URL` sobrescreve, caso o host mude.
 */
const LINK_TIMESHEET =
  process.env.NEXT_PUBLIC_TIMESHEET_URL || "https://dextro-timesheet.vercel.app";

export default function Dashboard() {
  // Abre na primeira aba da lateral, que agora é o bloco de indicadores.
  const [setor, setSetor] = useState<SetorId>("indicadores");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <DataProvider>
      <Navbar onToggleSidebar={() => setCollapsed((v) => !v)} />
      <div className="layout">
        <Sidebar
          setor={setor}
          collapsed={collapsed}
          onSelect={setSetor}
          onCompartilhar={() => window.open(LINK_TIMESHEET, "_blank", "noopener")}
        />
        <div className="main">
          {/* A key remonta o bloco a cada troca de aba, disparando a animação de entrada. */}
          <div key={setor} className="anim-sobe">
            {setor === "plano" && <PlanoAcao />}
            {(setor === "indicadores" || setor.startsWith("grupo:")) && (
              <Indicadores grupo={setor.startsWith("grupo:") ? setor.slice(6) : ""} />
            )}
            {setor === "orcamento" && <Orcamento />}
            {setor === "timesheet" && <Timesheet />}
            {setor === "mapa" && <MapaEstrategico />}
          </div>
        </div>
      </div>
      <Footer />
    </DataProvider>
  );
}
