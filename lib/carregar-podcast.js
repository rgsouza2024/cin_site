// Carrega data/podcast.json e valida contra o contrato
// data/schemas/episodio-podcast.schema.json. Catálogo de episódios — sem
// custódia própria de áudio, cada episódio aponta para Spotify/YouTube.

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");

const raiz = path.join(__dirname, "..");
const schema = JSON.parse(
    fs.readFileSync(path.join(raiz, "data/schemas/episodio-podcast.schema.json"), "utf-8")
);

const ajv = new Ajv({ allErrors: true, strict: false });
const validar = ajv.compile(schema);

function carregarPodcast() {
    const catalogoPath = path.join(raiz, "data/podcast.json");
    if (!fs.existsSync(catalogoPath)) return [];

    const catalogo = JSON.parse(fs.readFileSync(catalogoPath, "utf-8"));

    for (const ep of catalogo) {
        if (!validar(ep)) {
            const erros = validar.errors
                .map((e) => `${e.instancePath || "(raiz)"} ${e.message}`)
                .join("; ");
            throw new Error(`Episódio de podcast inválido (${ep.id}): ${erros}`);
        }
    }

    // Ordena pelo id da Nota Técnica relacionada (ano/número), não pela
    // data do episódio — nem todo episódio já teve a data confirmada
    // (ver descrição do contrato).
    const chave = (ep) => {
        const m = (ep.notaRelacionada || ep.id).match(/nt-(\d{4})-(\d+)/);
        return m ? parseInt(m[1], 10) * 1000 + parseInt(m[2], 10) : 0;
    };
    return [...catalogo].sort((a, b) => chave(b) - chave(a));
}

module.exports = carregarPodcast;

if (require.main === module) {
    try {
        const episodios = carregarPodcast();
        console.log(`OK: ${episodios.length} episódios de podcast válidos.`);
    } catch (erro) {
        console.error(`ERRO: ${erro.message}`);
        process.exit(1);
    }
}
