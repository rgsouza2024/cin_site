# Planejamento — Portal do CIn (spin-off do site do CEJ)

Documento de referência para a construção do site do **Centro Nacional de Inteligência da Justiça Federal (CIn)** como spin-off do portal do CEJ. Transferido para este repositório (`cin_site`) em 14/07/2026, quando a Fase 0 (scaffold) começou a ser executada. Seu conteúdo deve migrar para `ARQUITETURA.md`/`README.md` deste repositório conforme cada seção for executada, e pode ser removido quando não sobrar nenhuma pendência aberta.

**Como usar este documento:** cada seção técnica está escrita para ser executável — quando cita um arquivo, é o arquivo real do repositório na data deste planejamento; quando propõe um valor, é o valor real extraído do código, não uma aproximação do manual. Onde o conteúdo depende de informação que só a equipe do CIn tem, está marcado explicitamente como **[A LEVANTAR]** — não foi inventado.

**Decisões fechadas:**
- Repositório novo e independente (`cin_site`), por fork da estrutura do `cej_site` (13/07/2026).
- Hospedagem e domínio próprios, no padrão já usado pelo SINEMAF (`sinemaf.cjf.jus.br`) — presença web independente definida pela STI (13/07/2026).
- **Origem e custódia do conteúdo (15/07/2026): Opção B — o CIn é dono do próprio acervo.** Ver Seção 2, decisão tomada a partir da exigência de busca em texto integral, que muda o que "repositório" significa aqui.
- **Busca em texto integral, não só em metadados (15/07/2026):** Pagefind, estático, sem backend. Ver Seção 10.

---

## 1. Por que isto é um fork de baixo risco

O `cej_site` já foi construído prevendo este momento:

- [IDENTIDADE_VISUAL.md](../cej_site/IDENTIDADE_VISUAL.md) já contém um roteiro de "Passo a Passo para Criar um Spin-Off Visualmente Coerente" — escrito antes desta conversa.
- A navegação principal do CEJ já tinha o item do CIn destacado e com um comentário no próprio HTML apontando para este exato momento.
- A stack (Eleventy + Nunjucks + dados por contrato validados por Ajv) não tem lock-in e é barata de replicar.

**Ressalva já registrada:** o `IDENTIDADE_VISUAL.md` documenta tokens de cor que não existem no `style.css` real (`--primary-blue`, `--dark-gray`, `--light-gray`). A Seção 5 usa os tokens **reais**, extraídos diretamente do CSS copiado para este repositório — é a fonte de verdade, não o manual.

**Ressalva nova desta rodada:** herdar "exatamente o mesmo estilo" era, na largada, sobre UI/UX visual. A exigência de busca em texto integral (Seção 10) diverge da arquitetura de dados do CEJ de um jeito que não é estético — é estrutural. Isso é esperado e correto: o caso de uso do CIn (acervo pesquisável de Notas Técnicas) é genuinamente diferente do caso de uso do CEJ (catálogo de publicações por metadado). Coerência visual não exige arquitetura de dados idêntica.

---

## 2. Origem e custódia do conteúdo do CIn (decisão fechada)

### O que mudou em relação ao planejamento original

A primeira versão deste documento apresentava duas opções (federar do CEJ vs. dados próprios) e recomendava federar. A resposta de Rodrigo em 15/07/2026 resolve isso: o CIn deve ser **"repositório de todo o conteúdo produzido pelo Centro"**, com busca no **conteúdo efetivo** de cada Nota Técnica, não só no título. Isso não é federação — federação é o CIn linkar/espelhar o que o CEJ cataloga. Repositório é o CIn ser dono e guardião do próprio acervo. **É a Opção B.**

### Achado relevante ao apurar isso

O `cej_site` só tem **5 Notas Técnicas** catalogadas em `data/documentos.json` (série `cej-cin`). Rodrigo estimou que existem **~50 NTs desde a criação do CIn em 2017**. Ou seja: **o gargalo real deste projeto não é técnico — é reunir e digitalizar as ~45 NTs que ainda não estão em lugar nenhum do sistema.** Isso precisa de um dono dentro da equipe do CIn e não se resolve com código. Ver Seção 16 (cronograma) e Seção 17 (riscos).

