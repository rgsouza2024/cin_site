const fs = require("fs");
const path = require("path");

module.exports = function (eleventyConfig) {
    // Dados de domínio vivem em /data na raiz — mesmo padrão do cej_site.
    // Carregador dedicado às Notas Técnicas (federado ou local) entra aqui
    // quando a origem dos dados for decidida — ver CIN_PLANEJAMENTO.md, Seção 2.
    const dataDir = path.join(__dirname, "data");
    for (const file of fs.readdirSync(dataDir)) {
        if (file.endsWith(".json")) {
            const name = path.basename(file, ".json");
            eleventyConfig.addGlobalData(name, () =>
                JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"))
            );
        }
    }

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

    // Assets copiados como estão. Logo, favicon e imagens próprias do CIn
    // entram aqui quando os arquivos existirem (CIN_PLANEJAMENTO.md, Seção 6).
    eleventyConfig.addPassthroughCopy({
        "site/css": "css",
        "site/fonts": "fonts",
        "site/assets": "assets",
        "site/script.js": "script.js",
        "site/menu.js": "menu.js",
        "site/acervo.js": "acervo.js"
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
