/* Navigation and reveal-on-scroll behavior. */

const btn = document.getElementById('mobile-menu-btn');
const menu = document.getElementById('mobile-menu');
btn.addEventListener('click', () => {
    const willOpen = menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', String(willOpen));
    btn.setAttribute('aria-label', willOpen ? 'Navigation schließen' : 'Navigation öffnen');
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Navigation öffnen');
        const href = this.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (!target) return;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
});

const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, activeObserver) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                activeObserver.unobserve(entry.target);
            }
        });
    }, observerOptions)
    : null;

function observeElements() {
    document.querySelectorAll('.fade-up:not(.visible)').forEach(element => {
        if (observer) observer.observe(element);
        else element.classList.add('visible');
    });
}
