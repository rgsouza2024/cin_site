# Planejamento — Portal do CIn (spin-off do site do CEJ)

Documento de referência para a construção do site do **Centro Nacional de Inteligência da Justiça Federal (CIn)** como spin-off do portal do CEJ. Vive hoje no repositório `cej_site` porque é o repositório de origem do fork; deve ser copiado para o `README.md`/`ARQUITETURA.md` do novo repositório assim que ele for criado, e então pode ser removido daqui.

**Como usar este documento:** cada seção técnica está escrita para ser executável — quando cita um arquivo, é o arquivo real do `cej_site` na data deste planejamento (14/07/2026); quando propõe um valor, é o valor real extraído do código, não uma aproximação do manual. Onde o conteúdo depende de informação que só a equipe do CIn tem (nomes de CLIs, cor institucional, domínio definitivo), está marcado explicitamente como **[A LEVANTAR]** — não foi inventado.

**Decisões já fechadas (13-14/07/2026, em conversa com Rodrigo):**
- Repositório novo e independente, por fork da estrutura do `cej_site` — não é uma segunda saída do mesmo monorepo.
- Hospedagem e domínio próprios, no padrão já usado pelo SINEMAF (`sinemaf.cjf.jus.br`) — presença web independente definida pela STI, não uma subseção do domínio do CEJ.

**Decisão em aberto (a mais importante do documento):** de onde vem o conteúdo do CIn. Ver Seção 2.

---

## 1. Por que isto é um fork de baixo risco

O `cej_site` já foi construído prevendo este momento:

