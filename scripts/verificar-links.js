// Verifica todos os links externos catalogados nos dados do site
// (downloads e capas do acervo, páginas de séries, CTAs de eventos,
// destinos de publicações e notícias) contra link rot no portal do CJF.
//
// Uso: npm run verificar-links
// Sai com código 1 se houver link quebrado (o workflow mensal fica vermelho).

const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, arquivo), "utf-8"));

function coletar() {
    const urls = new Map(); // url -> primeira origem

    const adicionar = (url, origem) => {
        if (url && /^https?:\/\//.test(url) && !urls.has(url)) urls.set(url, origem);
    };

    const acervo = ler("data/documentos.json");
    for (const doc of acervo.documentos) {
        adicionar(doc.url, `acervo ${doc.id}`);
        adicionar(doc.capa, `capa ${doc.id}`);
    }
    for (const serie of acervo.series) adicionar(serie.pagina, `série ${serie.slug}`);

    for (const evento of ler("data/eventos.json")) {
        if (evento.cta) adicionar(evento.cta.href, `evento ${evento.id}`);
    }
    for (const publicacao of ler("data/publicacoes.json")) {
        adicionar(publicacao.href, `publicação ${publicacao.titulo}`);
    }
    for (const noticia of ler("data/noticias.json")) {
        adicionar(noticia.url, `notícia ${noticia.id}`);
    }
    return urls;
}

async function verificarUrl(url) {
    const ua = { "User-Agent": "Mozilla/5.0 (cej-site verificador de links)" };
    const opcoes = { redirect: "follow", signal: AbortSignal.timeout(30000) };
    try {
        let resposta = await fetch(url, { method: "HEAD", headers: ua, ...opcoes });
        if (!resposta.ok) {
            // O Plone do CJF responde 500 a HEAD nas views @@download;
            // revalida com GET parcial (1 KB) sem baixar o arquivo inteiro
            resposta = await fetch(url, {
                headers: { ...ua, Range: "bytes=0-1023" },
                ...opcoes,
            });
            if (resposta.body) await resposta.body.cancel();
        }
        return resposta.ok ? null : `HTTP ${resposta.status}`;
    } catch (erro) {
        return erro.name === "TimeoutError" ? "timeout (30s)" : (erro.cause?.code || erro.message);
    }
}

async function principal() {
    const urls = coletar();
    console.log(`Verificando ${urls.size} URLs...`);

    const entradas = [...urls.entries()];
    const falhas = [];
    const CONCORRENCIA = 8;

    let indice = 0;
    async function trabalhador() {
        while (indice < entradas.length) {
            const [url, origem] = entradas[indice++];
            const problema = await verificarUrl(url);
            if (problema) falhas.push({ url, origem, problema });
        }
    }
    await Promise.all(Array.from({ length: CONCORRENCIA }, trabalhador));

    if (falhas.length === 0) {
        console.log(`OK: ${urls.size} links válidos.`);
        return;
    }
    console.error(`\n${falhas.length} link(s) quebrado(s):`);
    for (const f of falhas) console.error(`- [${f.problema}] ${f.origem}\n  ${f.url}`);
    process.exit(1);
}

principal().catch((erro) => {
    console.error(`ERRO: ${erro.message}`);
    process.exit(1);
});
