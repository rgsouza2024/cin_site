// Extrai texto e metadados de site/assets/notas-tecnicas/*.pdf, valida contra
// data/schemas/documento.schema.json e grava:
//   - data/notas-tecnicas.json        (catálogo)
//   - data/notas-tecnicas-texto.json  (cache do texto completo, por id)
//
// Incremental: só reprocessa um PDF se o hash do arquivo mudou desde a
// última execução (evita reextrair os ~70 documentos a cada build).
//
// Uso: node scripts/importar-notas-tecnicas.js

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pdfParse = require("pdf-parse");
const Ajv = require("ajv");

const raiz = path.join(__dirname, "..");
const dirPdfs = path.join(raiz, "site/assets/notas-tecnicas");
const catalogoPath = path.join(raiz, "data/notas-tecnicas.json");
const textoPath = path.join(raiz, "data/notas-tecnicas-texto.json");
const schema = JSON.parse(
    fs.readFileSync(path.join(raiz, "data/schemas/documento.schema.json"), "utf-8")
);

const ajv = new Ajv({ allErrors: true, strict: false });
const validar = ajv.compile(schema);

function hashArquivo(caminho) {
    return crypto.createHash("sha256").update(fs.readFileSync(caminho)).digest("hex");
}

function limparEspacos(texto) {
    return texto.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, " ").trim();
}

// O cabeçalho varia entre documentos (com/sem rótulo "Assunto:"/"Tema:", ordem
// diferente de data e nome do Centro). Estratégia: ancorar em "Nota Técnica
// n. X/AAAA" e capturar tudo até "Relator(a)(es)(as):", removendo o que for
// ruído conhecido (linha de data, repetição do nome do Centro, rótulo).
// Remove, só do INÍCIO do bloco (nunca no meio — senão corrompe frases que
// citam o nome do Centro), ruído conhecido: linha de data (cidade variável,
// não só Brasília), repetição do nome do Centro, rótulo "Assunto:"/"Tema:".
// Roda em loop porque a ordem desses elementos varia entre documentos.
function limparInicioBloco(bloco) {
    const padroes = [
        /^\s*[A-ZÀ-Ú][\wà-ú]*(?:\s+[A-ZÀ-Ú][\wà-ú]*)*,\s*\d{1,2}\s*de\s*[a-zà-ú]+\s*de\s*\d{4}\.?\s*/i,
        /^\s*Centro\s*Nacional\s*de\s*Intelig[eê]ncia\s*(da|–|-)?\s*Justi[cç]a\s*Federal\s*/i,
        /^\s*(Assunto|Tema)\s*:\s*/i,
    ];
    let mudou = true;
    while (mudou) {
        mudou = false;
        for (const p of padroes) {
            const novo = bloco.replace(p, "");
            if (novo !== bloco) {
                bloco = novo;
                mudou = true;
            }
        }
    }
    return bloco;
}

function extrairMetadados(texto) {
    const mCabecalho = texto.match(/Nota\s*T[ée]cnica\s*(n\.?\s*)?[\w-]+\s*\/\s*\d{4}/i);
    const resto = mCabecalho ? texto.slice(mCabecalho.index + mCabecalho[0].length) : texto.slice(0, 2000);

    // Ementa costuma ser curta (1-4 linhas): corta no "Relator", ou no primeiro
    // parágrafo próximo, ou num teto de segurança — nunca captura a folha inteira.
    const idxRelator = resto.search(/Relator[a-zçãáéíóú]*\s*:/i);
    const idxParagrafo = resto.search(/\n\s*\n/);
    let fim;
    if (idxRelator > -1) fim = idxRelator;
    else if (idxParagrafo > -1 && idxParagrafo < 500) fim = idxParagrafo;
    else fim = 300;

    let bloco = limparInicioBloco(resto.slice(0, fim));

    // Fallback: sem cabeçalho numerado reconhecido, ou bloco vazio depois da
    // limpeza — procura rótulo "Assunto:"/"Tema:" em qualquer lugar do início.
    if (!mCabecalho || limparEspacos(bloco).length <= 5) {
        const mRotulo = resto.match(/(Assunto|Tema)\s*:\s*([\s\S]*?)\n\s*\n/i);
        if (mRotulo) bloco = mRotulo[2];
    }

    const assunto = limparEspacos(bloco);

    const mRelator = resto.match(/Relator[a-zçãáéíóú]*\s*:\s*([\s\S]*?)\n\s*\n/i);
    const relator = mRelator ? limparEspacos(mRelator[1]) : null;

    return { assunto: assunto.length > 5 ? assunto : null, relator };
}

