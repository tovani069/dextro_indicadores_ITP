"use client";

import { useSearchParams } from "next/navigation";

import Footer from "./Footer";
import Navbar from "./Navbar";
import Timesheet from "./sections/Timesheet";
import { DataProvider } from "@/lib/data-context";

/**
 * Página do Timesheet sozinho, para compartilhar por link.
 *
 * Sem barra lateral e sem as demais seções: quem recebe o link vê apenas o
 * Timesheet, já recortado pelos filtros que vierem na URL.
 */
export default function PainelTimesheet() {
  const params = useSearchParams();

  const lista = (chave: string) => {
    const v = params.get(chave);
    return v ? v.split(",").filter(Boolean) : [];
  };

  const filtrosIniciais = {
    times: lista("time"),
    colabs: lista("colab"),
    anos: lista("ano"),
    meses: lista("mes"),
    ...(params.get("de") ? { de: params.get("de") as string } : {}),
    ...(params.get("ate") ? { ate: params.get("ate") as string } : {}),
  };

  return (
    <DataProvider>
      <Navbar />
      <div className="layout">
        <div className="main">
          <Timesheet filtrosIniciais={filtrosIniciais} />
        </div>
      </div>
      <Footer />
    </DataProvider>
  );
}