**Achado mais forte, confirmado em 15/07/2026:** o próprio portal oficial do CJF não tem uma listagem funcional de Notas Técnicas em nenhum dos dois caminhos onde deveria estar — `.../nucleo-de-estudo-e-pesquisa/notas-tecnicas` e `.../publicacoes-1/serie-cej-cnijf-1` retornam "Nenhum arquivo encontrado". As ~45 NTs faltantes provavelmente não estão a um clique de distância nem para quem tem acesso interno ao CJF; a Fase 1.5 é mais custosa do que uma simples exportação de listagem.

### Migração (não federação contínua)

Os 5 registros que hoje vivem em `cej_site/data/documentos.json` migram **uma vez** para `data/notas-tecnicas.json` deste repositório. A partir da data de corte, o CEJ para de ser dono da série `cej-cin` — ver Seção 15 ("O que muda no `cej_site`").

### Custódia dos arquivos PDF

Com um corpus pequeno (~50 hoje, ~100 projetado para 2036 — crescimento de ~5 NTs/ano) e PDFs de texto nativo (não escaneados, confirmado por Rodrigo), a decisão é: **os PDFs ficam como asset estático dentro do próprio repositório** (`site/assets/notas-tecnicas/*.pdf`, copiados via passthrough), não como link para o portal do CJF. Isso é o sentido literal de "repositório": o CIn possui e serve o arquivo, não depende da permanência de um link externo (o CEJ já tem um script de verificação mensal de link rot exatamente porque links externos quebram).

**Gatilho de revisão:** se o volume real de PDFs, quando os arquivos existirem, aproximar o repositório do limite prático do GitHub (soft warning acima de ~1GB, bloqueio rígido em arquivos individuais >100MB), migrar para blob storage (Vercel Blob ou S3) sem mudar o esquema de URLs públicas. Não há indício disso hoje — não construir a solução de blob storage por antecipação.

---

## 3. Stack técnica

Herdada do `cej_site`, com duas adições específicas do CIn:

| Camada | Ferramenta | Observação |
|---|---|---|
| Gerador estático | Eleventy (11ty) 3.1.6 | Igual ao CEJ |
| Template engine | Nunjucks | Igual ao CEJ |
| Validação de dados | Ajv 8.20.0 | Igual ao CEJ |
| Otimização de imagem | Sharp 0.35.3 | Igual ao CEJ |
| Ícones | Font Awesome Free 7.3.0, inlinado em SVG no build | Igual ao CEJ |
| **Extração de texto de PDF** | `pdf-parse` (ou `pdfjs-dist`, a confirmar no primeiro teste real) | **Novo** — só existe porque o CIn extrai o conteúdo integral das NTs, não só metadado |
| **Indexação e busca** | `pagefind` (CLI, roda como passo pós-build) | **Novo** — índice de busca estático, sem servidor |
| Runtime de build | Node.js 22 | Igual ao CEJ |

`package.json`: os scripts `build`/`start`/`verificar-links` já existem no scaffold atual. Este planejamento adiciona `atualizar-notas-tecnicas` (extrai texto + atualiza cache) e altera `build` para rodar o Pagefind depois do Eleventy — ver Seção 10.

---

## 4. Árvore de arquivos — itens novos desta decisão

Itens que **não existiam** no scaffold da Fase 0 e entram a partir desta decisão:

```
cin_site/
├── data/
│   ├── notas-tecnicas.json          [CRIAR — catálogo próprio, schema = documento.schema.json]
│   └── notas-tecnicas-texto.json    [CRIAR — cache do texto extraído por id, evita reprocessar PDF a cada build]
├── scripts/
│   └── importar-notas-tecnicas.js   [CRIAR — extrai texto de site/assets/notas-tecnicas/*.pdf, popula o cache]
├── lib/
│   └── carregar-notas-tecnicas.js   [CRIAR — valida notas-tecnicas.json contra o schema, injeta o texto do cache]
├── site/
│   ├── assets/notas-tecnicas/*.pdf  [CRIAR — os PDFs em si, custódia própria (Seção 2)]
│   ├── notas-tecnicas.njk           [CRIAR — página de listagem + caixa de busca]
│   ├── notas-tecnicas/
│   │   └── nota-tecnica.njk         [CRIAR — template de página individual por NT, paginação do Eleventy sobre a collection]
│   └── _includes/partials/
│       └── nota-tecnica-card.njk    [CRIAR — card reaproveitando o padrão visual de documento-card do CEJ]
└── (pós-build) _site/pagefind/      [GERADO pelo comando `pagefind`, não versionado — mesmo tratamento de _site/ no .gitignore]
```

---

## 5-9. (sem alteração de conteúdo nesta rodada)

