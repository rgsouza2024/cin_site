// Busca em texto integral das Notas Técnicas via API headless do Pagefind
// (não o widget de UI padrão — a caixa de busca segue o sistema de design
// do site). Requer /pagefind/pagefind.js, gerado pelo passo `pagefind` do
// build (npm run build), ausente em npm run start sem build prévio.

async function initBuscaNts() {
    const input = document.getElementById('buscaNts');
    if (!input) return;

    const resultadosEl = document.getElementById('resultadosBusca');
    const listaEl = document.getElementById('listaCompletaNts');
    const contagemEl = document.getElementById('buscaContagem');

    let pagefind;
    try {
        pagefind = await import('/pagefind/pagefind.js');
        await pagefind.init();
    } catch (erro) {
        console.warn('Busca em texto integral indisponível (rode "npm run build" para gerar o índice):', erro);
        return;
    }

    function mostrarLista() {
        resultadosEl.hidden = true;
        listaEl.hidden = false;
        if (contagemEl) contagemEl.textContent = '';
    }

    async function buscar(termo) {
        if (!termo) {
            mostrarLista();
            return;
        }
        const busca = await pagefind.search(termo);
        const resultados = await Promise.all(busca.results.slice(0, 30).map((r) => r.data()));

        listaEl.hidden = true;
        resultadosEl.hidden = false;
        if (contagemEl) {
            contagemEl.textContent = resultados.length
                ? `${busca.results.length} resultado(s) para "${termo}"`
                : `Nenhum resultado para "${termo}"`;
        }

        resultadosEl.innerHTML = resultados
            .map(
                (r) => `
                <article class="documento-card">
                    <a href="${r.url}" style="text-decoration:none; color:inherit;">
                        <div class="documento-corpo">
                            <span class="documento-capa documento-capa-fallback">${'<svg class="svg-icon" aria-hidden="true"><use href="#icone-file-pdf"></use></svg>'}</span>
                            <div class="documento-info">
                                <h3 class="documento-titulo">${r.meta.title || r.url}</h3>
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
        clearTimeout(temporizador);
        temporizador = setTimeout(() => buscar(input.value.trim()), 250);
    });
}

document.addEventListener('DOMContentLoaded', initBuscaNts);