- [IDENTIDADE_VISUAL.md](IDENTIDADE_VISUAL.md) já contém um roteiro de "Passo a Passo para Criar um Spin-Off Visualmente Coerente" (trocar logos, ajustar cor institucional opcional, reaproveitar componentes) — escrito antes desta conversa.
- A navegação principal já tem o item do CIn destacado e com um comentário no próprio HTML apontando para este exato momento: `{#- CIn: aponta para a seção da home até o portal próprio existir; aí troca-se o href e adiciona-se o ícone externo -#}` ([site/_includes/layouts/base.njk:105](site/_includes/layouts/base.njk#L105)).
- Os commits `7f8375e` e `3ee7b0f` (13/07/2026) já reposicionaram o CIn na navegação "preparando o portal próprio".
- A stack (Eleventy + Nunjucks + dados por contrato validados por Ajv) não tem lock-in e é barata de replicar: nenhuma dependência de runtime além de build.

**Ressalva encontrada ao aprofundar este planejamento:** o [IDENTIDADE_VISUAL.md](IDENTIDADE_VISUAL.md#L61-L67) documenta tokens de cor que **não existem** no `style.css` real (`--primary-blue: #3498db`, `--dark-gray`, `--light-gray` — nenhum dos três aparece no arquivo). Quem seguir o manual ao pé da letra vai tentar reaproveitar variáveis que não existem. A Seção 5 deste documento usa os tokens **reais**, extraídos diretamente de `site/css/style.css:6-45` — é a fonte de verdade a seguir, não o manual.

---

## 2. A decisão em aberto: origem do conteúdo do CIn

Hoje o CIn **não tem nenhum dado independente**. Tudo que existe sobre ele vive dentro do `cej_site`:

| Conteúdo do CIn hoje | Onde mora | Formato |
|---|---|---|
| Notas Técnicas (5 documentos catalogados) | `data/documentos.json`, série `cej-cin` | Array de objetos conforme `documento.schema.json` |
| Texto institucional (missão, "como funciona") | Hardcoded em `site/index.njk` linhas 179-200 | HTML/Nunjucks |
| Estrutura (Grupo Decisório, Grupo Operacional, RIJEF) | Hardcoded em `site/index.njk` linhas 138-145 e `README.md` | HTML/Nunjucks + Markdown |
| Link "Ver Notas Técnicas" | `/publicacoes/?serie=cej-cin` | Filtro do acervo do CEJ |

### Opção A — Federado do CEJ (recomendado para o lançamento)

O CEJ continua dono e curador dos dados. O `cej_site` passa a expor um feed público (`/api/documentos-cin.json`), e o `cin_site` consome esse feed em **build time**, no mesmo padrão já validado para eventos: `data/fontes.js` já aceita `{ tipo: "url", endereco: "...", fonte: "..." }`, e o carregador aceita tanto um array quanto um envelope `{ eventos: [...] }`.

**Contrato do feed proposto** (espelha o envelope de `/api/eventos.json` já documentado em [ARQUITETURA.md:31](ARQUITETURA.md#L31)):

```json
{
    "schemaVersao": "1.0",
    "schemaUrl": "https://<dominio-cej>/api/schemas/documento-1.0.json",
    "fonte": "cej",
    "geradoEm": "2026-07-14T12:00:00.000Z",
    "documentos": [
        { "id": "cej-cin/manual-teleaudiencia", "serie": "cej-cin", "titulo": "...", "descricao": "...", "autor": null, "ano": 2022, "url": "https://...", "capa": null }
    ]
}
```

**Como o CEJ publica isso** (mudança concreta em `eleventy.config.js`, análoga à que já existe para o schema de eventos):

```js
// Gera /api/documentos-cin.json a partir do subconjunto série=cej-cin de data/documentos.json,
// no mesmo envelope usado por /api/eventos.json.
eleventyConfig.addGlobalData("documentosCin", () => {
    const todos = JSON.parse(fs.readFileSync(path.join(dataDir, "documentos.json"), "utf-8"));
    return {
        schemaVersao: "1.0",
        schemaUrl: "/api/schemas/documento-1.0.json",
        fonte: "cej",
        geradoEm: new Date().toISOString(),
        documentos: todos.filter((d) => d.serie === "cej-cin")
    };
});
```
— com um template `site/api-documentos-cin.njk` análogo ao `api-eventos.njk` existente, e passthrough copy de `data/schemas/documento.schema.json` para `/api/schemas/documento-1.0.json` (mesmo padrão da linha 171 do `eleventy.config.js` atual).

**Como o `cin_site` consome** — `data/fontes.js` do novo repositório:
```js
module.exports = [
    { tipo: "url", endereco: "https://<dominio-cej>/api/documentos-cin.json", fonte: "cej" }
];
```
e um `lib/carregar-documentos.js` que é, essencialmente, uma cópia de `lib/carregar-eventos.js` trocando o schema de evento pelo de documento.

**Prós:** zero duplicação, zero risco de duas versões da mesma Nota Técnica divergirem, nenhuma mudança de processo editorial. É a aplicação direta do princípio já registrado em [ARQUITETURA.md](ARQUITETURA.md): "federação por feeds antes de API dinâmica".
**Contras:** publicar uma Nota Técnica nova ainda significa editar `data/documentos.json` no repositório do CEJ — sem autonomia editorial para quem administra o site do CIn.

### Opção B — Dados independentes

O `cin_site` passa a ter seu próprio `data/documentos.json` e `data/schemas/documento.schema.json` (cópia literal do schema do CEJ — ele já é genérico o bastante, não precisa de um "schema de nota técnica" à parte), curados por quem administrar o novo repositório.

**Prós:** autonomia editorial total desde o dia um.
**Contras:** duplica os 5 documentos já publicados (é preciso decidir quem herda o histórico), cria duas fontes de verdade para a série `cej-cin` a partir do lançamento, exige montar do zero um processo de importação/validação que o CEJ já tem rodando (`scripts/importar-acervo.js` + `lib/carregar-acervo.js`).

### Recomendação e plano de corte

**Fase 1 (lançamento): Opção A.** **Fase 2 (se e quando o CIn tiver equipe editorial própria):** migrar para Opção B com uma data de corte explícita — a partir dela, o CEJ para de curar `cej-cin` e a série "congela" no repositório do CEJ como arquivo histórico (`documentos-manuais.json` já é o precedente de curadoria manual, mesmo padrão a reaproveitar), enquanto o `cin_site` assume publicações novas em seu próprio `data/documentos.json`, começando a numeração de `id` a partir de onde o histórico do CEJ parou.

**Esta é a pergunta que precisa ser respondida antes do primeiro commit do novo repositório** — o restante do plano funciona nos dois cenários, mas muda o que entra no bootstrap (Seção 4, passo 6).

---

## 3. Stack técnica (herdada integralmente)

| Camada | Ferramenta | Versão de referência | Observação |
|---|---|---|---|
| Gerador estático | Eleventy (11ty) | 3.1.6 | `npm run build` → `_site/`, `npm run start` → `eleventy --serve` |
| Template engine | Nunjucks (`.njk`) | via Eleventy | `htmlTemplateEngine: "njk"` |
| Validação de dados | Ajv | 8.20.0 | `strict: false`, `allErrors: true` — mesma config de `lib/carregar-eventos.js` |
| Otimização de imagem | Sharp | 0.35.3 | Build-time, não runtime |
| Ícones | Font Awesome Free, inlinado em SVG no build | 7.3.0 | Shortcodes `icone`/`simboloIcone`/`usarIcone` — nenhum CSS/fonte de ícone chega ao browser |
| Runtime de build | Node.js | 22 | Igual ao `node-version` do CI do CEJ |
| Gerenciador de pacotes | npm | — | `npm ci` no CI, nunca `npm install` em produção |

`package.json` do novo repositório: copiar integralmente o do CEJ, trocando apenas `name`, `description` e `repository.url`. Os quatro scripts (`build`, `start`, `validar`, `verificar-links`) fazem sentido tal como estão; `atualizar-acervo` e `atualizar-noticias` só permanecem se o CIn também importar do Plone/RSS do CJF diretamente (improvável na Opção A — nesse cenário quem importa continua sendo o CEJ).

---

## 4. Árvore de arquivos do novo repositório

Baseado na árvore real de `cej_site` nesta data. Cada item marcado com o que fazer no fork:

```
cin_site/
├── .github/workflows/
│   ├── ci.yml                     [COPIAR sem alteração — valida + build a cada push]
│   ├── verificar-links.yml        [COPIAR sem alteração — varredura mensal]
│   └── atualizar-noticias.yml     [REMOVER na Opção A — não há RSS próprio do CIn a importar]
├── data/
│   ├── site.json                  [ADAPTAR — nome do CIn, url vazio até domínio definido]
│   ├── contatos.json              [ADAPTAR — contatos do CIn/ASCIn, ver Seção 7]
│   ├── fontes.js                  [ADAPTAR — Opção A: aponta para feed do CEJ; Opção B: fonte local]
│   ├── documentos.json            [Opção A: REMOVER (vem do feed) / Opção B: POVOAR com os 5 registros existentes]
│   ├── documentos-manuais.json    [REMOVER a menos que o CIn cure PDFs fora do fluxo do Plone]
│   ├── eventos.json               [REMOVER — sem evidência de agenda própria do CIn, ver Seção 17]
│   ├── noticias.json              [REMOVER — sem fonte de RSS própria]
│   ├── publicacoes.json           [ADAPTAR — só a entrada "Notas Técnicas", ver Seção 7]
│   └── schemas/
│       ├── documento.schema.json  [COPIAR sem alteração]
│       ├── evento.schema.json     [REMOVER, a menos que Fase 3 (Seção 17) seja adotada]
│       ├── publicacao.schema.json [COPIAR sem alteração, se `publicacoes.json` for mantido]
│       └── noticia.schema.json    [REMOVER]
├── lib/
│   ├── carregar-acervo.js         [REMOVER na Opção A / ADAPTAR na Opção B]
│   ├── carregar-documentos.js     [CRIAR — só na Opção A, ver Seção 2]
│   ├── carregar-eventos.js        [REMOVER, a menos que Fase 3 seja adotada]
│   ├── carregar-noticias.js       [REMOVER]
│   └── carregar-publicacoes.js    [COPIAR, se `publicacoes.json` for mantido]
├── scripts/
│   ├── importar-acervo.js         [REMOVER na Opção A]
│   ├── importar-noticias.js       [REMOVER]
│   └── verificar-links.js         [COPIAR sem alteração]
├── site/
│   ├── _includes/layouts/base.njk [ADAPTAR — nav, footer, schema.org, preloads — ver Seções 8 e 11]
│   ├── _includes/partials/
│   │   └── event-card.njk         [REMOVER, a menos que Fase 3 seja adotada]
│   ├── css/
│   │   ├── style.css              [COPIAR e AJUSTAR — ver Seção 5]
│   │   └── fonts.css              [COPIAR sem alteração]
│   ├── fonts/*.woff2              [COPIAR sem alteração — 6 arquivos, Inter 400/500/600/700 + Montserrat 600/700]
│   ├── assets/                    [SUBSTITUIR pelo banco de imagens próprio do CIn — ver Seção 6]
│   ├── cej_logo.png               [SUBSTITUIR — ver Seção 6]
│   ├── cjf_logo.png               [MANTER — CIn é vinculado ao CJF/CEJ, co-marca institucional]
│   ├── favicon.png                [SUBSTITUIR]
│   ├── apple-touch-icon.png       [SUBSTITUIR]
│   ├── script.js                  [ADAPTAR — remover o bloco de filtros de calendário se não houver `/eventos/`, ver Seção 9]
│   ├── menu.js                    [COPIAR sem alteração — toggle do menu mobile é agnóstico de conteúdo]
│   ├── acervo.js                  [COPIAR sem alteração, se a página de Notas Técnicas reusar o padrão de busca do acervo]
│   ├── index.njk                  [REESCREVER conteúdo, manter estrutura de seções — ver Seção 7]
│   ├── sobre.njk                  [REESCREVER conteúdo — ver Seção 7]
│   ├── estrutura.njk              [REESCREVER conteúdo — ver Seção 7]
│   ├── publicacoes.njk            [ADAPTAR — vira a página "Notas Técnicas", filtro único em vez de 8 séries]
│   ├── eventos.njk                [REMOVER, a menos que Fase 3 seja adotada]
│   ├── api-eventos.njk            [REMOVER]
│   ├── 404.njk                    [COPIAR e ADAPTAR texto/links]
│   ├── sitemap.njk                [COPIAR sem alteração — já é dinâmico via `collections.all`]
│   └── robots.njk                 [COPIAR sem alteração]
├── eleventy.config.js             [ADAPTAR — ver Seção 2 (feed) e lista de exclusão do loop de data/*.json]
├── package.json                   [ADAPTAR — ver Seção 3]
├── ARQUITETURA.md                 [REESCREVER a partir deste documento]
├── SEGURANCA.md                   [COPIAR e ADAPTAR — ver Seção 12]
├── IDENTIDADE_VISUAL.md           [COPIAR — vale como documentação do sistema de design herdado; remover a Parte I (é sobre como fazer o fork, já feito) e manter a Parte II corrigida com os tokens reais]
└── vercel.json                    [CRIAR — ver Seção 12]
```

---

## 5. Sistema de design herdado — tokens reais

Valores extraídos de `site/css/style.css:6-45` (fonte de verdade — não do manual, ver ressalva da Seção 1):

```css
:root {
    /* Cores oficiais da Justiça Federal */
    --jf-blue: #002F6C;
    --jf-green: #007A33;
    --jf-gray: #97999F;

    /* Derivadas */
    --jf-blue-light: #003d8a;
    --jf-green-dark: #005a29;
    --jf-green-light: #5ddb8a;

    /* Papéis semânticos — é isto que os componentes referenciam, não as cores brutas */
    --primary-color: var(--jf-blue);
    --primary-dark: #001a3d;
    --secondary-color: var(--primary-dark);
    --accent-color: var(--jf-green);
    --accent-light: #e8f8f0;
    --light-bg: #f5f5f5;
    --text-dark: #333;
    --text-light: #666;
    --border-color: #ddd;
    --white: #ffffff;
    --bg-body: #ffffff;

    /* Forma */
    --radius-card: 10px;
    --radius-btn: 8px;

    /* Escala tipográfica */
    --fs-display: 48px;
    --fs-h2: 40px;
    --fs-h3: 22px;
    --fs-h3-destaque: 24px;
    --fs-icon-hero: 48px;
}
```

**Regra de alteração:** se o CIn tiver cor institucional própria confirmada **[A LEVANTAR]**, o único ponto de mudança são `--jf-blue` e/ou `--jf-green` — nunca os papéis semânticos (`--primary-color` etc.), que devem continuar apontando para eles. Isso preserva todo o resto do sistema (botões, foco, tags) sem precisar tocar em nenhum outro seletor. Se nenhuma cor própria for confirmada, **não alterar nada** — herdar tal como está.

**Tipografia:** Montserrat (títulos) + Inter (corpo), self-hosted em `site/fonts/` — requisito de LGPD (evita telemetria de IP a Google Fonts), não só de estilo. Copiar os 6 arquivos `.woff2` e `css/fonts.css` sem alteração.

### Inventário de componentes a reaproveitar

`style.css` tem 2009 linhas organizadas por seção/componente. Mapa do que existe hoje e o que fazer com cada bloco no fork:

| Bloco de componentes (linhas em `style.css`) | Reaproveitar como está? |
|---|---|
| Reset, foco visível, skip-link (1-118) | Sim, sem alteração |
| Header/nav (`header-wrapper`, `nav-container`, `nav-links`, `nav-link`, `mobile-menu-toggle`) (121-238) | Sim — muda só o conteúdo dos links (Seção 8) |
| Hero e CTAs (`hero`, `cta-buttons`, `cta-button`) (239-309) | Sim |
| Seção institucional/estrutura (`structure-grid`, `structure-card`, `structure-sublist`) (471-583) | Sim — é o componente certo para a página "Sobre/Estrutura" do CIn (Grupo Decisório, Grupo Operacional, RIJEF) |
| Bloco `.cin-section`/`.cin-content` (584-639) | **Vira o padrão da home do site novo** — hoje é uma seção dentro do CEJ, no CIn passa a ser a home inteira |
| `.publications-grid`/`.publication-card` (760-849) | Reaproveitar para a listagem de Notas Técnicas |
| `.calendar-*`, `.events-*`, `.event-card` (870-1174) | Só entram se a Fase 3 (agenda própria) for adotada — ver Seção 17 |
| `.acervo-*`, `.documento-card` (1211-1355) | Reaproveitar se as Notas Técnicas usarem o padrão de card de documento (com capa/autor/ano) em vez do padrão de `publication-card` |
| Footer (1394-1470) | Sim — muda conteúdo dos links |
| `.animate-on-scroll` (1471+) | Sim — depende de `script.js: initScrollAnimations()` |
| `.sinemaf-*` (1652-1755) | **Não copiar** — é específico da seção de divulgação do SINEMAF dentro do CEJ, sem equivalente no CIn |
| `.about-*`, `.programas-*` (1791+) | Reaproveitar para a página "Sobre" se o formato (texto + sidebar) fizer sentido para a missão do CIn |

### Scripts client-side

| Arquivo | Função | Ação no fork |
|---|---|---|
| `menu.js` (41 linhas) | Toggle do menu mobile | Copiar sem alteração — agnóstico de conteúdo |
| `script.js` (362 linhas) | Parallax scroll, scroll animations, scrollspy (destaca item ativo na nav), header shrink, smooth scroll, **filtros de calendário de eventos**, debounce | Copiar; **remover o bloco de filtros de calendário** (linhas ~206-342) se a Fase 3 não for adotada — código morto referenciando elementos DOM que não vão existir |
| `acervo.js` (115 linhas) | Busca/filtro/ordenação client-side sobre os cards do acervo, normalizando texto (minúsculas, sem acento) | Copiar sem alteração se a página de Notas Técnicas herdar o padrão de busca do acervo (recomendado — mesma UX que o usuário já conhece do CEJ) |

---

## 6. Identidade visual — especificações exatas de assets

Extraído de `base.njk` e do diretório `site/assets/`. Lista do que precisa ser fornecido antes do bootstrap — **[A LEVANTAR]** com a equipe do CIn:

| Asset | Especificação (herdada do CEJ) | Uso |
|---|---|---|
| `cej_logo.png` → `cin_logo.png` | 738×225px, fundo transparente | Header, `<a class="logo">` |
| `favicon.png` | Formato PNG, referenciado como `image/png` | `<link rel="icon">` |
| `apple-touch-icon.png` | Padrão Apple touch icon | `<link rel="apple-touch-icon">` |
| `assets/social-card.jpg` | 1200×630px (proporção Open Graph) | `og:image`, ativado só quando `site.url` for definido |
| Imagem de hero (equivalente a `assets/cjf-sede.webp`) | WebP, referenciada com `fetchpriority="high"` na home (LCP) | Seção 10 |
| Imagens de cabeçalho de página (equivalentes a `cjf-arte-fachada.webp`, `cjf-arte-02.webp`) | WebP, `display:none` ≤768px, preload condicional só ≥769px | Páginas internas |

`cjf_logo.png` (312×225px original, renderizado a 100px de altura) é **mantido** — é a co-marca do Conselho da Justiça Federal, à qual o CIn permanece vinculado independentemente do domínio próprio.

Todas as imagens novas devem passar por otimização via Sharp no build (mesmo pipeline do CEJ) — não subir PNG/JPG não otimizado direto para `site/assets/`.

---

## 7. Arquitetura de informação e sitemap

| # | URL | Página | Conteúdo (fonte) | Status do conteúdo |
|---|---|---|---|---|
| 1 | `/` | Início | Hero + missão do CIn + "como funciona" (prevenção de demandas repetitivas, gestão de precedentes, inteligência analítica, articulação institucional) | Existe — `index.njk:190-195` |
| 2 | `/sobre/` | Sobre | Contextualização institucional: CIn como resposta à judicialização excessiva contra o Poder Público, vínculo com o CEJ/CGJF, paralelo com o CIPJ do CNJ | Existe — `index.njk:191-192` |
| 3 | `/estrutura/` | Estrutura | Grupo Decisório (fixa diretrizes, aprova Notas Técnicas), Grupo Operacional (conduz estudos/minutas, articulado com os CLIs), RIJEF, ASCIn | Existe — `index.njk:141-144`, `README.md` |
| 4 | `/notas-tecnicas/` | Notas Técnicas | Feed da série `cej-cin` (Opção A ou B, Seção 2) | Existe (5 documentos) — só falta a página própria em vez do filtro dentro do acervo do CEJ |
| 5 | `/rede/` | Rede de Inteligência | Mapa dos CLIs (Centros Locais de Inteligência) por Seção Judiciária | **[A LEVANTAR]** — hoje só citado em texto corrido no `README.md`, sem lista. Não inventar a relação de CLIs. |
| 6 | `/#contato` | Contato | Reaproveita `data/contatos.json`, com contatos próprios do CIn/ASCIn | **[A LEVANTAR]** — e-mail/telefone/endereço específicos do CIn, se diferentes dos do CEJ |
| — | `/404.html` | Erro | Adaptar texto e links de retorno | Adaptação trivial |
| — | `/sitemap.xml`, `/robots.txt` | Técnicas | Já dinâmicas via `collections.all`, sem alteração | Copiar sem alteração |

### Roteiro de seções da home (`index.njk` do CIn)

Espelhando a ordem de seções já usada no `index.njk` do CEJ, adaptada:

1. **Hero** (`.hero`) — título de impacto + CTA duplo (ex.: "Conheça a Rede de Inteligência" / "Acessar Notas Técnicas").
2. **Missão** (reaproveitando `.cin-content`/`.cin-text`) — os dois parágrafos já existentes sobre litigiosidade excessiva e gestão baseada em dados.
3. **Como funciona** (`.features-grid`/`.feature-card`, 4 cards) — um card por eixo: prevenção de demandas repetitivas, gestão de precedentes, inteligência analítica, articulação institucional.
4. **Estrutura resumida** (`.structure-grid`/`.structure-card`) — Grupo Decisório, Grupo Operacional, RIJEF, com CTA "Ver detalhamento" → `/estrutura/`.
5. **Notas Técnicas em destaque** (`.publications-grid` ou `.acervo-grid`, 3-4 mais recentes) — CTA "Ver todas" → `/notas-tecnicas/`.
6. **Contato** — reaproveita o padrão de `.contact-section`.

Não incluí uma seção de "Rede de Inteligência" na home até o conteúdo da página 5 estar levantado — evita um card apontando para uma página vazia no lançamento.

---

## 8. Navegação e rodapé propostos

Nav (`base.njk`, mesma estrutura de `.nav-links`, 5-6 itens em vez dos 7 atuais do CEJ, já que não há páginas de Eventos/Publicações múltiplas):

```
Início        /
Sobre         /sobre/
Estrutura     /estrutura/
Notas Técnicas /notas-tecnicas/
Rede          /rede/          (só depois do conteúdo da Seção 7 #5 ser levantado)
Contato       /#contato
```

Sem item equivalente ao "SINEMAF" com `target="_blank"` — a menos que o CIn também precise linkar de volta para o CEJ (recomendado): um item final `nav-link-destaque` "CEJ ↗" apontando para o domínio do CEJ, espelhando exatamente o padrão que o próprio CEJ usa hoje para apontar para o SINEMAF (`base.njk:107`).

Footer: mesma estrutura de 4 colunas (`Sobre` / `Links Rápidos` / `Contato` / `Redes Sociais`), trocando o texto institucional pela descrição do CIn e o link de volta para o CEJ.

**Simetria a fechar no lançamento:** o CEJ aponta para o CIn (Seção 14) e o CIn aponta de volta para o CEJ — os dois links devem existir desde o dia 1, não só um lado.

---

## 9. Modelo de dados — schemas

Depende diretamente da Seção 2:

- **Opção A (federado):** nenhum schema novo é criado no `cin_site`. Ele só precisa de uma cópia de `documento.schema.json` para validar o que recebe do feed (mesma disciplina de `carregar-eventos.js`, que valida mesmo consumindo fonte externa). O feed em si é publicado pelo CEJ conforme o contrato da Seção 2.
- **Opção B (independente):** copiar `data/schemas/documento.schema.json` como está — os campos `id`, `serie`, `titulo`, `descricao`, `autor`, `ano`, `url`, `capa` já são genéricos o suficiente para Notas Técnicas. **Não criar** um "schema de nota técnica" dedicado — seria duplicação de contrato sem ganho real.

Em ambos os cenários, **não criar** um schema de "CLI" ou "Grupo de Inteligência" até haver um caso de uso real de listar/filtrar isso dinamicamente (busca, contagem por região etc.) — até lá, é conteúdo institucional estático de página (texto direto no `.njk`, como já é `estrutura.njk` no CEJ), sem justificar um contrato JSON.

Se e quando a Fase 3 (agenda própria, Seção 17) for adotada: `data/schemas/evento.schema.json` é reaproveitado **sem alteração** — é o mesmo contrato de federação já pensado para a rede SINEMAF, e o CIn entraria nele como mais uma `fonte`.

---

## 10. SEO e dados estruturados

- **Schema.org** (`base.njk:29-53`): trocar `"@type": "GovernmentOrganization"`, `"name"` para o nome do CIn, e `"parentOrganization"` para `{ "@type": "GovernmentOrganization", "name": "Centro de Estudos Judiciários" }` (o CIn é vinculado ao CEJ, não diretamente ao CJF — ver estrutura já descrita no `README.md`).
- **Canonical/OG/sitemap:** mesma mecânica condicional já implementada — `data/site.json` com `url` vazio desativa `<link rel="canonical">`, `og:url` e `og:image` até o domínio ser definido pela STI. Não adaptar essa lógica, só preencher o valor quando existir.
- **`sitemap.njk`/`robots.njk`:** já dinâmicos via `collections.all` do Eleventy — copiar sem alteração, eles se ajustam sozinhos ao conjunto de páginas real do novo site.
- **Preload de LCP** (`base.njk:62-72`): o bloco condicional por `page.url` precisa ser reescrito para as URLs novas (Seção 7) — apontando para a imagem de hero de cada página em vez de `/`, `/sobre/`, `/publicacoes/`, `/estrutura/` do CEJ.

---

## 11. Acessibilidade

Herdar sem reinterpretar — são requisitos WCAG/eMAG já implementados, não recomendações a reavaliar:

- Contraste mínimo 4.5:1 (texto normal) e 3:1 (texto grande/elementos gráficos) — testar de novo **apenas se** a cor institucional do CIn substituir `--jf-blue`/`--jf-green` (Seção 5).
- Skip-link ("Pular para o conteúdo") — copiar `base.njk:76` sem alteração.
- Foco visível em todo elemento interativo (`:focus-visible`, `style.css:81-96`) — inclui a variante de contorno branco sobre fundos escuros (nav, hero, footer).
- `scroll-margin-top: 80px` em `section[id]`/`main[id]` (`style.css:61-65`) — evita que a nav fixa cubra o alvo de âncoras como `/#contato`.
- `alt` descritivo em toda imagem, `aria-label` em botões só com ícone (padrão já seguido em `base.njk` e nos shortcodes de ícone).

---

## 12. Segurança e hospedagem

Modelo de ameaça idêntico ao do CEJ ([SEGURANCA.md](SEGURANCA.md)): site 100% estático, sem backend/banco/cookies/formulários — SQLi, CSRF e sequestro de sessão não se aplicam.

**`vercel.json` do novo domínio** (rascunho, a ajustar quando o domínio real for definido pela STI):

```json
{
    "headers": [
        {
            "source": "/(.*)",
            "headers": [
                { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
                { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://www.cjf.jus.br https://cjf.jus.br <origem-do-feed-do-cej-se-opcao-a>; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
                { "key": "X-Content-Type-Options", "value": "nosniff" },
                { "key": "X-Frame-Options", "value": "DENY" },
                { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
                { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
            ]
        }
    ]
}
```

Diferença chave em relação ao do CEJ: **na Opção A, o `fetch` do feed acontece em build time** (dentro do `lib/carregar-documentos.js`, rodando no CI), nunca no browser — então `connect-src 'self'` continua correto e a CSP não precisa liberar o domínio do CEJ para o cliente. Se algum dia essa leitura migrar para runtime no browser, a CSP precisaria mudar — não é o caso aqui.

TLS mínimo 1.2 (preferir 1.3), redirecionamento HTTP→HTTPS, `/404.html` como página de erro — mesmos requisitos a entregar à STI, para o domínio novo (não são herdados automaticamente do domínio do CEJ).

**Pendências de segurança a replicar do CEJ desde o primeiro commit** (não são débito técnico a adiar): pinagem de Actions por SHA em vez de tag (`@v4`), Dependabot habilitado. O CEJ ainda não fez isso — não repetir a pendência no fork é mais barato do que corrigir depois.

---

## 13. CI/CD

Copiar os workflows do CEJ, adaptando:

| Workflow | Ação no fork |
|---|---|
| `ci.yml` | Copiar sem alteração de lógica — `npm ci` → `npm run validar` → `npm run build`, `permissions: contents: read`. |
| `verificar-links.yml` | Copiar sem alteração — varredura mensal de link rot, agora sobre os links do CIn. |
| `atualizar-noticias.yml` | **Não copiar** na Opção A — não há RSS próprio do CIn a importar. Se a Opção A vier acompanhada de uma sincronização periódica do feed de documentos (para o `cin_site` rebuildar quando o CEJ publicar algo novo), criar um workflow novo (`sincronizar-cin.yml`) com `schedule` + `workflow_dispatch`, disparando só `npm run build` (o `fetch` do feed já acontece dentro do build) — sem `contents: write`, porque não há commit de dado, só rebuild. |

---

## 14. O que muda no `cej_site` quando o CIn for ao ar

1. `site/_includes/layouts/base.njk:106` — trocar `href="/#cin"` pelo domínio real do CIn, adicionar o ícone de link externo (`solid/arrow-up-right-from-square`), exatamente como já é feito para o SINEMAF na linha seguinte. **O código já documenta essa troca em comentário.**
2. Footer (`base.njk:134`) — mesmo ajuste de link.
3. Se Opção A: `eleventy.config.js` ganha o passo de `addPassthroughCopy`/`addGlobalData` descrito na Seção 2, publicando `/api/documentos-cin.json` e `/api/schemas/documento-1.0.json`.
4. Se Opção B: documentar a data de corte em que o CEJ para de curar `cej-cin`, e o destino dos 5 documentos já publicados (migram para o `cin_site`, ou o CEJ mantém o histórico e o CIn só publica dali para frente).
5. `data/publicacoes.json` (linhas 51-58, entrada "Notas Técnicas") — na Opção B, o `href` deixa de ser `/publicacoes/?serie=cej-cin` e passa a apontar para o domínio do CIn.

---

## 15. Performance

- **LCP:** seguir o padrão condicional já existente em `base.njk:62-72` — preload incondicional da imagem de hero da home, preload condicional (`media="(min-width: 769px)"`) das artes de cabeçalho que somem no mobile.
- **Imagens:** todas em WebP, processadas por Sharp no build — nenhuma imagem "crua" direto de `site/assets/` sem passar pelo pipeline.
- **Fontes:** `preload` das variantes realmente usadas acima da dobra (Inter 400, Montserrat 700 — mesmo par que o CEJ pré-carrega hoje), demais variantes carregadas via `fonts.css` sem preload.
- **JS:** `script.js` sem o bloco de filtro de calendário (Seção 5) é mais leve — menos DOM a percorrer no `initScrollAnimations`/`initScrollSpy` se o site tiver menos seções que o CEJ.

---

## 16. Testes, QA e Definition of Done

Antes de qualquer deploy, replicar a mesma disciplina do CEJ:

- [ ] `npm run validar` limpo — todo dado (Notas Técnicas, contatos) passa no schema correspondente.
- [ ] `npm run build` limpo, sem warnings do Eleventy.
- [ ] `npm run verificar-links` sem 404 novos.
- [ ] Revisão manual em navegador: navegação por teclado (Tab) até o fim da página sem perder o foco, skip-link funcional, contraste visualmente conferido nas cores que mudaram (se mudaram).
- [ ] Teste em mobile real ou emulado: menu hamburguer, `scroll-margin-top` nas âncoras, imagens que deveriam sumir (`display:none`) realmente somem.
- [ ] Lighthouse (Performance, Acessibilidade, SEO) rodado localmente antes do primeiro deploy — sem meta numérica arbitrária aqui; comparar contra o Lighthouse do próprio `cej_site` como baseline, já que a stack é a mesma.
- [ ] Se Opção A: derrubar a fonte do feed do CEJ propositalmente (ex.: apontar `data/fontes.js` para uma URL inválida) e confirmar que `npm run validar`/build falha alto e claro — não silenciosamente com página vazia.

---

## 17. Cronograma faseado

| Fase | Escopo | Bloqueada por |
|---|---|---|
| **Fase 0 — Setup** | Criar repositório, executar Seção 4 (bootstrap de arquivos), sem conteúdo real ainda | Nada — pode começar hoje |
| **Fase 1 — MVP institucional** | Páginas Início/Sobre/Estrutura/Notas Técnicas com conteúdo real (Seção 7, itens 1-4), Opção A rodando | Decisão da Seção 2, assets da Seção 6 |
| **Fase 2 — Lançamento** | Domínio/hospedagem definidos pela STI, cutover dos links no `cej_site` (Seção 14), `data/site.json` com `url` preenchida | Decisão institucional de domínio (já encaminhada, mas sem data) |
| **Fase 3 — Página "Rede de Inteligência"** | `/rede/`, mapa de CLIs | Levantamento de conteúdo com a equipe do CIn (Seção 7, item 5) |
| **Fase 4 — Autonomia editorial (opcional)** | Migração da Opção A para a Opção B, se e quando o CIn tiver equipe própria de publicação | Nenhuma — é uma decisão de governança, não técnica, ver Seção 2 |
| **Fase 5 — Agenda própria (opcional, sem indício de necessidade hoje)** | `/eventos/`, reaproveitando `evento.schema.json` sem alteração | Evidência real de que o CIn passará a ter eventos/cursos próprios |

---

## 18. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Seguir os tokens de cor documentados em `IDENTIDADE_VISUAL.md` em vez dos reais de `style.css` (ver Seção 1) | CSS quebrado ou com variáveis `undefined`, silenciosamente ignoradas pelo browser | Usar a Seção 5 deste documento como fonte, não o manual, até o manual ser corrigido no CEJ |
| Opção A e Opção B ficarem ambíguas até depois do lançamento | Duas fontes de verdade para a mesma Nota Técnica, divergindo com o tempo | Fechar a decisão da Seção 2 antes do primeiro commit do novo repositório — é bloqueante, não paralelo |
| Página "Rede de Inteligência" lançada com lista de CLIs inventada ou incompleta | Erro factual público em site institucional, sob o nome do CIn | Não lançar `/rede/` até o conteúdo ser confirmado pela equipe do CIn (Fase 3, não Fase 1) |
| CEJ e CIn linkando só em uma direção depois do lançamento | Usuário chega no CIn e não consegue voltar para o "site-mãe", ou vice-versa | Checklist da Seção 8 exige os dois links simultaneamente no lançamento |
| Domínio da STI atrasar indefinidamente | `cin_site` pronto sem onde publicar | Fases 0-1 não dependem do domínio — só a Fase 2 (cutover) depende |
| Reaproveitar `script.js` inteiro sem remover o bloco de filtro de calendário | JS morto referenciando elementos DOM inexistentes (`document.querySelector` retornando `null` sem erro visível, mas com listeners nunca disparando) | Remoção explícita listada na Seção 4/5 antes do primeiro deploy |

---

## 19. Fora de escopo / adiado

Espelhando o critério já aplicado no `ARQUITETURA.md` do CEJ — não é conservadorismo deste documento, é o mesmo padrão do projeto-mãe:

- Autenticação de qualquer tipo — sem indício de área logada no CIn.
- API dinâmica de escrita entre CEJ e CIn — a Opção A é federação por feed estático em build time, não uma API com autenticação entre serviços.
- Página/schema de CLIs até haver conteúdo real levantado com a equipe do CIn (Fase 3).
- Agenda de eventos própria (Fase 5) até haver evidência de que existe.
- Qualquer alteração de cor institucional sem confirmação formal — herdar os tokens reais do CEJ é o padrão até segunda ordem.

---

## 20. Checklist de arranque

**Bloqueante (antes do primeiro commit):**
- [ ] Decidir Opção A vs. Opção B (Seção 2).
- [ ] Confirmar com a STI/governança do CIn: nome oficial a exibir, domínio-alvo, cor institucional (se houver), contatos (`data/contatos.json`).

**Fase 0 — Setup:**
- [ ] Criar o repositório novo por fork do estado atual do `cej_site`.
- [ ] Executar a árvore de arquivos da Seção 4 (copiar / adaptar / criar / remover, item a item).
- [ ] Aplicar os tokens reais da Seção 5 — conferir que nenhum seletor do CSS ficou órfão após remover blocos não usados (`.sinemaf-*`, `.calendar-*`/`.event-*` se Fase 5 não for adotada).

**Fase 1 — MVP institucional:**
- [ ] Assets da Seção 6 recebidos e otimizados.
- [ ] Conteúdo real das páginas 1-4 da Seção 7 escrito (reaproveitando o texto já existente no `index.njk`/`README.md` do CEJ como ponto de partida, não como cópia definitiva).
- [ ] Feed/schema da Opção A (ou dados locais da Opção B) funcionando — `npm run validar` limpo.
- [ ] Nav e footer da Seção 8 implementados, com o link de volta para o CEJ.
- [ ] Schema.org, canonical/OG e preload de LCP adaptados (Seções 10-11).
- [ ] Checklist de QA da Seção 16 completo.

**Fase 2 — Lançamento:**
- [ ] Domínio configurado pela STI, TLS/HSTS/headers da Seção 12 aplicados.
- [ ] `data/site.json` com `url` preenchida.
- [ ] Mudanças no `cej_site` da Seção 14 aplicadas no mesmo dia do lançamento — não antes (o link ficaria quebrado) nem muito depois (o comentário no código fica pendente sem necessidade).