As Seções 5 (Sistema de design herdado), 6 (Identidade visual — assets), 7 (Arquitetura de informação), 8 (Navegação) e 9 (Modelo de dados — schemas) do planejamento original continuam válidas como estavam, com um ajuste pontual:

- **Seção 7** — a entrada "Notas Técnicas" do sitemap deixa de ser uma página única de listagem e passa a ser: `/notas-tecnicas/` (listagem + busca) **+** uma página por NT em `/notas-tecnicas/<slug>/` (Seção 10 explica por quê — cada página precisa existir de verdade para o Pagefind indexar e para o Google achar cada NT individualmente).
- **Seção 8** — o item de nav "Notas Técnicas", antes bloqueado, **está desbloqueado** a partir desta decisão. Entra em `base.njk` assim que `/notas-tecnicas/` existir.
- **Seção 9** — `documento.schema.json` continua sendo o contrato certo, sem alteração — os campos `id`, `serie`, `titulo`, `descricao`, `autor`, `ano`, `url`, `capa` seguem fazendo sentido. `url` passa a apontar para o PDF dentro do próprio site (`/assets/notas-tecnicas/<arquivo>.pdf`) em vez do portal do CJF.

---

## 10. Busca em texto integral (Pagefind) — a peça nova

### Por que estático e não um serviço de busca

Os quatro fatos levantados com Rodrigo (15/07/2026) apontam todos na mesma direção:

| Fator | Resposta | Implicação |
|---|---|---|
| Volume | ~50 NTs hoje, ~100 projetadas para 2036 (~5/ano) | Corpus pequeno demais para justificar infraestrutura de busca dedicada |
| Tipo de PDF | Texto nativo, não escaneado | Extração trivial e confiável, sem OCR |
| Público | Também pesquisadores/público externo | Reforça estático: CDN aguenta tráfego público sem servidor dedicado a manter |
| Custódia | PDFs no próprio repositório | Sem API externa a proteger, sem novo serviço a autenticar |

Um motor de busca com backend (Meilisearch/Typesense/Algolia) resolveria um problema de escala que este projeto não tem, ao custo de manter infraestrutura, hardening e disponibilidade que a arquitetura atual não precisa. Mesma lógica que o `ARQUITETURA.md` do CEJ já aplica a microsserviços: **nunca backend de busca prematuro.**

### Pipeline proposto

```
site/assets/notas-tecnicas/*.pdf
        │
        ▼  scripts/importar-notas-tecnicas.js (roda sob demanda, quando uma NT nova entra)
        │  pdf-parse extrai o texto de cada PDF novo/alterado
        ▼
data/notas-tecnicas-texto.json  (cache: id → texto extraído, evita reprocessar em todo build)
        │
        ▼  lib/carregar-notas-tecnicas.js (roda em todo build, valida + junta catálogo + texto)
        │
        ▼  site/notas-tecnicas/nota-tecnica.njk (paginação do Eleventy: 1 página HTML por NT,
        │   texto completo renderizado no corpo da página, marcado para o Pagefind indexar)
        ▼
npm run build → eleventy (gera _site/) → pagefind --site _site (indexa o HTML gerado)
        │
        ▼
_site/pagefind/  (índice estático: WASM + fragmentos JSON, servido como qualquer asset)
```

### Por que uma página por NT (e não só um índice JSON)

Duas razões, não uma:
1. **O Pagefind indexa HTML renderizado**, não JSON de dados — precisa de uma página real por documento para ter o que indexar.
2. **SEO para o público externo/pesquisador** (confirmado como público-alvo): cada NT ganha uma URL própria, indexável pelo Google — hoje nem o CEJ faz isso para os PDFs do próprio acervo (o link vai direto para o arquivo, não para uma página HTML com o conteúdo). É uma melhoria que o CIn tem e o CEJ não, justificada pelo caso de uso ser diferente.

### Interface de busca

Usar a **API headless do Pagefind** (`pagefind.search()`), não o widget de UI padrão que a ferramenta oferece — a caixa de busca precisa seguir o sistema de design herdado (Seção 5: tokens `--jf-blue`/`--jf-green`, tipografia Montserrat/Inter, `.svg-icon` para o ícone de lupa), não parecer um componente de terceiro colado por cima. Isso é trabalho de front-end sobre uma API já pronta, não escrever um motor de busca do zero.

### Cache de texto extraído — por que existe

