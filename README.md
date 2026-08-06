# Eficácia na Entrega — BI de Solicitações (Apisul)

Dashboard corporativo para acompanhamento em tempo quase real das solicitações de análise registradas via Google Forms / Google Sheets.

## Objetivo

Dar visibilidade operacional e gerencial sobre:

- Volume de solicitações (abertas, em andamento, concluídas)
- Fila de atendimento (fixa na abertura + fila dinâmica)
- Prazos planejados e realizados
- Cumprimento de SLA (no prazo / atrasado / antecipado)
- Rupturas, urgência, transportadores e solicitantes

## Stack

| Camada | Tecnologia |
|--------|------------|
| UI do BI | HTML5 + CSS3 + JavaScript (ES2024) autocontido |
| Gráficos | Chart.js 4 |
| Exportação | CSV nativo, Excel (SheetJS), PDF via impressão do navegador |
| Dados | Google Sheets → Google Apps Script (JSON) |
| Shell (opcional) | Next.js 16 + Tailwind (redireciona para o HTML estático) |

O arquivo principal do painel é:

- `index.html` (raiz do projeto)
- `public/eficacia-entrega.html` (cópia para o redirect do Next)

## Identidade visual

- **Principal:** Azul-marinho `#0b1f38`
- **Secundária:** Branco / cinzas neutros
- **Apoio:** Tons de azul (`#2563eb`, cyan, teal)
- Semântica: verde (ok), vermelho (atraso/ruptura), âmbar (alerta)

## Visões do painel

1. **Dashboard** — KPIs executivos, evolução diária, status, top solicitantes/transportadores, fila na abertura, prazo planejado  
2. **Evolução** — Aberturas × conclusões, backlog, **demanda × capacidade (~5/dia)**, **tendência % no prazo**  
3. **Análises** — Por usuário, transportador, urgência, ruptura, **responsável**, **resumo de risco de atraso**, tempos médios  
4. **Prazos** — No prazo / atrasado / antecipado / vencem hoje + distribuição de atraso  
5. **Detalhamento** — Tabela completa com busca, ordenação, paginação, export CSV / Excel / PDF  
6. **Fila** — Fila dinâmica ordenada por abertura, posição, à frente, **vence em**, **risco**

## Regras de negócio (Fase 1)

- Considerar solicitações com código de análise (pós pré-análise).
- **Fila na abertura (Fila Fixa):** valor histórico gravado na planilha; não recalcula.
- **Fila dinâmica:** pendentes ordenados por data de abertura; posição e “à frente” em tempo real no front.
- **Data prevista:** se vazia, assume abertura + 5 dias (`DIAS_PRAZO_PADRAO`).
- **Antecipado:** conclusão até 24h antes do limite (`ANTECIPADO_HORAS`).
- Capacidade de referência operacional: **~5 solicitações/dia** (apenas referência visual).

## Configuração da API

No `index.html` (objeto `CONFIG`):

```js
APPS_SCRIPT_URL: 'https://script.google.com/macros/s/.../exec'
FETCH_TIMEOUT_MS: 20000
DIAS_PRAZO_PADRAO: 5
ANTECIPADO_HORAS: 24
COLUMN_MAP: { /* cabeçalhos da planilha */ }
```

Se os cabeçalhos da planilha mudarem, atualize `COLUMN_MAP`.

## Como usar

### Opção A — Abrir o HTML direto

Abra `index.html` ou `public/eficacia-entrega.html` em um navegador moderno (Chrome, Edge, Firefox, Safari).

> A origem da planilha precisa permitir CORS via Apps Script (`ContentService` com acesso adequado).

### Opção B — Next.js

```bash
pnpm install
pnpm dev
```

A home redireciona para `/eficacia-entrega.html`.

## Filtros

- Período (7 / 15 / 30 / 90 dias / todo)
- Data de abertura exata
- Transportador, Solicitante, Responsável, Status, Urgência, Ruptura
- Chips de filtros ativos + clique em gráficos/KPIs para filtrar cruzado

## Melhorias desta versão (V1)

- Card **% Fora do Prazo** no dashboard
- Gráfico **Demanda × Capacidade**
- Gráfico **tendência % cumprimento de prazo**
- Análise por **Responsável**
- Painel de **risco de atraso** (vencidos / hoje / 1–3 dias)
- Colunas **Vence em** e **Risco** na fila
- Export **PDF** (impressão estilizada)
- Polimento visual (glass leve, microinterações, empty states, focus rings)
- Paginação padrão em **50** registros
- Cópia do BI em `public/` alinhada ao redirect do Next

## Fora de escopo (fases futuras)

Conforme ata de 27/07/2026:

- Recálculo automático de previsões
- Projeções preditivas de capacidade
- Alertas automáticos de risco
- Triagem inteligente por eventos de viagem / alertas

## Manutenção

- Preferir editar o HTML estático e espelhar em `public/eficacia-entrega.html`.
- Evitar duplicar regras de negócio: concentrar em `Calculations` e `CONFIG`.
- Gráficos usam `destroy` antes de recriar (`Charts.getCtx`) para evitar vazamento de memória.

## Contato / contexto

Projeto interno Apisul — BI de Solicitações de Análises (Mondelez / operação).  
Baseado na especificação e ata de reunião de julho/2026.
