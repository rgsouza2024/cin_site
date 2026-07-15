// ============================================
// CEJ - Acervo de Publicações
// Busca, filtro por série e ordenação client-side sobre os
// cards renderizados pelo Eleventy a partir de data/documentos.json.
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const grid = document.getElementById('acervoGrid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.documento-card'));
    const buscaInput = document.getElementById('buscaInput');
    const serieSelect = document.getElementById('serieSelect');
    const ordenarSelect = document.getElementById('ordenarSelect');
    const contagem = document.getElementById('acervoContagem');
    const vazio = document.getElementById('acervoVazio');
    const btnLimpar = document.getElementById('limparFiltros');
    const total = cards.length;

    // Capa indisponível no portal do CJF: troca pela moldura com ícone local
    const modeloFallback = document.getElementById('capaFallback');
    if (modeloFallback) {
        grid.querySelectorAll('img.documento-capa').forEach(img => {
            img.addEventListener('error', function() {
                this.replaceWith(modeloFallback.content.cloneNode(true));
            });
        });
    }

    // Espelha o filtro normalizarBusca do build: minúsculas e sem acentos
    function normalizar(texto) {
        return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function aplicar() {
        const termo = normalizar(buscaInput.value.trim());
        const serie = serieSelect.value;
        let visiveis = 0;

        cards.forEach(card => {
            const corresponde =
                (!serie || card.dataset.serie === serie) &&
                (!termo || card.dataset.busca.includes(termo));
            card.hidden = !corresponde;
            if (corresponde) visiveis++;
        });

        vazio.hidden = visiveis > 0;
        if (termo || serie) {
            contagem.textContent = visiveis === 1
                ? '1 documento encontrado'
                : `${visiveis} documentos encontrados`;
        } else {
            contagem.textContent = `${total} documentos no acervo`;
        }

        if (btnLimpar) btnLimpar.hidden = !(termo || serie);
        atualizarURL();
    }

    // URL compartilhável: /publicacoes/?q=...&serie=...&ordem=...
    function atualizarURL() {
        const params = new URLSearchParams();
        if (buscaInput.value.trim()) params.set('q', buscaInput.value.trim());
        if (serieSelect.value) params.set('serie', serieSelect.value);
        if (ordenarSelect.value !== 'recentes') params.set('ordem', ordenarSelect.value);
        const query = params.toString();
        history.replaceState(null, '', query ? `?${query}` : location.pathname);
    }

    function reordenar() {
        const modo = ordenarSelect.value;
        const ordenados = [...cards].sort((a, b) => {
            if (modo === 'titulo') {
                return a.dataset.titulo.localeCompare(b.dataset.titulo, 'pt-BR');
            }
            const anoA = Number(a.dataset.ano);
            const anoB = Number(b.dataset.ano);
            // Documentos sem ano vão sempre ao final
            if (!anoA && !anoB) return a.dataset.titulo.localeCompare(b.dataset.titulo, 'pt-BR');
            if (!anoA) return 1;
            if (!anoB) return -1;
            return modo === 'antigos' ? anoA - anoB : anoB - anoA;
        });
        ordenados.forEach(card => grid.appendChild(card));
        atualizarURL();
    }

    // Estado inicial vindo da URL (links dos cards da home, buscas compartilhadas)
    const iniciais = new URLSearchParams(location.search);
    if (iniciais.get('q')) buscaInput.value = iniciais.get('q');
    if (iniciais.get('serie')) serieSelect.value = iniciais.get('serie');
    if (iniciais.get('ordem')) {
        ordenarSelect.value = iniciais.get('ordem');
        if (ordenarSelect.value) reordenar();
    }

    let debounce;
    buscaInput.addEventListener('input', function() {
        clearTimeout(debounce);
        debounce = setTimeout(aplicar, 150);
    });
    serieSelect.addEventListener('change', aplicar);
    ordenarSelect.addEventListener('change', reordenar);

    if (btnLimpar) {
        btnLimpar.addEventListener('click', function() {
            buscaInput.value = '';
            serieSelect.value = '';
            aplicar();
        });
    }

    aplicar();
});
