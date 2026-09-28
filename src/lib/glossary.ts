export const GLOSSARY_CATEGORIES = {
  valuation: "Avaliação e múltiplos",
  results: "Resultados e rentabilidade",
  debt: "Dívida e solidez financeira",
  shareholder: "Dividendos e remuneração do acionista",
  market: "Mercado e ações",
  strategy: "Análise e estratégia",
} as const;

export type GlossaryCategory = keyof typeof GLOSSARY_CATEGORIES;

export type GlossaryTerm = {
  id: string;
  en: string;
  pt: string;
  category: GlossaryCategory;
  definition: string;
  formula?: string;
  // O mesmo valor pode ser bom numa empresa e mau noutra — o contexto é tudo.
  scenario?: { value: string; good: string; bad: string };
  example?: string;
};

export const GLOSSARY: GlossaryTerm[] = [
  // ---------------------------------------------------------------- Avaliação
  {
    id: "pe",
    en: "P/E ratio (Price-to-Earnings)",
    pt: "PER (Preço / Lucro)",
    category: "valuation",
    definition:
      "Quantos euros o mercado paga por cada euro de lucro anual. É o múltiplo mais usado para saber se uma ação está cara ou barata — mas só faz sentido comparado com o histórico da própria empresa, com o setor e com o crescimento esperado.",
    formula: "Cotação ÷ Lucro por ação (ou Capitalização ÷ Resultado líquido)",
    scenario: {
      value: "P/E de 13,2x",
      good: "Numa empresa de bens de consumo com lucros estáveis a crescer ~8% ao ano, cuja média histórica é ~20x: o mercado está a descontá-la. Se não houver um problema novo no negócio, pode ser uma oportunidade.",
      bad: "Numa siderúrgica ou mineira no pico do ciclo, com lucros inflacionados por preços recorde das matérias-primas: quando o ciclo virar e os lucros caírem para metade, o P/E real passa a ~26x. Nas cíclicas, P/E baixo costuma ser sinal de pico, não de pechincha.",
    },
  },
  {
    id: "forward-pe",
    en: "Forward P/E",
    pt: "PER estimado (prospetivo)",
    category: "valuation",
    definition:
      "Igual ao P/E, mas usando o lucro estimado pelos analistas para os próximos 12 meses em vez do lucro passado. Mostra o que se paga pelo futuro — e depende de as estimativas estarem certas.",
    formula: "Cotação ÷ Lucro por ação estimado (próximos 12 meses)",
    scenario: {
      value: "Forward P/E de 25x",
      good: "Numa tecnológica com lucros a crescer 30% ao ano de forma consistente: daqui a 3 anos, ao preço de hoje, o P/E seria ~11x. O múltiplo alto é o preço do crescimento.",
      bad: "Numa utility (elétrica, água) que cresce 3% ao ano: vai demorar décadas a 'crescer' para um múltiplo razoável. Está simplesmente cara.",
    },
  },
  {
    id: "peg",
    en: "PEG ratio",
    pt: "Rácio PEG (P/E ajustado ao crescimento)",
    category: "valuation",
    definition:
      "Divide o P/E pelo crescimento esperado dos lucros, para comparar empresas com ritmos de crescimento diferentes. Regra informal: perto de 1 é razoável, abaixo de 1 pode ser barato.",
    formula: "P/E ÷ Crescimento anual esperado do lucro por ação (em %)",
    scenario: {
      value: "PEG de 0,8",
      good: "Empresa com P/E de 16x e lucros a crescer 20% ao ano há vários anos, apoiados em vendas e margens a subir: crescimento de qualidade a preço razoável.",
      bad: "Empresa com o mesmo PEG, mas os '20% de crescimento' vêm de recuperar de um ano péssimo (base baixa). No ano seguinte o crescimento normaliza para 5% e o PEG real é 3,2.",
    },
  },
  {
    id: "ps",
    en: "P/S ratio (Price-to-Sales)",
    pt: "Preço / Vendas",
    category: "valuation",
    definition:
      "Quanto o mercado paga por cada euro de vendas. Útil para empresas ainda sem lucros, mas enganador se ignorarmos as margens: vendas com margem de 2% valem muito menos do que vendas com margem de 30%.",
    formula: "Capitalização ÷ Vendas anuais",
    scenario: {
      value: "P/S de 3x",
      good: "Numa empresa de software com margem líquida de 25%: equivale a um P/E de ~12x. Barato para um negócio com essa rentabilidade.",
      bad: "Numa cadeia de supermercados com margem líquida de 2%: equivale a um P/E de ~150x. Caríssimo.",
    },
  },
  {
    id: "pb",
    en: "P/B ratio (Price-to-Book)",
    pt: "Preço / Valor contabilístico",
    category: "valuation",
    definition:
      "Compara a cotação com o valor dos capitais próprios no balanço. Muito usado em bancos e seguradoras, onde os ativos são sobretudo financeiros. Pouco útil em empresas cujo valor está em marcas, software ou pessoas (não aparecem no balanço).",
    formula: "Capitalização ÷ Capitais próprios",
    scenario: {
      value: "P/B de 0,7x",
      good: "Num banco bem capitalizado com ROE de ~10%: estás a comprar os ativos com 30% de desconto a um negócio que os rentabiliza razoavelmente.",
      bad: "Num banco com crédito malparado ainda não reconhecido e ROE de 3%: o valor contabilístico está sobrestimado. O desconto é o mercado a antecipar perdas — uma armadilha de valor.",
    },
  },
  {
    id: "ev",
    en: "Enterprise Value (EV)",
    pt: "Valor da empresa",
    category: "valuation",
    definition:
      "O preço de 'comprar a empresa inteira': o valor das ações mais a dívida que se herda, menos a caixa que se recebe. Permite comparar empresas com níveis de endividamento diferentes.",
    formula: "Capitalização + Dívida líquida (+ interesses minoritários e ações preferenciais)",
    example:
      "Duas empresas valem 10 mil M€ em bolsa. A primeira tem 5 mil M€ de dívida líquida (EV = 15 mil M€); a segunda tem 2 mil M€ de caixa líquida (EV = 8 mil M€). Com o mesmo EBITDA, a segunda é muito mais barata, embora a capitalização seja igual.",
  },
  {
    id: "ev-ebitda",
    en: "EV/EBITDA",
    pt: "Valor da empresa / EBITDA",
    category: "valuation",
    definition:
      "Múltiplo que compara o valor total da empresa (incluindo dívida) com o resultado operacional antes de amortizações. Neutro à estrutura de capital, por isso bom para comparar empresas do mesmo setor. Ignora o capex, o que o torna enganador em negócios que investem muito.",
    formula: "Enterprise Value ÷ EBITDA",
    scenario: {
      value: "EV/EBITDA de 8x",
      good: "Numa empresa de marcas ou de software com pouco investimento em ativos (capex baixo): quase todo o EBITDA vira fluxo de caixa livre. 8x é barato.",
      bad: "Numa operadora de telecomunicações ou companhia aérea que gasta 60% do EBITDA em capex só para manter a rede ou a frota: 8x EBITDA pode equivaler a mais de 20x o fluxo de caixa livre.",
    },
  },
  {
    id: "fcf-yield",
    en: "FCF yield (Free Cash Flow yield)",
    pt: "Rendibilidade do fluxo de caixa livre",
    category: "valuation",
    definition:
      "O fluxo de caixa livre como percentagem da capitalização: quanto dinheiro 'sobra' por ano para o acionista por cada euro investido ao preço atual. Mais difícil de manipular do que o lucro contabilístico.",
    formula: "Fluxo de caixa livre ÷ Capitalização",
    scenario: {
      value: "FCF yield de 6%",
      good: "Numa empresa madura com fluxo de caixa estável e a crescer devagar: rende mais do que as obrigações do tesouro, com potencial de crescimento. Atrativo.",
      bad: "Numa empresa em que o fluxo deste ano foi inflacionado por cortar investimento ou por reduzir stocks (fundo de maneio): efeitos pontuais que se revertem. O yield 'normal' pode ser metade.",
    },
  },
  {
    id: "dcf",
    en: "DCF (Discounted Cash Flow)",
    pt: "Fluxos de caixa descontados",
    category: "valuation",
    definition:
      "Método para estimar o valor intrínseco: projeta os fluxos de caixa futuros e desconta-os para hoje à taxa de retorno exigida (normalmente o WACC). É tão bom quanto os pressupostos — pequenas mudanças na taxa ou no crescimento mudam muito o resultado.",
    formula: "Valor = Σ FCFₜ ÷ (1 + taxa)ᵗ + valor terminal descontado",
    example:
      "Com fluxos de 100 M€ a crescer 3% para sempre, uma taxa de desconto de 8% dá um valor de ~2 060 M€; com 9% dá ~1 717 M€. Um ponto percentual muda o valor em 17% — por isso convém testar vários cenários.",
  },
  {
    id: "intrinsic-value",
    en: "Intrinsic value",
    pt: "Valor intrínseco",
    category: "valuation",
    definition:
      "O valor que uma empresa 'realmente' vale com base na sua capacidade de gerar dinheiro no futuro, independente da cotação do dia. É sempre uma estimativa — por isso se usa uma margem de segurança.",
    example:
      "Se estimas que uma ação vale 50 € e ela cota a 35 €, há um desconto de 30% face ao teu valor intrínseco. Se cota a 60 €, estás a pagar mais do que achas que vale.",
  },
  {
    id: "margin-of-safety",
    en: "Margin of safety",
    pt: "Margem de segurança",
    category: "valuation",
    definition:
      "A diferença entre o valor intrínseco estimado e o preço pago. Protege contra erros de estimativa e azar. Conceito central do investimento em valor (Benjamin Graham).",
    formula: "(Valor intrínseco − Preço) ÷ Valor intrínseco",
    scenario: {
      value: "Margem de 20%",
      good: "Numa empresa previsível (ex: concessão de autoestradas com contratos longos): a estimativa de valor tem pouca incerteza, 20% chega.",
      bad: "Numa biotecnológica que depende da aprovação de um único medicamento: o valor pode ir a zero ou triplicar. 20% é uma proteção ilusória.",
    },
  },

  // ---------------------------------------------------------------- Resultados
  {
    id: "revenue",
    en: "Revenue / Sales",
    pt: "Vendas / Receitas",
    category: "results",
    definition:
      "O total faturado com a atividade da empresa, antes de qualquer custo. Convém separar crescimento orgânico (o negócio a crescer por si) de crescimento por aquisições ou por efeito cambial.",
    scenario: {
      value: "Vendas +12%",
      good: "Crescimento orgânico, com mais clientes e preços a subir acima da inflação, e margens estáveis ou a melhorar.",
      bad: "Crescimento todo vindo de uma aquisição paga com dívida, enquanto o negócio original encolhe 3% — e com margens em queda.",
    },
  },
  {
    id: "ebitda",
    en: "EBITDA",
    pt: "Resultado antes de juros, impostos, depreciações e amortizações",
    category: "results",
    definition:
      "Aproximação do resultado operacional 'em dinheiro', antes de amortizações. Útil para comparar empresas, mas ignora que os ativos se desgastam e têm de ser substituídos (capex). Warren Buffett ironiza: 'a gestão acha que a fada dos dentes paga o capex?'.",
    formula: "EBIT + Depreciações e amortizações",
    scenario: {
      value: "Margem EBITDA de 35%",
      good: "Numa empresa de software ou de infraestruturas com contratos longos e capex moderado: a maior parte desse EBITDA chega aos acionistas.",
      bad: "Numa empresa de perfuração petrolífera que gasta quase todo o EBITDA a renovar equipamento: no fim sobra pouco ou nada em fluxo de caixa livre.",
    },
  },
  {
    id: "ebit",
    en: "EBIT (Operating income)",
    pt: "Resultado operacional",
    category: "results",
    definition:
      "Lucro do negócio antes de juros e impostos, já depois de amortizações. Mostra quanto o negócio em si gera, independentemente de como é financiado.",
    formula: "Vendas − Custos operacionais − Depreciações e amortizações",
  },
  {
    id: "net-income",
    en: "Net income",
    pt: "Resultado líquido (lucro líquido)",
    category: "results",
    definition:
      "O lucro final, depois de todos os custos, juros e impostos. Pode ser distorcido por itens não recorrentes (vendas de ativos, imparidades), por isso convém olhar para o resultado 'ajustado' ou recorrente.",
    scenario: {
      value: "Lucro +40%",
      good: "Porque as vendas cresceram e as margens alargaram — melhoria sustentável.",
      bad: "Porque a empresa vendeu um edifício com mais-valia pontual. Sem esse ganho, o lucro recorrente caiu 5%.",
    },
  },
  {
    id: "eps",
    en: "EPS (Earnings Per Share)",
    pt: "Lucro por ação",
    category: "results",
    definition:
      "O resultado líquido dividido pelo número de ações. É o que interessa ao acionista: o lucro pode crescer mas, se houver emissão de ações, cada ação fica com menos.",
    formula: "Resultado líquido ÷ Número médio de ações",
    scenario: {
      value: "EPS +15%",
      good: "Vindo de vendas e margens a subir, com o número de ações estável.",
      bad: "Com o resultado líquido estagnado, e todo o aumento a vir de recompras de ações financiadas com dívida: engenharia financeira, não melhoria do negócio.",
    },
  },
  {
    id: "gross-margin",
    en: "Gross margin",
    pt: "Margem bruta",
    category: "results",
    definition:
      "Percentagem das vendas que sobra depois do custo direto dos produtos vendidos. Indica poder de preço e diferenciação. Compara-se sempre dentro do mesmo setor.",
    formula: "(Vendas − Custo das vendas) ÷ Vendas",
    scenario: {
      value: "Margem bruta de 40%",
      good: "Num retalhista ou distribuidor, onde o típico ronda 25–30%: sinal de marca própria forte ou de poder negocial.",
      bad: "Numa empresa de software, onde o típico é 70–80%: sugere muitos serviços manuais ou custos de infraestrutura elevados.",
    },
  },
  {
    id: "operating-margin",
    en: "Operating margin (EBIT margin)",
    pt: "Margem operacional",
    category: "results",
    definition:
      "Percentagem das vendas que fica como resultado operacional. Mostra a eficiência do negócio como um todo, incluindo custos de estrutura, marketing e I&D.",
    formula: "EBIT ÷ Vendas",
    scenario: {
      value: "Margem operacional de 10%",
      good: "Numa companhia aérea ou num supermercado, onde 3–5% é normal: excelente gestão de custos.",
      bad: "Numa marca de luxo, onde 25–35% é normal: algo corre mal (descontos, perda de exclusividade, custos a fugir do controlo).",
    },
  },
  {
    id: "net-margin",
    en: "Net margin",
    pt: "Margem líquida",
    category: "results",
    definition: "Percentagem das vendas que chega a lucro final, depois de juros e impostos.",
    formula: "Resultado líquido ÷ Vendas",
  },
  {
    id: "roe",
    en: "ROE (Return on Equity)",
    pt: "Rentabilidade dos capitais próprios",
    category: "results",
    definition:
      "Quanto lucro a empresa gera por cada euro dos acionistas. Alto é bom, mas é fácil de inflacionar com dívida (menos capital próprio para o mesmo lucro).",
    formula: "Resultado líquido ÷ Capitais próprios",
    scenario: {
      value: "ROE de 20%",
      good: "Numa empresa quase sem dívida (Net debt/EBITDA abaixo de 1x): o negócio em si é muito rentável.",
      bad: "Numa empresa com dívida de 5x EBITDA, ou com capitais próprios quase nulos por anos de recompras: o ROE alto é efeito da alavancagem, não da qualidade — e o risco é elevado.",
    },
  },
  {
    id: "roa",
    en: "ROA (Return on Assets)",
    pt: "Rentabilidade dos ativos",
    category: "results",
    definition: "Lucro gerado por cada euro de ativos. Especialmente útil em bancos, que operam com ativos enormes face ao capital.",
    formula: "Resultado líquido ÷ Ativo total",
    scenario: {
      value: "ROA de 1%",
      good: "Num banco: 1% é um bom nível (bancos operam com ativos ~15x o capital próprio, o que dá um ROE de ~15%).",
      bad: "Numa empresa industrial ou de software: 1% é muito fraco — os ativos quase não geram lucro.",
    },
  },
  {
    id: "roic",
    en: "ROIC (Return on Invested Capital)",
    pt: "Rentabilidade do capital investido",
    category: "results",
    definition:
      "Quanto a empresa ganha por cada euro investido no negócio (capital próprio + dívida). Talvez a melhor medida de qualidade: uma empresa só cria valor se o ROIC for superior ao custo do capital (WACC).",
    formula: "NOPAT (EBIT × (1 − taxa de imposto)) ÷ Capital investido",
    scenario: {
      value: "ROIC de 12%",
      good: "Com um custo de capital (WACC) de 8%: cada euro reinvestido cria valor. Se a empresa tiver onde reinvestir, o crescimento é valioso.",
      bad: "Numa empresa num mercado emergente com WACC de 13%: está a destruir valor — quanto mais cresce, pior para o acionista.",
    },
  },
  {
    id: "roce",
    en: "ROCE (Return on Capital Employed)",
    pt: "Rentabilidade do capital empregado",
    category: "results",
    definition:
      "Semelhante ao ROIC, mas usando o resultado operacional antes de impostos e o capital empregado (ativo menos passivo corrente). Muito usado na Europa e em setores industriais.",
    formula: "EBIT ÷ (Ativo total − Passivo corrente)",
    scenario: {
      value: "ROCE de 15%",
      good: "Numa empresa industrial estável ao longo de 10 anos, em anos bons e maus: negócio de qualidade.",
      bad: "Numa química ou metalúrgica, só no pico do ciclo: na média do ciclo pode ser 6%.",
    },
  },
  {
    id: "wacc",
    en: "WACC (Weighted Average Cost of Capital)",
    pt: "Custo médio ponderado do capital",
    category: "results",
    definition:
      "O retorno mínimo que a empresa tem de gerar para compensar acionistas e credores. É a fasquia para o ROIC e a taxa usada para descontar fluxos de caixa num DCF.",
    formula: "(E/V × custo dos capitais próprios) + (D/V × custo da dívida × (1 − imposto))",
    example:
      "Uma utility com receitas estáveis e dívida barata pode ter WACC de ~6%; uma tecnológica pequena e volátil pode ter ~11%. O mesmo ROIC de 9% cria valor na primeira e destrói na segunda.",
  },
  {
    id: "fcf",
    en: "Free Cash Flow (FCF)",
    pt: "Fluxo de caixa livre",
    category: "results",
    definition:
      "O dinheiro que sobra depois de pagar a operação e os investimentos necessários. É daqui que saem dividendos, recompras e redução de dívida. Muitos investidores confiam mais nele do que no lucro.",
    formula: "Fluxo de caixa operacional − Capex",
    scenario: {
      value: "FCF negativo",
      good: "Numa empresa em forte crescimento a construir novas fábricas com ROIC elevado: está a investir para ganhar muito mais no futuro.",
      bad: "Numa empresa madura sem crescimento, que mesmo assim paga dividendos — financiados com dívida. Insustentável.",
    },
  },
  {
    id: "capex",
    en: "Capex (Capital Expenditures)",
    pt: "Investimento em ativos fixos",
    category: "results",
    definition:
      "Dinheiro gasto em fábricas, equipamentos, lojas, redes. Distingue-se capex de manutenção (necessário para manter o negócio como está) de capex de crescimento (para expandir).",
    example:
      "Uma operadora de telecomunicações pode gastar 15–20% das vendas em capex só para manter e modernizar a rede; uma empresa de software pode gastar 2–3%. Por isso o mesmo EBITDA vale muito mais na segunda.",
  },
  {
    id: "working-capital",
    en: "Working capital",
    pt: "Fundo de maneio",
    category: "results",
    definition:
      "Dinheiro 'preso' na operação corrente: stocks e dívidas de clientes, menos o que se deve a fornecedores. Quando cresce, consome caixa; quando encolhe, liberta caixa.",
    example:
      "Um supermercado vende a pronto e paga aos fornecedores a 60 dias: tem fundo de maneio negativo, ou seja, os fornecedores financiam-lhe o crescimento. Um fabricante de máquinas com meses de stock precisa de muito capital para crescer.",
  },
  {
    id: "ttm",
    en: "TTM (Trailing Twelve Months)",
    pt: "Últimos 12 meses",
    category: "results",
    definition:
      "Soma dos últimos quatro trimestres reportados. Dá uma visão anual atualizada sem esperar pelo relatório anual.",
  },
  {
    id: "yoy",
    en: "YoY (Year-over-Year)",
    pt: "Variação homóloga",
    category: "results",
    definition:
      "Comparação com o mesmo período do ano anterior (ex: 3.º trimestre de 2026 vs 3.º trimestre de 2025). Evita distorções de sazonalidade.",
  },
  {
    id: "guidance",
    en: "Guidance",
    pt: "Previsões da gestão",
    category: "results",
    definition:
      "Objetivos que a própria empresa comunica para os próximos trimestres ou anos (vendas, margens, lucro). Revisões em alta ou em baixa movem muito a cotação.",
    example:
      "Uma empresa que bate as estimativas do trimestre mas corta o guidance para o ano pode cair 10% no próprio dia — o mercado olha mais para o futuro do que para o passado.",
  },

  // ---------------------------------------------------------------- Dívida
  {
    id: "net-debt",
    en: "Net debt",
    pt: "Dívida líquida",
    category: "debt",
    definition:
      "Dívida financeira menos a caixa disponível. Negativa significa que a empresa tem mais caixa do que dívida (posição de caixa líquida).",
    formula: "Dívida financeira (curto + longo prazo) − Caixa e equivalentes",
  },
  {
    id: "net-debt-ebitda",
    en: "Net debt / EBITDA",
    pt: "Dívida líquida / EBITDA",
    category: "debt",
    definition:
      "Quantos anos de EBITDA seriam precisos para pagar a dívida líquida. A medida de endividamento mais usada. Abaixo de 2x costuma ser confortável; acima de 4x preocupa, dependendo do setor.",
    formula: "Dívida líquida ÷ EBITDA",
    scenario: {
      value: "Net debt/EBITDA de 3x",
      good: "Numa utility regulada, com receitas previsíveis e contratos longos: 3–4x é normal e sustentável.",
      bad: "Numa empresa cíclica ou tecnológica: numa recessão o EBITDA pode cair 40% e o rácio saltar para 5x, com risco de refinanciamento a juros altos.",
    },
  },
  {
    id: "debt-to-equity",
    en: "Debt-to-Equity (D/E)",
    pt: "Rácio de endividamento (Dívida / Capitais próprios)",
    category: "debt",
    definition: "Quanto a empresa depende de dívida face ao dinheiro dos acionistas.",
    formula: "Dívida financeira ÷ Capitais próprios",
    scenario: {
      value: "D/E de 1,5x",
      good: "Numa empresa de infraestruturas com ativos físicos estáveis e contratos indexados à inflação.",
      bad: "Numa startup tecnológica ainda sem lucros: qualquer atraso no crescimento pode torná-la incapaz de pagar.",
    },
  },
  {
    id: "interest-coverage",
    en: "Interest coverage",
    pt: "Cobertura de juros",
    category: "debt",
    definition: "Quantas vezes o resultado operacional cobre os juros da dívida. Abaixo de 3x começa a ser apertado.",
    formula: "EBIT ÷ Juros pagos",
    scenario: {
      value: "Cobertura de 4x",
      good: "Numa empresa de consumo defensivo, cujo EBIT quase não varia em recessões.",
      bad: "Numa empresa cíclica: uma queda de 50% do EBIT deixa a cobertura em 2x, e os bancos podem apertar as condições.",
    },
  },
  {
    id: "current-ratio",
    en: "Current ratio",
    pt: "Liquidez geral",
    category: "debt",
    definition:
      "Ativos de curto prazo (caixa, clientes, stocks) a dividir pelos passivos de curto prazo. Indica a capacidade de pagar as obrigações do próximo ano.",
    formula: "Ativo corrente ÷ Passivo corrente",
    scenario: {
      value: "Liquidez geral de 0,8",
      good: "Num supermercado ou restaurante de fast food: recebe a pronto e paga a prazo, por isso vive bem com um rácio abaixo de 1 — é até sinal de força negocial.",
      bad: "Num fabricante industrial com muito stock e clientes a pagar a 90 dias: pode ter dificuldades em pagar fornecedores e dívida de curto prazo.",
    },
  },

  // ---------------------------------------------------------------- Acionista
  {
    id: "dividend-yield",
    en: "Dividend yield",
    pt: "Rendibilidade do dividendo",
    category: "shareholder",
    definition:
      "O dividendo anual como percentagem da cotação. Um yield muito alto pode ser um aviso: muitas vezes é alto porque a cotação caiu, antecipando um corte do dividendo.",
    formula: "Dividendo anual por ação ÷ Cotação",
    scenario: {
      value: "Dividend yield de 7%",
      good: "Numa utility ou empresa de infraestruturas com payout de 65%, totalmente coberto pelo fluxo de caixa livre, e histórico de dividendos a subir.",
      bad: "Numa empresa cuja cotação caiu 50% num ano e que paga mais de 100% do lucro em dividendos: o mercado está a antecipar um corte. É uma 'armadilha de yield'.",
    },
  },
  {
    id: "dps",
    en: "DPS (Dividend Per Share)",
    pt: "Dividendo por ação",
    category: "shareholder",
    definition: "O valor pago em dividendos por cada ação num ano. O histórico (anos seguidos a subir ou sem cortes) diz muito sobre a disciplina da gestão.",
  },
  {
    id: "payout-ratio",
    en: "Payout ratio",
    pt: "Taxa de distribuição",
    category: "shareholder",
    definition: "Percentagem do lucro distribuída em dividendos. O resto fica na empresa para reinvestir ou reduzir dívida.",
    formula: "Dividendos ÷ Resultado líquido",
    scenario: {
      value: "Payout de 90%",
      good: "Num REIT (imobiliário cotado) ou numa utility com lucros muito previsíveis — em alguns casos a lei até obriga a distribuir a maioria.",
      bad: "Numa empresa industrial cíclica: no próximo ano mau, o lucro cai e o dividendo tem de ser cortado.",
    },
  },
  {
    id: "buyback",
    en: "Share buyback",
    pt: "Recompra de ações",
    category: "shareholder",
    definition:
      "A empresa compra as suas próprias ações em bolsa e normalmente anula-as. Cada acionista fica com uma fatia maior. Só cria valor se as ações forem compradas abaixo do seu valor intrínseco.",
    scenario: {
      value: "Recompra de 5% das ações por ano",
      good: "Feita com fluxo de caixa livre excedente, quando a ação está barata face aos lucros.",
      bad: "Feita com dívida, no pico da cotação, e só para compensar as ações dadas como remuneração aos gestores — o número de ações nem desce.",
    },
  },
  {
    id: "net-payout-yield",
    en: "Net payout yield",
    pt: "Rendibilidade total distribuída (líquida)",
    category: "shareholder",
    definition:
      "Dividendos mais recompras, menos novas ações emitidas, em percentagem da capitalização. Mostra tudo o que a empresa devolve ao acionista, não só o dividendo.",
    formula: "(Dividendos + Recompras − Emissões de ações) ÷ Capitalização",
    example:
      "Uma empresa com dividend yield de apenas 1% mas que recompra 4% das ações por ano tem um net payout yield de ~5% — devolve mais do que muitas 'ações de dividendos'.",
  },
  {
    id: "dilution",
    en: "Dilution",
    pt: "Diluição",
    category: "shareholder",
    definition:
      "Quando o número de ações aumenta (aumentos de capital, conversão de obrigações, ações dadas a funcionários), cada acionista passa a ter uma fatia menor da empresa.",
    scenario: {
      value: "Número de ações +3% ao ano",
      good: "Numa empresa jovem de crescimento rápido, a pagar em ações para atrair talento, com vendas a crescer 40% ao ano.",
      bad: "Numa empresa madura de crescimento lento: em 10 anos o acionista perde ~26% da sua fatia sem receber nada em troca.",
    },
  },

  // ---------------------------------------------------------------- Mercado
  {
    id: "market-cap",
    en: "Market capitalization",
    pt: "Capitalização bolsista (valor de mercado)",
    category: "market",
    definition:
      "Quanto vale a empresa em bolsa: cotação vezes número de ações. Costuma dividir-se em large caps (> 10 mil M$), mid caps (2–10 mil M$) e small caps (< 2 mil M$).",
    formula: "Cotação × Número de ações em circulação",
  },
  {
    id: "shares-outstanding",
    en: "Shares outstanding",
    pt: "Ações em circulação",
    category: "market",
    definition: "Número total de ações emitidas e detidas por investidores (exclui ações próprias em carteira da empresa). Vê-lo a descer ao longo dos anos é sinal de recompras.",
  },
  {
    id: "free-float",
    en: "Free float",
    pt: "Capital disperso em bolsa",
    category: "market",
    definition:
      "Percentagem das ações que é realmente negociada em bolsa, excluindo as detidas por acionistas de controlo, fundadores ou pelo Estado.",
    scenario: {
      value: "Free float de 25%",
      good: "Com um fundador de referência que tem 75% e um histórico de tratar bem os minoritários: interesses alinhados com os teus.",
      bad: "Com um acionista de controlo que usa a empresa para negócios com partes relacionadas: os minoritários ficam sem voz. E pouca liquidez torna difícil vender.",
    },
  },
  {
    id: "52-week-range",
    en: "52-week high / low",
    pt: "Máximo / mínimo das últimas 52 semanas",
    category: "market",
    definition:
      "A cotação mais alta e mais baixa do último ano. Dá contexto ao preço atual, mas não diz se a ação está cara ou barata — isso depende dos fundamentais.",
  },
  {
    id: "beta",
    en: "Beta",
    pt: "Beta (sensibilidade ao mercado)",
    category: "market",
    definition:
      "Quanto a ação costuma mexer face ao mercado. Beta 1 acompanha o mercado; 1,5 amplifica os movimentos em 50%; 0,5 é mais estável.",
    scenario: {
      value: "Beta de 1,5",
      good: "Para um investidor com horizonte longo que tolera oscilações e quer mais exposição a subidas do mercado.",
      bad: "Para quem precisa do dinheiro nos próximos 2 anos: numa queda de 20% do mercado, esta ação pode cair 30%.",
    },
  },
  {
    id: "price-target",
    en: "Price target / Analyst consensus",
    pt: "Preço-alvo / Consenso de analistas",
    category: "market",
    definition:
      "Cotação que os analistas esperam daqui a ~12 meses, e a média das recomendações (comprar, manter, vender). Útil como termómetro do sentimento, mas os analistas tendem a seguir a cotação e raramente recomendam vender.",
  },
  {
    id: "bull-bear",
    en: "Bull / Bear market",
    pt: "Mercado em alta / em baixa",
    category: "market",
    definition:
      "Bull market: período prolongado de subidas. Bear market: queda de 20% ou mais desde o máximo. 'Bullish' e 'bearish' descrevem também a opinião de um investidor sobre uma ação.",
  },
  {
    id: "blue-chip",
    en: "Blue chip",
    pt: "Empresa de primeira linha",
    category: "market",
    definition: "Empresas grandes, consolidadas e com longo historial de solidez, normalmente líderes do seu setor e presentes nos principais índices.",
  },
  {
    id: "etf",
    en: "ETF (Exchange-Traded Fund)",
    pt: "Fundo cotado",
    category: "market",
    definition:
      "Fundo negociado em bolsa como uma ação, que normalmente replica um índice (ex: S&P 500, MSCI World). Diversificação instantânea e custos baixos.",
  },
  {
    id: "ticker-isin",
    en: "Ticker / ISIN",
    pt: "Símbolo bolsista / Código ISIN",
    category: "market",
    definition:
      "Ticker: código curto da ação numa bolsa (ex: AAPL). A mesma empresa pode ter tickers diferentes em bolsas diferentes. ISIN: código internacional único de 12 caracteres que identifica o título em qualquer bolsa (ex: US0378331005).",
  },

  // ---------------------------------------------------------------- Estratégia
  {
    id: "moat",
    en: "Economic moat",
    pt: "Vantagem competitiva duradoura ('fosso')",
    category: "strategy",
    definition:
      "Aquilo que protege os lucros de uma empresa da concorrência durante muitos anos: marca, efeitos de rede, custos de mudança para o cliente, patentes, escala ou licenças. O sinal nos números é um ROIC alto e estável durante muito tempo.",
    example:
      "Um sistema de pagamentos usado por milhões de lojas e consumidores tem efeito de rede: cada novo utilizador torna-o mais valioso para os outros, e um concorrente novo quase não consegue entrar.",
  },
  {
    id: "cagr",
    en: "CAGR (Compound Annual Growth Rate)",
    pt: "Taxa de crescimento anual composta",
    category: "strategy",
    definition: "O crescimento médio por ano, com juros compostos, entre dois valores. Suaviza os altos e baixos de anos individuais.",
    formula: "(Valor final ÷ Valor inicial)^(1 ÷ n.º de anos) − 1",
    example: "Vendas de 100 M€ que passam para 200 M€ em 5 anos têm um CAGR de ~14,9% (e não 20% — a média simples engana).",
  },
  {
    id: "cyclical-defensive",
    en: "Cyclical vs defensive stocks",
    pt: "Ações cíclicas vs defensivas",
    category: "strategy",
    definition:
      "Cíclicas: lucros muito dependentes da economia (automóvel, construção, matérias-primas, companhias aéreas). Defensivas: procura estável em qualquer conjuntura (alimentação, saúde, utilities).",
    example:
      "Nas cíclicas, os múltiplos enganam: o P/E é baixo no pico (lucros altos) e alto no fundo (lucros deprimidos). Muitos investidores compram cíclicas quando o P/E está alto e vendem quando está baixo.",
  },
  {
    id: "growth-value",
    en: "Growth vs value investing",
    pt: "Investimento em crescimento vs em valor",
    category: "strategy",
    definition:
      "Growth: pagar múltiplos altos por empresas que crescem muito depressa. Value: comprar empresas a desconto face ao seu valor intrínseco, muitas vezes fora de moda. Não são opostos: o crescimento é uma componente do valor.",
  },
  {
    id: "value-trap",
    en: "Value trap",
    pt: "Armadilha de valor",
    category: "strategy",
    definition:
      "Uma ação que parece barata pelos múltiplos (P/E, P/B baixos), mas que está barata por uma boa razão: o negócio está em declínio estrutural. Continua 'barata' — ou fica ainda mais — durante anos.",
    example:
      "Um retalhista com P/E de 6x parece uma pechincha, mas as vendas caem 8% ao ano por perder clientes para o comércio online. Daqui a 3 anos o lucro pode ter desaparecido.",
  },
  {
    id: "diversification",
    en: "Diversification",
    pt: "Diversificação",
    category: "strategy",
    definition:
      "Distribuir o investimento por várias empresas, setores, geografias e moedas, para que um único erro não cause um grande prejuízo. Vê o 'peso' de cada posição na página das tuas ações.",
    scenario: {
      value: "Uma ação com 30% da carteira",
      good: "Para um investidor experiente que conhece profundamente a empresa e aceita a volatilidade — a concentração pode gerar retornos acima da média.",
      bad: "Para quem está a começar, ou se for a empresa onde trabalha: se correr mal, perde o emprego e as poupanças ao mesmo tempo.",
    },
  },
  {
    id: "dca",
    en: "Dollar-cost averaging (DCA)",
    pt: "Investimento periódico (custo médio)",
    category: "strategy",
    definition:
      "Investir um montante fixo em intervalos regulares (ex: todos os meses), independentemente da cotação. Compra mais ações quando estão baratas e menos quando estão caras, e evita tentar adivinhar o melhor momento.",
  },
];

// Liga as métricas das análises (lib/analysis/tool-schema.ts) às entradas do glossário.
export const METRIC_GLOSSARY: Record<string, string> = {
  current_price: "52-week-range",
  price_52w_low: "52-week-range",
  price_52w_high: "52-week-range",
  market_cap: "market-cap",
  shares_outstanding: "shares-outstanding",
  revenue_ttm: "revenue",
  price_to_sales: "ps",
  ebitda: "ebitda",
  ev_ebitda: "ev-ebitda",
  net_income: "net-income",
  per: "pe",
  gross_margin_pct: "gross-margin",
  ebitda_margin_pct: "ebitda",
  net_margin_pct: "net-margin",
  roic_pct: "roic",
  roce_pct: "roce",
  net_debt: "net-debt",
  net_debt_to_ebitda: "net-debt-ebitda",
  dividend_per_share: "dps",
  dividend_yield_pct: "dividend-yield",
  net_payout_yield_pct: "net-payout-yield",
};

// "Termo do dia" determinístico: muda uma vez por dia, igual para toda a gente.
export function termOfTheDay(date = new Date()): GlossaryTerm {
  const dayNumber = Math.floor(date.getTime() / 86_400_000);
  return GLOSSARY[dayNumber % GLOSSARY.length];
}
