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

    return [...catalogo].sort((a, b) => b.data.localeCompare(a.data));
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
