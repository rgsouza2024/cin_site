// ============================================
// CEJ - Menu Mobile Handler
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (mobileMenuToggle && navLinks) {
        function fecharMenu() {
            navLinks.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
        }

        // Toggle menu on button click
        mobileMenuToggle.addEventListener('click', function() {
            const aberto = navLinks.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active', aberto);
            mobileMenuToggle.setAttribute('aria-expanded', String(aberto));
        });

        // Close menu when a link is clicked
        const links = navLinks.querySelectorAll('.nav-link');
        links.forEach(link => {
            link.addEventListener('click', fecharMenu);
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideNav = navLinks.contains(event.target);
            const isClickOnToggle = mobileMenuToggle.contains(event.target);

            if (!isClickInsideNav && !isClickOnToggle && navLinks.classList.contains('active')) {
                fecharMenu();
            }
        });
    }
});
