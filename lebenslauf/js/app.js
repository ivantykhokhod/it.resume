/* Global keyboard behavior and application startup. */

document.addEventListener('keydown', (e) => {
    const globalOverlay = document.getElementById('global-modal');
    const globalModalOpen = globalOverlay && !globalOverlay.classList.contains('hidden');

    if (e.key === 'Escape') {
        const principleOverlay = document.getElementById('about-principle-focus-overlay');
        if (principleOverlay && !principleOverlay.classList.contains('hidden')) {
            closeAboutItemFocus();
            return;
        }

        if (globalModalOpen) {
            closeModal();
        }
        return;
    }

    if (globalModalOpen && document.getElementById('gallery-zoom-img') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        navigateGallery({ stopPropagation() {} }, e.key === 'ArrowLeft' ? -1 : 1);
        return;
    }

    if (globalModalOpen && e.key === 'Tab') {
        const container = document.getElementById('modal-container');
        const focusable = [...container.querySelectorAll('button:not([disabled]), a[href]:not([aria-disabled="true"]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
            .filter(element => element.offsetParent !== null);
        if (focusable.length === 0) {
            e.preventDefault();
            container.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});

document.getElementById('global-modal').addEventListener('click', (e) => {
    if(e.target.id === 'global-modal') closeModal();
});

// Запуск CMS
loadData();