async function main() {
    const arquivos = fs.readdirSync(dirPdfs).filter((f) => f.endsWith(".pdf"));

    const catalogoAnterior = fs.existsSync(catalogoPath)
        ? JSON.parse(fs.readFileSync(catalogoPath, "utf-8"))
        : [];
    const textoAnterior = fs.existsSync(textoPath)
        ? JSON.parse(fs.readFileSync(textoPath, "utf-8"))
        : {};
    const catalogoPorId = new Map(catalogoAnterior.map((d) => [d.id, d]));

    const novoCatalogo = [];
    const novoTexto = {};
    let processados = 0;
    let reaproveitados = 0;
    const semAssunto = [];
    const falharam = [];

    for (const arquivo of arquivos.sort()) {
        const id = path.basename(arquivo, ".pdf");
        const caminho = path.join(dirPdfs, arquivo);

        try {
            const hash = hashArquivo(caminho);
            const cacheValido = textoAnterior[id] && textoAnterior[id].hash === hash;

            let texto, assunto, relator;
            if (cacheValido) {
                texto = textoAnterior[id].texto;
                reaproveitados++;
                const existente = catalogoPorId.get(id);
                assunto = existente ? existente.titulo : null;
                relator = existente ? existente.autor : null;
            } else {
                const buffer = fs.readFileSync(caminho);
                const resultado = await pdfParse(buffer);
                texto = resultado.text;
                const metadados = extrairMetadados(texto);
                assunto = metadados.assunto;
                relator = metadados.relator;
                processados++;
            }

            novoTexto[id] = { hash, texto };

            // id do slug: nt-<ano>-<numero>[-anexo|-adendo]
            const m = id.match(/^nt-(\d{4})-(\w+?)(?:-(anexo|adendo))?$/);
            const ano = m ? Number(m[1]) : null;
            const numero = m ? m[2] : id;
            const variante = m && m[3] ? ` (${m[3][0].toUpperCase()}${m[3].slice(1)})` : "";

            if (!assunto) semAssunto.push(id);

            const doc = {
                id,
                serie: "notas-tecnicas",
                titulo: `Nota Técnica CIn n. ${numero}/${ano}${variante}`,
                descricao: assunto || "Assunto não identificado automaticamente — revisar manualmente.",
                autor: relator,
                ano,
                url: `/assets/notas-tecnicas/${id}.pdf`,
                capa: null,
            };

            if (!validar(doc)) {
                const erros = validar.errors.map((e) => `${e.instancePath || "(raiz)"} ${e.message}`).join("; ");
                throw new Error(`Documento inválido: ${erros}`);
            }

            novoCatalogo.push(doc);
        } catch (erro) {
            falharam.push({ id, erro: erro.message });
        }
    }

    novoCatalogo.sort((a, b) => (a.ano - b.ano) || a.id.localeCompare(b.id));

    fs.writeFileSync(catalogoPath, JSON.stringify(novoCatalogo, null, 4) + "\n");
    fs.writeFileSync(textoPath, JSON.stringify(novoTexto, null, 2) + "\n");

    console.log(`OK: ${novoCatalogo.length} Notas Técnicas no catálogo.`);
    console.log(`   ${processados} extraídas agora, ${reaproveitados} reaproveitadas do cache.`);
    if (semAssunto.length) {
        console.log(`   ATENÇÃO: "Assunto:" não encontrado em ${semAssunto.length} documento(s) — revisar manualmente:`);
        semAssunto.forEach((id) => console.log(`     - ${id}`));
    }
    if (falharam.length) {
        console.log(`   FALHARAM ${falharam.length} arquivo(s) (fora do catálogo, revisar manualmente):`);
        falharam.forEach(({ id, erro }) => console.log(`     - ${id}: ${erro}`));
    }
}

main().catch((erro) => {
    console.error("ERRO:", erro.message);
    process.exit(1);
});
