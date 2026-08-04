# BI Eficácia na Entrega – Apisul

Dashboard executivo para acompanhamento das solicitações registradas via Google Forms → Google Sheets (“Eficácia na Entrega”).

## Como usar

### 1. Produção (já configurado)

O dashboard consome diretamente o Web App do Google Apps Script:

```
https://script.google.com/macros/s/AKfycbyD0071pyIgbbg0rYCk6hlR6Y8WluFLVVVlT48Cfd3l9B9iCgFu4jGDXGxOyjwLMkZS6A/exec
```

Basta abrir `index.html` em qualquer navegador moderno (ou hospedar em qualquer servidor estático / SharePoint / IIS).

### 2. Demonstração offline

Em `js/config.js` altere:

```js
DATA_SOURCE: 'sample',
```

### 3. Outras fontes

- **CSV publicado**: `DATA_SOURCE: 'csv'` + `CSV_URL`
- **Google Sheets API**: `DATA_SOURCE: 'sheets-api'` + chave e ID

## Mapeamento de colunas (planilha real)

| Campo interno       | Cabeçalho na planilha                      |
|---------------------|--------------------------------------------|
| numero              | Codigo da Análise                          |
| dataAbertura        | Carimbo de data/hora                       |
| solicitante         | Nome do solicitante                        |
| transportador       | Qual transportadora?                       |
| responsavel         | Responsável Mondelez pela Solicitação?     |
| tipo                | Nivel de urgência                          |
| filaAbertura        | Fila Fixa                                  |
| dataPrevista        | Previsão de Entrega                       |
| dataConclusao       | Data da Conclusão                          |
| observacoes         | OBSERVAÇÃO                                 |

**Status** é derivado automaticamente:
- Possui **Data da Conclusão** → `Concluído`
- Possui Código / Previsão / Fila Fixa → `Em Andamento`
- Caso contrário → `Aberto`

## Regras de negócio implementadas

- **Fila em tempo real**: solicitações abertas/em andamento ordenadas por data de abertura. Posição e “à frente” recalculados a cada atualização.
- **Data Prevista padrão**: enquanto não preenchida → Abertura + 5 dias.
- **Data Prevista manual**: quando o Fernando preenche, substitui o cálculo.
- **Fila Fixa (Fila na Abertura)**: valor histórico gravado na 1ª análise; nunca recalculado.
- **Situação do prazo**: No Prazo | Atrasado | Antecipado (< 24h) | Vencido | Pendente.

## Estrutura

```
bi-solicitacoes/
├── index.html
├── css/styles.css
├── js/
│   ├── config.js          ← fonte de dados e mapeamento
│   ├── utils.js
│   ├── data-service.js    ← Apps Script / CSV / sample
│   ├── calculations.js    ← regras de negócio + fila
│   ├── charts.js
│   ├── table.js
│   └── app.js
└── README.md
```

## Atualização automática

Por padrão a cada 5 minutos (`AUTO_REFRESH_MS` em `config.js`). Use `0` para desativar.

## Exportação

A tabela detalhada exporta para CSV e Excel (.xlsx) com todos os campos calculados.

## Identidade visual

- Azul Marinho (`#0a2540`) – cor principal
- Branco – fundo e cards
- Tons de azul e cinzas neutros

Layout 100% responsivo (desktop, tablet e mobile).
