# Centro Nacional de Inteligência da Justiça Federal (CIn) — Portal Institucional

Este repositório contém o código-fonte, pipeline de dados e documentação arquitetural do portal público do **Centro Nacional de Inteligência da Justiça Federal (CIn)**, vinculado ao Centro de Estudos Judiciários do Conselho da Justiça Federal (CEJ/CJF).

O projeto é um *spin-off* técnico da arquitetura do `cej_site`, projetado sob o paradigma **Jamstack estático (Zero-Backend)**, com validação estrita de contratos de dados em tempo de compilação e **mecanismo de busca em texto integral client-side sobre arquivos PDF via WebAssembly (WASM)**.

---

## Sumário

1. [Visão Geral & Princípios de Arquitetura](#1-visão-geral--princípios-de-arquitetura)
2. [Stack Tecnológica & Dependências](#2-stack-tecnológica--dependências)
3. [Estrutura de Diretórios](#3-estrutura-de-diretórios)
4. [Modelagem de Dados & Contratos JSON Schema](#4-modelagem-de-dados--contratos-json-schema)
5. [Pipeline de Ingestão e Processamento de Notas Técnicas](#5-pipeline-de-ingestão-e-processamento-de-notas-técnicas)
6. [Mecanismo de Busca em Texto Integral (Pagefind)](#6-mecanismo-de-busca-em-texto-integral-pagefind)
7. [Sistema de Design, Estilização e Assets](#7-sistema-de-design-estilização-e-assets)
8. [Roteiro Passo a Passo de Recriação do Projeto](#8-roteiro-passo-a-passo-de-recriação-do-projeto)
9. [Guia de Operação e Comandos](#9-guia-de-operação-e-comandos)
10. [Segurança, CSP e Hospedagem](#10-segurança-csp-e-hospedagem)
11. [Diretrizes de Evolução (Estágio 2)](#11-diretrizes-de-evolução-estágio-2)

---

## 1. Visão Geral & Princípios de Arquitetura

O portal foi concebido para atender a um requisito central: **ser o repositório público com custódia própria e indexação em texto integral de todas as Notas Técnicas emitidas pelo CIn desde 2017**.

### Decisões Arquiteturais Fundamentais:
- **100% Estático (SSG):** Todo o HTML, CSS, JavaScript e índices de busca são pré-compilados em tempo de build. Não há servidor de aplicação em execução, mitigando completamente classes de vulnerabilidades como SQL Injection, Server-Side Template Injection, CSRF e sequestro de sessão.
- **Validação Estrita de Dados (Build-time Contract Enforcement):** Nenhum dado malformatado chega à produção. Antes da renderização dos templates, os arquivos JSON são validados via JSON Schema com o motor Ajv.
- **Custódia Local dos Documentos:** Os arquivos PDF ficam armazenados no próprio repositório (`site/assets/notas-tecnicas/`), eliminando dependência de links externos propensos a *link rot*.
- **Busca Headless Descentralizada:** Utilização do Pagefind compilado em WebAssembly, consumido diretamente via JavaScript nativo, eliminando a necessidade de serviços externos gerenciados (como Algolia ou Elasticsearch) para um acervo na escala de centenas de documentos.

---

## 2. Stack Tecnológica & Dependências

### Core Runtime & Build Tools
- **Runtime:** Node.js (v20+ ou v22 LTS)
- **Gerador de Site Estático (SSG):** `@11ty/eleventy` (v3.1.6)
- **Motor de Templates:** Nunjucks (`.njk`)
- **Validador de Schemas:** `ajv` (v8.20.0)
- **Parser de Documentos PDF:** `pdf-parse` (v1.1.1)
- **Motor de Indexação e Busca:** `pagefind` (v1.5.2)
- **Processamento de Imagens:** `sharp` (v0.35.3)
- **Ícones Vetoriais:** `@fortawesome/fontawesome-free` (v7.3.0) — SVGs lidos do disco e inlinados diretamente no build HTML.

---

## 3. Estrutura de Diretórios

```text
cin_site/
├── .github/
│   └── workflows/
│       ├── ci.yml                      # Validação de dados, build do Eleventy e Pagefind
│       └── verificar-links.yml          # Execução periódica do detector de links quebrados
├── data/                               # Dados estruturados em formato JSON
│   ├── contatos.json                   # Canais de atendimento e endereço institucional
│   ├── notas-tecnicas.json             # Catálogo de metadados das Notas Técnicas
│   ├── notas-tecnicas-texto.json       # Cache de texto integral extraído dos PDFs
│   ├── podcast.json                    # Episódios do "Notas Técnicas em Podcast"
│   ├── publicacoes.json                # Catálogo de publicações e manuais
│   ├── site.json                       # Metadados globais (nome, descrição, URLs canônicas)
│   └── schemas/                        # Definições formais em JSON Schema
│       ├── documento.schema.json       # Contrato de Notas Técnicas
│       ├── episodio-podcast.schema.json# Contrato de episódios
│       └── publicacao.schema.json      # Contrato de livros/manuais
├── lib/                                # Módulos Node.js de validação e injeção de dados
│   ├── carregar-notas-tecnicas.js      # Valida catálogo, junta com cache de texto e ordena
│   ├── carregar-podcast.js             # Valida episódios do podcast
│   └── carregar-publicacoes.js         # Valida publicações
├── scripts/                            # Utilitários de automação e manutenção
│   ├── importar-notas-tecnicas.js      # Parser incremental de PDFs -> JSON/Cache
│   └── verificar-links.js              # Varredura de links externos com detecção de HTTP 4xx/5xx
├── site/                               # Código-fonte das páginas e assets
│   ├── _includes/
│   │   └── layouts/
│   │       └── base.njk                # Layout HTML mestre (Head, Header, Nav, Footer, Modais)
│   ├── assets/                         # Mídias estáticas
│   │   ├── notas-tecnicas/*.pdf        # Acervo de PDFs das Notas Técnicas
│   │   ├── publicacoes/*.pdf           # PDFs de manuais e livros
│   │   └── *.webp                      # Imagens institucionais otimizadas
│   ├── css/
│   │   ├── fonts.css                   # Declarações @font-face para fontes locais
│   │   └── style.css                   # Folha de estilos unificada (Vanilla CSS)
│   ├── fonts/                          # Arquivos WOFF2 locais (Montserrat e Inter)
│   ├── notas-tecnicas/
│   │   └── nota-tecnica.njk            # Template de página individual por NT (Eleventy Pagination)
│   ├── *.njk                           # Páginas do portal (index, sobre, estrutura, rede, etc.)
│   └── *.js                            # Scripts de comportamento client-side (busca, filtros)
├── eleventy.config.js                  # Configuração de build, filtros, shortcodes e passthroughs
├── package.json                        # Definição de dependências e scripts npm
├── CIN_PLANEJAMENTO.md                 # Documentação técnica e arquitetural da fase estática
└── CIN_PLATAFORMA.md                   # Planejamento estratégico do Estágio 2 (sistema autenticado)
```

---

## 4. Modelagem de Dados & Contratos JSON Schema

Todos os dados institucionais residem na pasta `data/`. Nenhuma página consome JSONs diretamente sem passar pela camada de validação em `lib/`.

### Exemplo de Contrato: `data/schemas/documento.schema.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Documento",
  "type": "object",
  "required": ["id", "serie", "titulo", "descricao", "ano", "url"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
    "serie": { "type": "string" },
    "titulo": { "type": "string", "minLength": 5 },
    "descricao": { "type": "string" },
    "autor": { "type": ["string", "null"] },
    "ano": { "type": "integer", "minimum": 2000, "maximum": 2100 },
    "url": { "type": "string" },
    "capa": { "type": ["string", "null"] }
  }
}
```

### Validação em Build (`lib/carregar-notas-tecnicas.js`)
O script compila o schema com o `Ajv`, processa `data/notas-tecnicas.json`, mescla com o cache de texto bruto de `data/notas-tecnicas-texto.json`, calcula um índice numérico ordenável e exporta o array pronto para os templates do Eleventy. Qualquer violação de tipo ou ausência de campo obrigatório interrompe imediatamente o build com mensagem de erro detalhada.

---

## 5. Pipeline de Ingestão e Processamento de Notas Técnicas

Para permitir busca em texto integral sem processamento em tempo real nos clientes, o repositório adota um pipeline incremental:

```
[ PDF inserido em site/assets/notas-tecnicas/*.pdf ]
                         │
                         ▼
[ scripts/importar-notas-tecnicas.js ]
   ├── 1. Calcula hash SHA-256 do arquivo.
   ├── 2. Se hash inalterado -> reaproveita texto do cache.
   ├── 3. Se hash novo/modificado -> executa `pdf-parse(buffer)`.
   ├── 4. Aplica expressões regulares para extrair Assunto (ementa) e Relatores.
   ├── 5. Grava metadados em `data/notas-tecnicas.json`.
   └── 6. Atualiza cache de texto completo em `data/notas-tecnicas-texto.json`.
                         │
                         ▼
[ Eleventy Build: site/notas-tecnicas/nota-tecnica.njk ]
   └── Gera 1 página HTML estática para cada NT com o texto completo em `<main data-pagefind-body>`.
                         │
                         ▼
[ Pagefind CLI pós-build: `pagefind --site _site` ]
   └── Indexa o HTML renderizado e gera o índice binário WASM em `_site/pagefind/`.
```

---

## 6. Mecanismo de Busca em Texto Integral (Pagefind)

A interface de busca em [site/busca-nts.js](site/busca-nts.js) consome a API Headless do Pagefind. Isso significa que **não é utilizado o widget de UI padrão do Pagefind**, mantendo a interface 100% aderente ao design system do projeto.

### Recursos Implementados no Frontend:
1. **Indexação Seletiva:** Apenas elementos dentro de containers com o atributo `data-pagefind-body` são indexados pelo Pagefind. Metadados como número e ano são extraídos via atributos `data-pagefind-meta` e `data-pagefind-filter`.
2. **Priorização por Número de NT (`priorizarPorNumero`):** Quando o usuário digita um padrão numérico (ex.: `64` ou `64/2026`), o script reordena os resultados do Pagefind para colocar a Nota Técnica com numeração exata no topo, sem descartar ocorrências do número no corpo de outros documentos.
3. **Filtro Combinado (Ano + Termo):** Permite filtrar por ano diretamente na listagem DOM (quando não há termo de busca) ou via predicado de filtro no Pagefind `{ filters: { ano } }` (quando há busca ativa).
4. **Resiliência a bfcache (`pageshow`):** Tratamento do evento `pageshow` do navegador para manter o estado do campo de busca, listagem e botão de limpar sincronizados ao navegar com os botões "Voltar/Avançar".

---

## 7. Sistema de Design, Estilização e Assets

### Filosofia de CSS
- **Vanilla CSS Modular:** Localizado em [site/css/style.css](site/css/style.css), sem dependência de pré-processadores ou frameworks (Bootstrap/Tailwind).
- **Variáveis de Design Tokens:**
  - Cor Primária: `--jf-blue: #0b2240` (Azul institucional Justiça Federal)
  - Cor Secundária: `--jf-green: #007a33` (Verde institucional)
  - Superfícies e Contrastes: `--jf-surface`, `--jf-surface-card`, `--jf-text-primary`, `--jf-border`.
- **Acessibilidade:** Padrões WCAG 2.1 AA / eMAG com foco visível, `aria-live="polite"` para anúncio de resultados em leitores de tela e classes de utilidade `.sr-only`.

### Injeção de Ícones SVG sem Overhead
Em vez de carregar a fonte inteira do FontAwesome ou fazer requisições HTTP adicionais para cada ícone, o arquivo [eleventy.config.js](eleventy.config.js) registra shortcodes Nunjucks:
- `{% icone "solid/shield-halved" %}`: Lê o SVG em tempo de build a partir de `node_modules/@fortawesome/fontawesome-free/svgs/` e injeta a tag `<svg>` inline com as classes CSS apropriadas.
- `{% simboloIcone ... %}` e `{% usarIcone ... %}`: Cria sprites SVG reaproveitáveis via `<symbol>` e `<use href="#id">` para páginas com alta densidade de repetição de ícones.

---

## 8. Roteiro Passo a Passo de Recriação do Projeto

Caso precise recriar este portal do zero ou reproduzir sua arquitetura em outro órgão da Justiça:

### Passo 1: Inicialização do Workspace e Dependências
```powershell
mkdir cin_site
cd cin_site
npm init -y
npm install --save-dev @11ty/eleventy@^3.1.6 pagefind@^1.5.2 ajv@^8.20.0 pdf-parse@^1.1.1 @fortawesome/fontawesome-free@^7.3.0 sharp@^0.35.3
```

### Passo 2: Estruturação dos Schemas e Módulos de Carga
1. Crie a pasta `data/schemas/` e defina os schemas JSON (`documento.schema.json`, `publicacao.schema.json`, etc.).
2. Crie a pasta `lib/` com os arquivos `carregar-notas-tecnicas.js`, `carregar-publicacoes.js` e `carregar-podcast.js` compilando os schemas com o Ajv.

### Passo 3: Configuração do Eleventy (`eleventy.config.js`)
1. Configure os diretórios de entrada (`site`), inclusões (`site/_includes`) e saída (`_site`).
2. Registre os dados globais (`addGlobalData`) chamando as funções em `lib/`.
3. Adicione os filtros essenciais (`dataBr`, `anosUnicos`, `normalizarBusca`, `jsonld`, `paragrafos`).
4. Implemente os shortcodes de leitura e injeção de SVGs do Font Awesome.
5. Configure o `addPassthroughCopy` para CSS, fontes, scripts e assets de mídia.

### Passo 4: Pipeline de Ingestão de PDFs
1. Crie o script `scripts/importar-notas-tecnicas.js` com o fluxo de extração incremental baseado em SHA-256 e `pdf-parse`.
2. Deposite os arquivos PDF em `site/assets/notas-tecnicas/`.
3. Execute `node scripts/importar-notas-tecnicas.js` para popular `data/notas-tecnicas.json` e `data/notas-tecnicas-texto.json`.

### Passo 5: Construção dos Templates Nunjucks
1. Crie o layout mestre `site/_includes/layouts/base.njk` contendo a casca HTML, navegação acessível e rodapé institucional.
2. Crie as páginas institucionais (`index.njk`, `sobre.njk`, `estrutura.njk`, `rede.njk`, `podcast.njk`, `publicacoes.njk`).
3. Crie a página de catálogo [site/notas-tecnicas.njk](site/notas-tecnicas.njk) com a estrutura de cards e formulário de busca.
4. Crie o template paginado [site/notas-tecnicas/nota-tecnica.njk](site/notas-tecnicas/nota-tecnica.njk):
   ```jinja
   ---
   pagination:
     data: notasTecnicas
     size: 1
     alias: nt
   permalink: "/notas-tecnicas/{{ nt.id }}/"
   layout: layouts/base.njk
   ---
   <article data-pagefind-body>
     <h1 data-pagefind-meta="title">{{ nt.titulo }}</h1>
     <div class="nt-corpo">
       {{ nt.texto | paragrafos }}
     </div>
   </article>
   ```

### Passo 6: Integração da Busca Client-Side
1. Crie `site/busca-nts.js` consumindo dynamic import de `/pagefind/pagefind.js`.
2. Adicione scripts npm no `package.json`:
   ```json
   "scripts": {
     "build": "eleventy && pagefind --site _site",
     "start": "eleventy --serve",
     "validar": "node lib/carregar-notas-tecnicas.js && node lib/carregar-publicacoes.js && node lib/carregar-podcast.js"
   }
   ```

---

## 9. Guia de Operação e Comandos

### Instalação de Dependências
```powershell
npm install
```

### Desenvolvimento Local (Live Reload)
```powershell
npm run start
```
*Disponível em `http://localhost:8080`.*

### Build de Produção com Indexação do Pagefind
```powershell
npm run build
```
*Compila templates em `_site/` e executa o Pagefind para gerar `_site/pagefind/`.*

### Validação de Contratos de Dados
```powershell
npm run validar
```
*Verifica se todos os registros JSON obedecem rigorosamente aos schemas.*

### Ingestão de Novas Notas Técnicas
Sempre que uma nova Nota Técnica for disponibilizada:
1. Copie o arquivo PDF para `site/assets/notas-tecnicas/` (padrão de nomenclatura: `nt-AAAA-NN.pdf`).
2. Execute o importador:
   ```powershell
   npm run importar-notas-tecnicas
   ```
3. Valide o catálogo gerado em `data/notas-tecnicas.json` e revise eventuais alertas de extração.
4. Execute `npm run build` para regerar as páginas estáticas e atualizar os índices do Pagefind.

### Verificação de Links Quebrados
```powershell
npm run verificar-links
```
*Testa a integridade de todos os links externos do catálogo.*

---

## 10. Segurança, CSP e Hospedagem

Por ser um site 100% estático, o portal pode ser hospedado em qualquer CDN ou servidor web estático (Vercel, Cloudflare Pages, GitHub Pages, Nginx, Apache ou IIS do tribunal).

### Content Security Policy (CSP) Recomendada
Como o Pagefind utiliza WebAssembly para descompactar e pesquisar os fragmentos do índice no cliente, configure os headers HTTP do servidor considerando:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self';
```

> [!IMPORTANT]
> A diretiva `'wasm-unsafe-eval'` (ou suporte nativo a WASM da origem `'self'`) em `script-src` é indispensável para que o motor de busca em texto integral funcione sem bloqueios de segurança no navegador.

---

## 11. Diretrizes de Evolução (Estágio 2)

Conforme formalizado em [CIN_PLATAFORMA.md](CIN_PLATAFORMA.md), futuras funcionalidades transacionais (como submissão de propostas de temas, workflow de aprovação interna de Notas Técnicas entre Grupo Operacional e Decisório, e controle de acesso baseado em papéis — RBAC):

- **NÃO devem ser desenvolvidas dentro deste repositório.**
- Devem constituir uma aplicação backend apartada, hospedada em infraestrutura própria da Justiça Federal, integrada obrigatoriamente a **SSO/OIDC Institucional (CJF / PDPJ / gov.br)**.
- O portal estático (`cin_site`) permanecerá como a vitrine pública de visualização e consulta desse acervo final aprovado.
