const fs = require("fs");
const path = require("path");
const carregarNotasTecnicas = require("./lib/carregar-notas-tecnicas.js");
const carregarPublicacoes = require("./lib/carregar-publicacoes.js");
const carregarPodcast = require("./lib/carregar-podcast.js");

module.exports = function (eleventyConfig) {
    // Dados de domínio vivem em /data na raiz — mesmo padrão do cej_site.
    // Exceção: notas-tecnicas.json, publicacoes.json e podcast.json passam
    // por carregadores dedicados (valida contra o contrato); notas-tecnicas-
    // texto.json é só cache interno, não precisa virar variável global.
    const dataDir = path.join(__dirname, "data");
    for (const file of fs.readdirSync(dataDir)) {
        if (
            file.endsWith(".json") &&
            file !== "notas-tecnicas.json" &&
            file !== "notas-tecnicas-texto.json" &&
            file !== "publicacoes.json" &&
            file !== "podcast.json"
        ) {
            const name = path.basename(file, ".json");
            eleventyConfig.addGlobalData(name, () =>
                JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"))
            );
        }
    }

    eleventyConfig.addGlobalData("notasTecnicas", carregarNotasTecnicas);
    eleventyConfig.addGlobalData("publicacoes", carregarPublicacoes);
    eleventyConfig.addGlobalData("podcastEpisodios", carregarPodcast);

    // Texto normalizado para busca client-side (espelha site/acervo.js)
    eleventyConfig.addFilter("normalizarBusca", (texto) =>
        (texto || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
    );

    // Serialização segura para blocos <script type="application/ld+json">
    eleventyConfig.addFilter("jsonld", (valor) =>
        JSON.stringify(valor)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/\u2028/g, "\\u2028")
            .replace(/\u2029/g, "\\u2029")
    );

    eleventyConfig.addShortcode("anoAtual", () => String(new Date().getFullYear()));

    // Texto bruto extraído do PDF (pdf-parse) em parágrafos legíveis —
    // aproximação por linhas em branco, sem reconstrução tipográfica perfeita
    // de tabelas/colunas (ver CIN_PLANEJAMENTO.md, Seção 17, riscos).
    eleventyConfig.addFilter("limite", (lista, n) => lista.slice(0, n));

    eleventyConfig.addFilter("anosUnicos", (lista) =>
        [...new Set(lista.map((item) => item.ano))].sort((a, b) => b - a)
    );

    eleventyConfig.addFilter("porId", (lista, id) => lista.find((item) => item.id === id));

    const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
        "agosto", "setembro", "outubro", "novembro", "dezembro"];
    eleventyConfig.addFilter("dataBr", (isoData) => {
        const [ano, mes, dia] = (isoData || "").split("-").map(Number);
        if (!ano || !mes || !dia) return isoData;
        return `${dia} de ${MESES[mes - 1]} de ${ano}`;
    });

    eleventyConfig.addFilter("paragrafos", (texto) =>
        (texto || "")
            .split(/\n\s*\n+/)
            .map((p) => p.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, " ").trim())
            .filter((p) => p.length > 0)
    );

    // Sprite SVG para ícones repetidos em massa
    eleventyConfig.addShortcode("simboloIcone", (nome, id) => {
        const svg = fs.readFileSync(
            path.join(__dirname, "node_modules/@fortawesome/fontawesome-free/svgs", `${nome}.svg`),
            "utf-8"
        );
        const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
        const conteudo = svg.replace(/<svg[^>]*>/, "").replace("</svg>", "");
        return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">` +
            `<symbol id="${id}" viewBox="${viewBox}">${conteudo}</symbol></svg>`;
    });

    eleventyConfig.addShortcode("usarIcone", (id, classesExtras) => {
        const classes = classesExtras ? `svg-icon ${classesExtras}` : "svg-icon";
        return `<svg class="${classes}" fill="currentColor" aria-hidden="true" focusable="false"><use href="#${id}"></use></svg>`;
    });

    // Ícone Font Awesome inlinado como SVG em build
    eleventyConfig.addShortcode("icone", (nome, classesExtras) => {
        const svgPath = path.join(
            __dirname,
            "node_modules/@fortawesome/fontawesome-free/svgs",
            `${nome}.svg`
        );
        const classes = classesExtras ? `svg-icon ${classesExtras}` : "svg-icon";
        return fs
            .readFileSync(svgPath, "utf-8")
            .replace(
                "<svg",
                `<svg class="${classes}" fill="currentColor" aria-hidden="true" focusable="false"`
            );
    });

    // Assets copiados como estão.
    eleventyConfig.addPassthroughCopy({
        "site/css": "css",
        "site/fonts": "fonts",
        "site/assets": "assets",
        "site/script.js": "script.js",
        "site/menu.js": "menu.js",
        "site/acervo.js": "acervo.js",
        "site/busca-nts.js": "busca-nts.js",
        "site/busca-podcast.js": "busca-podcast.js",
        "site/cin_logo.webp": "cin_logo.webp",
        "site/cjf_logo.png": "cjf_logo.png",
        "site/favicon.png": "favicon.png",
        "site/apple-touch-icon.png": "apple-touch-icon.png"
    });

    return {
        dir: {
            input: "site",
            includes: "_includes",
            output: "_site"
        },
        htmlTemplateEngine: "njk"
    };
};