Reextrair texto de 50-100 PDFs a cada build (`npm run build` roda no CI a cada push) é desperdício de tempo de build sem necessidade — o texto de uma NT já publicada não muda. `data/notas-tecnicas-texto.json` guarda o texto por `id`; `importar-notas-tecnicas.js` só reprocessa o que for novo ou tiver o PDF alterado (comparação por hash do arquivo, mesmo princípio de idempotência que `scripts/importar-acervo.js` já usa no CEJ para snapshots).

---

## 11. SEO e dados estruturados — ajuste

Além do que a Seção 11 original já previa (schema.org, canonical/OG condicionais, preload de LCP): cada página `/notas-tecnicas/<slug>/` deve ter `schema.org` do tipo `Article` ou `GovernmentPermit`/`DigitalDocument` (a definir no detalhamento de implementação) com `datePublished` (campo `ano` do schema) e `author`, para o Google entender que é conteúdo institucional citável — não só mais uma página do site.

---

## 12. Acessibilidade — ajuste

Além dos itens já previstos: a interface de busca precisa de `aria-live="polite"` na região de resultados (para leitores de tela anunciarem "N resultados encontrados" sem precisar de foco manual), navegação por teclado completa nos resultados (seta ↑/↓ ou Tab, sem armadilha de foco), e `aria-label` claro no campo de busca. Isso é requisito do mesmo padrão WCAG/eMAG já seguido no resto do site, não uma exigência nova — só não existia antes porque não havia campo de busca.

---

## 13. Segurança e hospedagem — ajuste na CSP

O rascunho de `vercel.json` da Seção 12 original precisa de um ajuste concreto: o Pagefind carrega um módulo WASM para a busca. A CSP proposta (`script-src 'self'`) já cobre isso **desde que o WASM seja servido como asset próprio** (é o padrão do Pagefind — não carrega de CDN externo), mas pode ser necessário adicionar `'wasm-unsafe-eval'` a `script-src` dependendo da versão do Pagefind — **testar contra a CSP real antes de assumir que passa sem ajuste**, não presumir.

PDFs servidos como estático (`/assets/notas-tecnicas/*.pdf`) não mudam o modelo de ameaça: mesma classe de arquivo estático que já é servido hoje (`site/assets/*.webp`), sem interpretação em runtime.

---

## 14. CI/CD — ajuste no `ci.yml`

```yaml
- name: Extrair texto das Notas Técnicas (cache incremental)
  run: node scripts/importar-notas-tecnicas.js
- name: Gerar o site
  run: npm run build   # eleventy && pagefind --site _site
```

`importar-notas-tecnicas.js` só processa PDFs novos/alterados (Seção 10) — o passo de CI não fica lento com o tempo, mesmo com o corpus crescendo.

---

## 15. O que muda no `cej_site` — ajuste

Além do que a Seção 14 original do planejamento já listava (trocar `/#cin` por domínio real, ajustar footer): com a Opção B confirmada,

1. **Definir a data de corte** em que o CEJ para de curar a série `cej-cin` em `data/documentos.json`.
2. Os 5 registros migram para `cin_site/data/notas-tecnicas.json` — depois da migração, decidir se o CEJ **remove** essas 5 entradas (evita duas fontes da mesma NT) ou as **mantém como histórico read-only** com uma nota apontando para o domínio do CIn. Recomendo remover — manter os dois lugares é o cenário exato de divergência que a Seção 2 original queria evitar.
3. `data/publicacoes.json` do CEJ (entrada "Notas Técnicas") passa a apontar para o domínio do CIn em vez de `/publicacoes/?serie=cej-cin`.

---

## 16. Cronograma faseado — atualizado

