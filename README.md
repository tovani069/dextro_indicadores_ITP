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
    Sidebar.tsx         # menu de seções
    Footer.tsx
    FilterDropdown.tsx  # dropdown de filtro (multi-seleção ou opção única)
    FilterPills.tsx     # chips dos filtros ativos
    KpiCard.tsx
    charts/ChartCanvas.tsx   # wrapper do Chart.js com ciclo de vida React
    charts/Gauge.tsx         # medidor semicircular (% Preenchimento / % Chargeability)
    charts/RankBars.tsx      # barras horizontais com rolagem e clique para filtrar
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
    smartsheet.ts       # leitura da API do Smartsheet (só no servidor)
    capacidade.ts       # estimativa de horas disponíveis (fallback)
legacy/index.html       # versão anterior (arquivo único), mantida como referência
```

## Dados

O **Timesheet** vem do Smartsheet, da área de trabalho *DEXTRO | IT PROTECT TIME SHEET*, lido pela
rota [/api/timesheet](src/app/api/timesheet/route.ts) no servidor — o `SMARTSHEET_TOKEN` (variável
de ambiente na Vercel) nunca chega ao navegador. A leitura é cacheada por 30 minutos.

| Fonte no Smartsheet | Vira |
| --- | --- |
| Relatório *Base todos os lançamentos* | lançamentos de horas (o colaborador sai do nome da planilha de origem) |
| Planilha *Cadastro de Colaboradores* | nome oficial + Time (Setor) + Status |
| Planilha *Horas disponíveis* | capacidade por colaborador/mês, base do % Preenchimento |
| Planilha *Painel ITP \| Configurações* | capacity (meta de chargeability) e limite de atenção |
| Planilha *Painel ITP \| Times* | time atual de cada colaborador (Endpoint, Exposure, Identity, MDR, Network) |

Se a leitura falhar, o dashboard exibe a base embutida em `src/data/timesheet.json` e o card
"Horas Disponíveis" passa a mostrar a capacidade estimada (dias úteis × 8h).

**Regras de negócio** (as mesmas do relatório de Power BI da operação, em [src/lib/timesheet.ts](src/lib/timesheet.ts)):

- **Faturável** é definido pela *categoria* — 1. Suporte, 2. Implantação, 6. Laboratório,
  7. Investigação de Dados e 8. Relatórios — e não pelo cliente. Horas no cliente interno (ITP)
  nessas categorias são faturáveis.
- **Chargeability** = horas faturáveis ÷ horas **disponíveis** (não ÷ preenchidas).
- **Capacity** (a meta) não está no código: é a linha *Capacity (%)* da planilha
  *Painel ITP | Configurações*, no mesmo workspace. A operação edita a célula e a tela pega o
  novo valor na releitura seguinte, sem deploy. A linha *Limite de atenção (%)* define onde o
  amarelo vira vermelho. Valor em branco ou fora de 1–100 cai nos padrões de
  [src/lib/constants.ts](src/lib/constants.ts) (75% e 50%).

As demais seções — **Plano de Ação**, **Indicadores** e **Orçamento** — usam os JSON de
`src/data/`. Para atualizá-las, edite o arquivo e faça um novo deploy:

| Arquivo | Conteúdo |
| --- | --- |
| `plano.json` | ações do plano |
| `orcamento-records.json` | linhas de despesa |
| `orcamento-pessoal.json` | quadro de pessoal |
| `indicadores.json` | indicadores |
| `colaboradores.json` | Time/Status de reserva, usado quando o Smartsheet não responde — quem manda é a planilha *Painel ITP \| Times* |

## Deploy (Vercel)

O projeto é um app Next.js padrão — a Vercel detecta o framework automaticamente
(`npm run build`, sem variáveis de ambiente).

> Se o projeto na Vercel foi criado quando o repositório era um `index.html` estático,
> confira em **Project Settings → Build & Development Settings** se o *Framework Preset*
> está como **Next.js** (e não "Other"/estático).

### Endereço separado para o Timesheet

O link do Timesheet vai para fora da diretoria, e apagar o `/timesheet` dele não pode
levar ao painel completo. Por isso o Timesheet ganha um **host próprio**: nele, qualquer
caminho cai no Timesheet, e o painel não existe. O domínio principal segue servindo tudo.

1. Na Vercel, **Project Settings → Domains → Add**, cadastre `dextro-timesheet.vercel.app`
   (ou outro nome livre terminado em `.vercel.app`, ou um subdomínio próprio começando
   por `timesheet.`).
2. Se usar um nome fora desse padrão, cadastre-o também em **Settings → Environment
   Variables**, na variável `TIMESHEET_HOSTS` (vários separados por vírgula).
3. Opcional: `NEXT_PUBLIC_TIMESHEET_URL` com a URL completa (`https://…`) faz o botão de
   link da barra lateral já abrir o endereço de fora, pronto para copiar.

O `/timesheet` do domínio principal continua respondendo, para não quebrar links antigos.

## Diferenças em relação à versão anterior

- Importar dados atualiza a tela na hora, sem recarregar a página.
- O tema escolhido fica salvo entre visitas.
- Chart.js e SheetJS vêm do `npm` (sem depender de CDN); o SheetJS só é baixado ao importar/exportar.
- Correção: o gráfico "Budget vs Executado por Categoria" agrupava pelo campo errado e aparecia zerado.
- Correção: no card do colaborador (Timesheet), os meses agora usam a abreviação correta
  (antes só os quatro primeiros tinham rótulo).
