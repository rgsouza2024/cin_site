// ============================================
// CIn - Centro Nacional de Inteligência da Justiça Federal
// Main Script - Animations & Interactions
// (copiado de cej_site/site/script.js; bloco de filtros de
// calendário removido — sem página /eventos/ nesta fase)
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations
    initScrollAnimations();
    initSmoothScroll();
    initParallaxScroll();
    initScrollSpy();
});

// ============================================
// PARALLAX SCROLL (efeito de movimento suave)
// ============================================

function initParallaxScroll() {
    // Respeita preferência de acessibilidade
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;

    function applyParallax() {
        const scrollY = window.scrollY;

        // Hero com leve parallax no texto
        const hero = document.querySelector('.hero');
        if (hero) {
            const heroContent = hero.querySelector('.container');
            if (heroContent) {
                heroContent.style.transform = `translateY(${scrollY * 0.25}px)`;
                heroContent.style.opacity = Math.max(0, 1 - scrollY / 500);
            }
        }

        ticking = false;
    }

    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(applyParallax);
            ticking = true;
        }
    }, { passive: true });

    // Executa uma vez no carregamento
    applyParallax();
}


// ============================================
// SCROLL ANIMATIONS
// ============================================

function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

// ============================================
// SCROLLSPY (destaca na nav a seção visível)
// ============================================

function initScrollSpy() {
    const navAnchors = Array.from(
        document.querySelectorAll('.nav-link[href^="#"], .nav-link[href^="/#"]')
    );
    if (!navAnchors.length) return;

    const linkInicio = document.querySelector('.nav-link[href="/"]');
    const hashDe = (link) => {
        const href = link.getAttribute('href');
        return href.slice(href.indexOf('#'));
    };
    const alvos = navAnchors
        .map(link => document.querySelector(hashDe(link)))
        .filter(Boolean);
    if (!alvos.length) return; // páginas sem as seções da home

    function ativar(link) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        if (link) link.classList.add('active');
    }

    // A seção que cruza a faixa central da viewport vira a ativa
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const hash = '#' + entry.target.id;
                ativar(navAnchors.find(l => hashDe(l) === hash));
            }
        });
    }, { rootMargin: '-45% 0px -45% 0px' });

    alvos.forEach(secao => observer.observe(secao));

    // No topo (hero visível), "Início" é o ativo
    const hero = document.querySelector('.hero');
    if (hero && linkInicio) {
        const topoObserver = new IntersectionObserver(function(entries) {
            if (entries[0].isIntersecting) ativar(linkInicio);
        }, { rootMargin: '-30% 0px -45% 0px' });
        topoObserver.observe(hero);
    }
}

// ============================================
// SMOOTH SCROLL
// ============================================

function initSmoothScroll() {
    // Cobre âncoras da própria página (#secao) e âncoras absolutas (/#secao),
    // que funcionam a partir de qualquer página do site.
    document.querySelectorAll('a[href^="#"], a[href^="/#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Don't prevent default for empty hash
            if (href === '#') return;

            const hash = href.slice(href.indexOf('#'));
            const target = document.querySelector(hash);

            // Alvo não está nesta página: deixa o navegador navegar até ela
            if (!target) return;

            e.preventDefault();

            if (target) {
                const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                target.scrollIntoView({
                    behavior: reduceMotion ? 'auto' : 'smooth',
                    block: 'start'
                });

                // Close mobile menu if open
                const navLinks = document.getElementById('navLinks');
                if (navLinks && navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                }
            }
        });
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Debounce function for resize events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
