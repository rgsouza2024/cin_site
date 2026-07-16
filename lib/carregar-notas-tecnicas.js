// Carrega data/notas-tecnicas.json, valida contra o contrato
// data/schemas/documento.schema.json e injeta o texto completo (extraído por
// scripts/importar-notas-tecnicas.js) de data/notas-tecnicas-texto.json —
// necessário para as páginas individuais que o Pagefind indexa.

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");

const raiz = path.join(__dirname, "..");
const schema = JSON.parse(
    fs.readFileSync(path.join(raiz, "data/schemas/documento.schema.json"), "utf-8")
);

const ajv = new Ajv({ allErrors: true, strict: false });
const validar = ajv.compile(schema);

function carregarNotasTecnicas() {
    const catalogoPath = path.join(raiz, "data/notas-tecnicas.json");
    const textoPath = path.join(raiz, "data/notas-tecnicas-texto.json");

    if (!fs.existsSync(catalogoPath)) return [];

    const catalogo = JSON.parse(fs.readFileSync(catalogoPath, "utf-8"));
    const textos = fs.existsSync(textoPath)
        ? JSON.parse(fs.readFileSync(textoPath, "utf-8"))
        : {};

    const documentos = catalogo.map((doc) => {
        if (!validar(doc)) {
            const erros = validar.errors
                .map((e) => `${e.instancePath || "(raiz)"} ${e.message}`)
                .join("; ");
            throw new Error(`Nota Técnica inválida (${doc.id}): ${erros}`);
        }
        const numeroOrdenavel = parseInt(doc.id.match(/nt-\d{4}-(\d+)/)?.[1] ?? "0", 10);
        return {
            ...doc,
            texto: textos[doc.id]?.texto || "",
            numeroOrdenavel,
        };
    });

    // Mais recentes primeiro: ano desc, depois número desc dentro do ano
    return documentos.sort((a, b) => b.ano - a.ano || b.numeroOrdenavel - a.numeroOrdenavel);
}

module.exports = carregarNotasTecnicas;

if (require.main === module) {
    try {
        const documentos = carregarNotasTecnicas();
        console.log(`OK: ${documentos.length} Notas Técnicas válidas.`);
    } catch (erro) {
        console.error(`ERRO: ${erro.message}`);
        process.exit(1);
    }
}
