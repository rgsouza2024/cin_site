// Busca em texto integral das Notas Técnicas via API headless do Pagefind
// (não o widget de UI padrão — a caixa de busca segue o sistema de design
// do site). Requer /pagefind/pagefind.js, gerado pelo passo `pagefind` do
// build (npm run build), ausente em npm run start sem build prévio.

async function initBuscaNts() {
    const input = document.getElementById('buscaNts');
    if (!input) return;

    const wrapEl = document.getElementById('buscaNtsWrap');
    const limparBtn = document.getElementById('buscaNtsLimpar');
    const anoSelect = document.getElementById('anoSelect');
    const resultadosEl = document.getElementById('resultadosBusca');
    const listaEl = document.getElementById('listaCompletaNts');
    const contagemEl = document.getElementById('buscaContagem');
    const cards = Array.from(listaEl.querySelectorAll('.documento-card'));

    let pagefind;
    try {
        pagefind = await import('/pagefind/pagefind.js');
        await pagefind.init();
    } catch (erro) {
        console.warn('Busca em texto integral indisponível (rode "npm run build" para gerar o índice):', erro);
        return;
    }

    // Sem termo de busca: filtra a listagem completa por ano no próprio DOM
    // (não precisa do Pagefind — mais rápido e funciona sem o índice).
    function filtrarListagem() {
        resultadosEl.hidden = true;
        listaEl.hidden = false;

        const ano = anoSelect.value;
        let visiveis = 0;
        cards.forEach((card) => {
            const corresponde = !ano || card.dataset.ano === ano;
            card.hidden = !corresponde;
            if (corresponde) visiveis++;
        });

        if (contagemEl) {
            contagemEl.textContent = ano ? `${visiveis} Nota(s) Técnica(s) de ${ano}` : '';
        }
    }

    function atualizarBotaoLimpar() {
        limparBtn.hidden = input.value.length === 0;
    }

    // Extrai numero/ano do título "Nota Técnica CIn n. 64/2026" para comparar
    // com uma busca no formato numérico (ver priorizarPorNumero).
    function numeroENoDoTitulo(titulo) {
        const m = (titulo || "").match(/n\.\s*(\d{1,3})\/(\d{4})/i);
        return m ? { numero: parseInt(m[1], 10), ano: m[2] } : null;
    }

    // Busca por número (ex.: "64" ou "64/2026") é ambígua em texto integral —
    // "64" aparece tanto no número da NT quanto em qualquer artigo de lei
    // citado no corpo. Quando o termo bate nesse padrão, a NT cujo número
    // corresponde exatamente sobe para o topo, sem descartar os demais
    // resultados nem mudar a busca em si (só reordena o que o Pagefind já
    // retornou).
    function priorizarPorNumero(resultados, termo) {
        const m = termo.match(/^(\d{1,3})(?:\/(\d{4}))?$/);
        if (!m) return resultados;
        const numeroBuscado = parseInt(m[1], 10);
        const anoBuscado = m[2];

        const prioridade = (r) => {
            const info = numeroENoDoTitulo(r.meta.title);
            const bate = info && info.numero === numeroBuscado && (!anoBuscado || info.ano === anoBuscado);
            return bate ? 0 : 1;
        };
        return [...resultados].sort((a, b) => prioridade(a) - prioridade(b));
    }

    async function buscar(termo) {
        const ano = anoSelect.value;

        if (!termo) {
            filtrarListagem();
            wrapEl.classList.remove('buscando');
            return;
        }

        const busca = await pagefind.search(termo, {
            filters: ano ? { ano } : undefined,
        });
        let resultados = await Promise.all(busca.results.slice(0, 30).map((r) => r.data()));
        resultados = priorizarPorNumero(resultados, termo);

        // Só troca a tela se o termo/ano ainda forem os que estão nos campos —
        // evita uma resposta lenta e antiga sobrescrever uma busca mais recente.
        if (input.value.trim() !== termo || anoSelect.value !== ano) return;

        wrapEl.classList.remove('buscando');
        listaEl.hidden = true;
        resultadosEl.hidden = false;
        if (contagemEl) {
            const sufixoAno = ano ? ` em ${ano}` : '';
            contagemEl.textContent = resultados.length
                ? `${busca.results.length} resultado(s) para "${termo}"${sufixoAno}`
                : `Nenhum resultado para "${termo}"${sufixoAno}`;
        }

        resultadosEl.innerHTML = resultados
            .map(
                (r) => `
                <article class="documento-card">
                    <a href="${r.url}" style="text-decoration:none; color:inherit;">
                        <div class="documento-corpo">
                            <span class="documento-capa documento-capa-fallback">${'<svg class="svg-icon" aria-hidden="true"><use href="#icone-file-pdf"></use></svg>'}</span>
                            <div class="documento-info">
                                <h2 class="documento-titulo">${r.meta.title || r.url}</h2>
                                <p class="documento-descricao">${r.excerpt}</p>
                            </div>
                        </div>
                    </a>
                </article>`
            )
            .join('');
    }

    let temporizador;
    input.addEventListener('input', () => {
        atualizarBotaoLimpar();
        clearTimeout(temporizador);
        const termo = input.value.trim();
        if (termo) wrapEl.classList.add('buscando');
        temporizador = setTimeout(() => buscar(termo), 250);
    });

    anoSelect.addEventListener('change', () => {
        buscar(input.value.trim());
    });

    limparBtn.addEventListener('click', () => {
        input.value = '';
        atualizarBotaoLimpar();
        wrapEl.classList.remove('buscando');
        filtrarListagem();
        input.focus();
    });

    // Estado inicial: sem busca, listagem completa (sem filtro de ano ainda)
    filtrarListagem();

    // Restauração via bfcache (ex.: botão "voltar" após abrir uma NT): a página
    // volta de uma foto congelada sem disparar DOMContentLoaded, então o painel
    // de resultados e o botão de limpar ficam como estavam antes de sair,
    // enquanto o navegador some com o valor exibido no campo de busca — os dois
    // saem dessincronizados do estado real do input. Resincroniza aqui.
    window.addEventListener('pageshow', (evento) => {
        if (!evento.persisted) return;
        atualizarBotaoLimpar();
        const termo = input.value.trim();
        if (termo) buscar(termo);
        else {
            wrapEl.classList.remove('buscando');
            filtrarListagem();
        }
    });
}

document.addEventListener('DOMContentLoaded', initBuscaNts);
