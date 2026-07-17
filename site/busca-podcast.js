// Busca nos episódios do podcast — filtra os cards já renderizados na página
// (título, resumo, Nota Técnica relacionada). Sem Pagefind: não há texto de
// áudio indexado, e o conjunto é pequeno o bastante (poucas dezenas de
// episódios, no máximo) para um filtro client-side simples e instantâneo.

function normalizar(texto) {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

function initBuscaPodcast() {
    const input = document.getElementById("buscaPodcast");
    if (!input) return;

    const wrapEl = document.getElementById("buscaPodcastWrap");
    const limparBtn = document.getElementById("buscaPodcastLimpar");
    const listaEl = document.getElementById("listaPodcast");
    const contagemEl = document.getElementById("buscaPodcastContagem");
    const cards = Array.from(listaEl.querySelectorAll(".documento-card")).map((card) => ({
        el: card,
        texto: normalizar(card.textContent),
    }));

    function atualizarBotaoLimpar() {
        limparBtn.hidden = input.value.length === 0;
    }

    function filtrar() {
        const termo = normalizar(input.value.trim());

        if (!termo) {
            cards.forEach(({ el }) => { el.hidden = false; });
            if (contagemEl) contagemEl.textContent = "";
            return;
        }

        let visiveis = 0;
        cards.forEach(({ el, texto }) => {
            const corresponde = texto.includes(termo);
            el.hidden = !corresponde;
            if (corresponde) visiveis++;
        });

        if (contagemEl) {
            contagemEl.textContent = visiveis
                ? `${visiveis} episódio(s) para "${input.value.trim()}"`
                : `Nenhum episódio para "${input.value.trim()}"`;
        }
    }

    let temporizador;
    input.addEventListener("input", () => {
        atualizarBotaoLimpar();
        clearTimeout(temporizador);
        temporizador = setTimeout(filtrar, 150);
    });

    limparBtn.addEventListener("click", () => {
        input.value = "";
        atualizarBotaoLimpar();
        filtrar();
        input.focus();
    });

    // Restauração via bfcache (ver busca-nts.js) — mesma resincronização.
    window.addEventListener("pageshow", (evento) => {
        if (!evento.persisted) return;
        atualizarBotaoLimpar();
        filtrar();
    });
}

document.addEventListener("DOMContentLoaded", initBuscaPodcast);
