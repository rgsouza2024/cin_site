// Carrega data/publicacoes.json e valida contra o contrato
// data/schemas/documento.schema.json. Catálogo de download apenas — ao
// contrário das Notas Técnicas, não há texto extraído nem busca em
// conteúdo integral (decisão registrada em CIN_PLANEJAMENTO.md).

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");

const raiz = path.join(__dirname, "..");
const schema = JSON.parse(
    fs.readFileSync(path.join(raiz, "data/schemas/documento.schema.json"), "utf-8")
);

const ajv = new Ajv({ allErrors: true, strict: false });
const validar = ajv.compile(schema);

function carregarPublicacoes() {
    const catalogoPath = path.join(raiz, "data/publicacoes.json");
    if (!fs.existsSync(catalogoPath)) return [];

    const catalogo = JSON.parse(fs.readFileSync(catalogoPath, "utf-8"));

    for (const doc of catalogo) {
        if (!validar(doc)) {
            const erros = validar.errors
                .map((e) => `${e.instancePath || "(raiz)"} ${e.message}`)
                .join("; ");
            throw new Error(`Publicação inválida (${doc.id}): ${erros}`);
        }
    }

    return [...catalogo].sort((a, b) => b.ano - a.ano);
}

module.exports = carregarPublicacoes;

if (require.main === module) {
    try {
        const publicacoes = carregarPublicacoes();
        console.log(`OK: ${publicacoes.length} Publicações válidas.`);
    } catch (erro) {
        console.error(`ERRO: ${erro.message}`);
        process.exit(1);
    }
}
