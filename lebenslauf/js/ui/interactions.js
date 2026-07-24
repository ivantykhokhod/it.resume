/* Slider, gallery, modal shell and admin-mode controls. */

// --- УПРАВЛЕНИЕ СЛАЙДЕРОМ ФОТО --- //
function updateSliderView() {
    const imgEl = document.getElementById('hero-img');
    if (!imgEl) return;
    const images = Array.isArray(state.data.profile.images) ? state.data.profile.images : [];
    clearTimeout(sliderFadeTimeoutId);

    if (images.length === 0) {
        imgEl.src = createPlaceholderDataUrl('Kein Foto', 600, 600);
        imgEl.style.opacity = '1';
        return;
    }

    if (currentSlide >= images.length) currentSlide = 0;
    if (currentSlide < 0) currentSlide = images.length - 1;

    const nextImage = getSafeImageUrl(images[currentSlide]) || createPlaceholderDataUrl('Foto nicht verfügbar', 600, 600);
    imgEl.style.opacity = '0.45';
    sliderFadeTimeoutId = setTimeout(() => {
        imgEl.onerror = () => {
            imgEl.onerror = null;
            imgEl.src = createPlaceholderDataUrl('Foto nicht verfügbar', 600, 600);
        };
        imgEl.src = nextImage;
        imgEl.style.opacity = '1';
    }, 150);
}

function startSlideshow() {
    clearInterval(slideIntervalId);
    const p = state.data.profile;
    if (!document.hidden && p.slideshowActive && Array.isArray(p.images) && p.images.length > 1) {
        const sec = (p.slideshowInterval || 4) * 1000;
        slideIntervalId = setInterval(() => {
            currentSlide = (currentSlide + 1) % p.images.length;
            updateSliderView();
        }, sec);
    }
}

document.addEventListener('visibilitychange', startSlideshow);


function resetSpecialModalClasses() {
    const overlay = document.getElementById('global-modal');
    if (!overlay) return;

    overlay.classList.remove('about-more-modal-open');
    overlay.classList.remove('about-main-modal-open');
    overlay.classList.remove('about-drawer-open');
    overlay.removeAttribute('aria-labelledby');
}

let modalCloseTimerId = null;
let modalReturnFocus = null;
let bodyOverflowBeforeModal = '';

function activateGlobalModal() {
    const overlay = document.getElementById('global-modal');
    const container = document.getElementById('modal-container');
    if (!overlay || !container) return;
    clearTimeout(modalCloseTimerId);
    if (overlay.classList.contains('hidden')) {
        modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        bodyOverflowBeforeModal = document.body.style.overflow;
    }
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => overlay.classList.remove('opacity-0'));
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
        const focusTarget = container.querySelector('button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
        (focusTarget || container).focus({ preventScroll: true });
    }, 20);
}

// --- ЛАЙТБОКС ГАЛЕРЕИ --- //
function openPhotoGallery() {
    if (isAdmin) return;
    const images = (Array.isArray(state.data.profile.images) ? state.data.profile.images : [])
        .map(getSafeImageUrl)
        .filter(Boolean);
    if(images.length === 0) return;
    const currentImage = images[currentSlide] || images[0];

    let galleryHtml = `
        <div class="relative w-full h-full min-h-screen flex items-center justify-center p-4 sm:p-8 lightbox-anim">
            <button type="button" onclick="closeModal(); playClickSound();" aria-label="Galerie schließen" class="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-900/80 p-3 rounded-full z-50 transition-colors">
                <i data-lucide="x" class="w-8 h-8"></i>
            </button>

            <div class="relative w-full max-w-5xl flex items-center justify-center">
                <img id="gallery-zoom-img" src="${escapeHtml(currentImage)}" alt="Vergrößertes Porträt" decoding="async" class="max-w-full max-h-[85vh] object-contain border border-zinc-800 shadow-2xl rounded-sm">

                ${images.length > 1 ? `
                    <button type="button" onclick="navigateGallery(event, -1); playClickSound();" aria-label="Vorheriges Bild" class="absolute left-0 sm:-left-12 p-3 rounded-full slide-btn z-40"><i data-lucide="chevron-left" class="w-8 h-8"></i></button>
                    <button type="button" onclick="navigateGallery(event, 1); playClickSound();" aria-label="Nächstes Bild" class="absolute right-0 sm:-right-12 p-3 rounded-full slide-btn z-40"><i data-lucide="chevron-right" class="w-8 h-8"></i></button>
                ` : ''}
            </div>
        </div>
    `;

    const overlay = document.getElementById('global-modal');
    const container = document.getElementById('modal-container');
    resetSpecialModalClasses();

    container.className = "w-full h-full outline-none";
    container.innerHTML = galleryHtml;
    activateGlobalModal();
    refreshIcons();
}

function navigateGallery(event, direction) {
    event.stopPropagation();
    const images = (Array.isArray(state.data.profile.images) ? state.data.profile.images : [])
        .map(getSafeImageUrl)
        .filter(Boolean);
    if (images.length === 0) return;
    currentSlide = (currentSlide + direction + images.length) % images.length;
    const imgEl = document.getElementById('gallery-zoom-img');
    if (!imgEl) return;
    imgEl.style.opacity = '0.5';
    setTimeout(() => {
        imgEl.src = images[currentSlide];
        imgEl.style.opacity = '1';
    }, 100);
}

// --- ЛОГИКА АДМИН-РЕЖИМА (Ctrl + Shift + R) --- //
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        toggleAdminMode();
        playClickSound(); // Звук при включении админки
    }
});

function toggleAdminMode() {
    isAdmin = !isAdmin;
    const body = document.body;
    const adminBar = document.getElementById('admin-bar');
    const mainNav = document.getElementById('main-nav');

    if (isAdmin) {
        body.classList.add('admin-mode-active');
        adminBar.classList.remove('hidden');
        mainNav.classList.add('mt-10');
    } else {
        body.classList.remove('admin-mode-active');
        adminBar.classList.add('hidden');
        mainNav.classList.remove('mt-10');
    }
    showToast(isAdmin ? 'Administrator-Modus aktiviert.' : 'Administrator-Modus beendet.', 'success');
}

function exportDataToJson() {
    const dataStr = JSON.stringify(state.data, null, 4);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('data.json wurde erfolgreich exportiert.', 'success');
}
