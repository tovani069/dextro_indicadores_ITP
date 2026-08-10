# Indicadores ITP — Dashboard Diretoria de Operações

Dashboard estratégico da Diretoria de Operações (IT Protect · Dextro) em **Next.js 15 (App Router) + TypeScript**.

Quatro seções: **Plano de Ação**, **Indicadores**, **Orçamento** e **Timesheet**, com gráficos Chart.js,
tema claro/escuro e importação/exportação de dados em Excel/CSV.

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de produção
npm start        # serve o build
```

## Estrutura

```
src/
  app/
    layout.tsx          # <html>, fontes IBM Plex, tema inicial, metadata
    page.tsx            # entrada — renderiza o Dashboard
    globals.css         # CSS do dashboard (variáveis de tema, cards, tabelas, dropdowns)
    icon.svg            # favicon
  components/
    Dashboard.tsx       # shell: provider de dados + navegação entre seções
    Navbar.tsx          # logos, data, alternar tema, alternar sidebar
    Sidebar.tsx         # menu de seções + botão ⋮ de dados
    Footer.tsx
    DataMenu.tsx        # modal de importar / exportar / restaurar
    FilterDropdown.tsx  # dropdown de filtro (multi-seleção ou opção única)
    FilterPills.tsx     # chips dos filtros ativos
    KpiCard.tsx
    charts/ChartCanvas.tsx   # wrapper do Chart.js com ciclo de vida React
    sections/
      PlanoAcao.tsx
      Indicadores.tsx
      Orcamento.tsx
      Timesheet.tsx
  data/                 # dados originais (JSON) + tipagem
  lib/
    constants.ts        # cores, meses, metas, chaves de localStorage
    types.ts
    format.ts           # parse/format de números, moeda, meses, destaque de busca
    indicadores.ts      # status do indicador vs meta
    data-context.tsx    # estado dos dados + persistência no navegador
    xlsx-io.ts          # leitura/escrita de planilhas (SheetJS, carregado sob demanda)
legacy/index.html       # versão anterior (arquivo único), mantida como referência
```

## Dados

Os dados originais ficam em `src/data/*.json` e são carregados no build:

| Arquivo | Conteúdo | Chave no navegador |
| --- | --- | --- |
| `timesheet.json` | 7.173 lançamentos de horas | `itpTS` |
| `plano.json` | 40 ações do plano | `itpPlano` |
| `orcamento-records.json` | 45 linhas de despesa | `itpOrcRec` |
| `orcamento-pessoal.json` | 11 posições do quadro | `itpOrcPes` |
| `indicadores.json` | 17 indicadores (somente leitura) | — |

No menu **⋮** ao lado de cada seção da sidebar é possível:

- **Importar Excel/CSV** — substitui os dados exibidos; ficam salvos no `localStorage` deste navegador.
- **Exportar modelo** — baixa uma planilha com o formato esperado na importação.
- **Restaurar original** — descarta o que foi importado e volta aos dados do repositório.

Para atualizar os dados de forma permanente (para todos os usuários), edite os JSON em `src/data/`
e faça um novo deploy.

## Deploy (Vercel)

O projeto é um app Next.js padrão — a Vercel detecta o framework automaticamente
(`npm run build`, sem variáveis de ambiente).

> Se o projeto na Vercel foi criado quando o repositório era um `index.html` estático,
> confira em **Project Settings → Build & Development Settings** se o *Framework Preset*
> está como **Next.js** (e não "Other"/estático).

## Diferenças em relação à versão anterior

- Importar dados atualiza a tela na hora, sem recarregar a página.
- O tema escolhido fica salvo entre visitas.
- Chart.js e SheetJS vêm do `npm` (sem depender de CDN); o SheetJS só é baixado ao importar/exportar.
- Correção: o gráfico "Budget vs Executado por Categoria" agrupava pelo campo errado e aparecia zerado.
- Correção: no card do colaborador (Timesheet), os meses agora usam a abreviação correta
  (antes só os quatro primeiros tinham rótulo).
