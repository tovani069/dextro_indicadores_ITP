import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashboard · IT Protect — Diretoria de Operações",
  description:
    "Plano de Ação, Indicadores, Orçamento e Timesheet da Diretoria de Operações — IT Protect · Dextro",
  /**
   * Escudo da Dextro na aba, o mesmo arquivo dos demais produtos — os produtos
   * Dextro se reconhecem pelo escudo, não pela sigla do cliente.
   *
   * Duas artes, trocadas pelo tema do sistema: traço escuro no tema claro,
   * branco no escuro. A arte escura vem por último de propósito: navegador que
   * ignore o `media` fica com a última declarada, e a aba escura é o caso mais
   * comum.
   */
  icons: {
    icon: [
      { url: "/icone-claro.png", media: "(prefers-color-scheme: light)", type: "image/png" },
      { url: "/icone-escuro.png", media: "(prefers-color-scheme: dark)", type: "image/png" },
    ],
  },
};

// Aplica o tema salvo antes da primeira pintura (evita flash de tema errado).
const themeScript = `(function(){try{var t=localStorage.getItem('itpTheme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