| Fase | Escopo | Bloqueada por |
|---|---|---|
| **Fase 0 — Setup** ✅ | Scaffold, git, build funcionando | Concluída 14/07/2026 |
| **Fase 1 — MVP institucional** ✅ | Início/Sobre/Estrutura com conteúdo real | Concluída 14/07/2026 |
| **Fase 1.5 — Levantamento do acervo (NÃO é trabalho de engenharia)** | Reunir e digitalizar as ~45 NTs que faltam catalogar. Precisa de um dono na equipe do CIn. Índice parcial já conhecido (15/07/2026, por citação em material institucional, **sem os arquivos**): NT 06/2018, 16/2018, 18/2018, 34/2021, 43/2023, 48/2024, 50/2024, 55/2025, 56/2025, 57/2025, 62/2025, 63/2025 — 12 números confirmados de ~50, ponto de partida para a busca dos PDFs, não substitui o levantamento. | Ninguém designado ainda — **risco maior do projeto**, ver Seção 17 |
| **Fase 2 — Pipeline de busca** | Seção 10 completa: extração, cache, páginas por NT, Pagefind, UI de busca | Fase 1.5 ter ao menos um lote inicial de PDFs reais para testar a extração de verdade (não só os 5 já digitais) |
| **Fase 3 — Lançamento** | Domínio/hospedagem definidos pela STI, cutover dos links no `cej_site` (Seção 15) | Decisão institucional de domínio |
| **Fase 4 — Página "Rede de Inteligência"** ✅ | `/rede/` publicada em 15/07/2026 com os 27 CLIs e a rede por TRF, fonte: documento oficial do CJF (não inventado). **Pendência restante**: confirmar com a equipe do CIn que a lista está atual — a fonte já registrava 9 de 27 Seções "em construção" e um link (RS) inconsistente com outro estado (MS), omitido em vez de propagado. | Concluída como rascunho sourced; falta validação humana da equipe do CIn |

---

## 17. Riscos e mitigação — itens novos

| Risco | Impacto | Mitigação |
|---|---|---|
| Ninguém assume a Fase 1.5 (levantamento das ~45 NTs) | Projeto tecnicamente pronto, acervo real continua com 10% do conteúdo | Apontar isso como decisão de governança a Rodrigo/equipe do CIn — não é algo que se resolve com mais código |
| Extração de texto com qualidade ruim em PDFs com tabelas/colunas complexas | Busca retorna trechos fragmentados ou fora de ordem para NTs com layout mais elaborado | Testar `pdf-parse` contra uma amostra real de NTs (não só os 5 já digitais) antes de assumir que a extração simples basta; considerar `pdfjs-dist` como alternativa se a qualidade for ruim |
| Repositório cresce além do confortável para git conforme mais PDFs entram | Clones lentos, possível bloqueio do GitHub em arquivo individual >100MB | Gatilho de revisão já definido na Seção 2 — migrar para blob storage quando (se) o volume real justificar |
| CSP bloquear o WASM do Pagefind em produção sem ninguém perceber em dev | Busca quebrada silenciosamente só em produção (CSP costuma estar mais frouxa em `npm run start` local) | Testar a build de produção com a CSP real do `vercel.json` antes do lançamento, não só o servidor de desenvolvimento do Eleventy |

*(Riscos da Seção 18 original — tokens de cor do manual desatualizado, Opção A/B ambígua, página de CLIs inventada, links unidirecionais, domínio atrasando, JS morto de calendário — continuam válidos e não foram repetidos aqui.)*

---

## 18. Fora de escopo / adiado — ajuste

Confirmando explicitamente o que a Seção 10 já argumenta: **motor de busca com backend está fora de escopo enquanto o corpus for da ordem de grandeza projetada (dezenas a ~100 documentos até 2036).** Se esse número mudar por uma ordem de grandeza (ex.: o CIn passar a publicar milhares de documentos, ou incorporar acervo de outras fontes), essa decisão precisa ser revisitada — não é uma proibição permanente, é uma decisão calibrada para o volume real informado.

Os demais itens fora de escopo do planejamento original (autenticação, API de escrita entre CEJ e CIn, agenda de eventos própria) continuam adiados pelos mesmos motivos.

---

## 19. Checklist de arranque — itens novos

- [ ] Designar um responsável na equipe do CIn para a Fase 1.5 (levantamento das ~45 NTs faltantes) — bloqueante para testar a extração de texto com dados reais.
- [ ] Testar `pdf-parse` (ou `pdfjs-dist`) contra uma amostra real de PDFs de NT antes de finalizar o pipeline da Seção 10.
- [ ] Migrar os 5 registros de `cej_site/data/documentos.json` (série `cej-cin`) para `cin_site/data/notas-tecnicas.json`.
- [ ] Implementar `scripts/importar-notas-tecnicas.js`, `lib/carregar-notas-tecnicas.js`, template de página individual, e o passo `pagefind` no build.
- [ ] Validar a CSP real (`vercel.json`) contra o WASM do Pagefind antes do lançamento.
- [ ] Decidir com Rodrigo se as 5 entradas migradas são removidas ou mantidas como histórico no `cej_site` (Seção 15).

(Checklist original da Seção 20/19 anterior — decisão de domínio, assets, contatos — continua valendo, não repetido aqui.)
