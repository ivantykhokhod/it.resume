/* CMS forms, image optimization and item editing. */

// --- МОДАЛЬНЫЕ ОКНА И ФОРМЫ (Перевод интерфейса форм) --- //
let currentImageBase64 = '';
let editingProfileImages = [];
let itemToDelete = null;


function escapeAboutMoreText(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function openAboutMoreModal() {
    state.data.about = migrateAboutData(state.data.about);
    const about = state.data.about;
    const labels = about.content || getDefaultAboutData().content;
    const defaultSections = getDefaultAboutData().moreSections;
    const sections = mergeAboutMoreSections(about.moreSections, defaultSections);
    const introShort = escapeAboutMoreText(about.introShort || '');
    const introFull = escapeAboutMoreText(about.introFull || '');

    const sectionsHtml = sections.map((section, index) => {
        const sectionId = escapeAboutMoreText(section.id || `about-more-section-${index}`);
        const icon = escapeAboutMoreText(section.icon || 'info');
        const title = escapeAboutMoreText(section.title || section.navLabel || `Abschnitt ${index + 1}`);
        const bodyHtml = section.useIntro
            ? `<p>${introShort}</p>${introFull ? `<p>${introFull}</p>` : ''}`
            : `<p>${escapeAboutMoreText(section.body || '')}</p>`;

        return `
            <section id="${sectionId}" class="about-more-modal-section">
                <div class="about-more-modal-iconbox">
                    <i data-lucide="${icon}"></i>
                </div>
                <div class="about-more-modal-text">
                    <h3>${title}</h3>
                    ${bodyHtml}
                </div>
            </section>
        `;
    }).join('');

    openAboutSideDrawer({
        direction: 'right',
        containerClass: 'about-main-drawer',
        labelledBy: 'about-drawer-title',
        drawerType: 'about',
        returnFocusSelector: '.about-v119-more',
        html: `
        <div class="about-more-modal-inner" onclick="event.stopPropagation();">
            <div class="about-more-modal-head">
                <button type="button" onclick="closeModal(); playClickSound();" class="about-more-modal-close about-drawer-back" aria-label="Zurück zur Seite">
                    <i data-lucide="arrow-left"></i>
                </button>
                <h2 id="about-drawer-title" tabindex="-1" class="about-more-modal-title">${escapeAboutMoreText(labels.drawerTitle)}</h2>
                <span class="about-drawer-kicker" aria-hidden="true">${escapeAboutMoreText(labels.drawerKicker)}</span>
            </div>
            <div class="about-more-modal-body">
                ${sectionsHtml}
            </div>
        </div>
    `
    });
}

function showModal(html) {
    const container = document.getElementById('modal-container');
    resetSpecialModalClasses();

    container.className = "bg-gx-card border border-zinc-700 w-full max-w-2xl relative shadow-2xl shadow-gx-yellow/10 transform transition-transform duration-300 my-auto rounded-sm overflow-hidden";
    container.innerHTML = html;

    activateGlobalModal();
    refreshIcons();
}

function closeModal({ immediate = false, restoreFocus = true } = {}) {
    const overlay = document.getElementById('global-modal');
    if (!overlay || overlay.classList.contains('hidden')) return;
    clearTimeout(modalCloseTimerId);
    const closingLifecycleId = modalLifecycleId;
    const closeDelay = overlay.classList.contains('about-drawer-open') ? 380 : 300;
    overlay.classList.add('opacity-0');
    const finishClose = () => {
        modalCloseTimerId = null;
        if (closingLifecycleId !== modalLifecycleId) return;
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
        resetSpecialModalClasses();
        const focusOverlay = document.getElementById('about-principle-focus-overlay');
        const focusOverlayOpen = focusOverlay && !focusOverlay.classList.contains('hidden');
        if (!focusOverlayOpen) document.body.style.overflow = bodyOverflowBeforeModal;
        if (restoreFocus && modalReturnFocus && document.contains(modalReturnFocus)) {
            modalReturnFocus.focus({ preventScroll: true });
        }
        modalReturnFocus = null;
    };
    if (immediate) finishClose();
    else modalCloseTimerId = setTimeout(finishClose, closeDelay);
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Datei konnte nicht gelesen werden.'));
        reader.readAsDataURL(file);
    });
}

function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Bildformat konnte nicht verarbeitet werden.'));
        image.src = url;
    });
}

async function optimizeImageFile(file, maxDimension = 1600, quality = 0.82) {
    if (!file || !String(file.type || '').startsWith('image/')) {
        throw new Error('Bitte wähle eine gültige Bilddatei aus.');
    }
    if (file.size > 25 * 1024 * 1024) {
        throw new Error('Das Bild ist größer als 25 MB. Bitte wähle eine kleinere Datei.');
    }

    const sourceUrl = await readFileAsDataUrl(file);
    const image = await loadImageFromUrl(sourceUrl);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Bildverarbeitung wird von diesem Browser nicht unterstützt.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);
    const optimized = canvas.toDataURL('image/webp', quality);
    return optimized && optimized.startsWith('data:image/webp') ? optimized : sourceUrl;
}

async function encodeImageFileAsURL(element) {
    const file = element.files?.[0];
    if (!file) return;
    element.disabled = true;
    try {
        const isBookCover = element.dataset.imageKind === 'book-cover';
        currentImageBase64 = await optimizeImageFile(file, isBookCover ? 640 : 1600, isBookCover ? 0.72 : 0.82);
        updateFormImagePreview(currentImageBase64);
        showToast('Bild wurde optimiert und vorbereitet.', 'success');
    } catch (error) {
        showToast(error.message || 'Bild konnte nicht verarbeitet werden.', 'error');
    } finally {
        element.disabled = false;
        element.value = '';
    }
}

function updateFormImagePreview(imageUrl) {
    const container = document.getElementById('form-image-preview-container');
    if (!container) return;
    const safeUrl = getSafeImageUrl(imageUrl);
    if (!safeUrl) return;
    container.innerHTML = `<img id="form-image-preview" src="${escapeHtml(safeUrl)}" alt="Cover-Vorschau" class="w-full h-full object-cover">`;
}

async function handleAddProfilePhoto(element) {
    const file = element.files?.[0];
    if (!file) return;
    if (editingProfileImages.length >= 12) {
        showToast('Maximal 12 Profilbilder sind erlaubt.', 'error');
        element.value = '';
        return;
    }
    element.disabled = true;
    try {
        const optimized = await optimizeImageFile(file, 1400, 0.8);
        editingProfileImages.push(optimized);
        renderFormImageList();
        showToast('Foto wurde optimiert und hinzugefügt.', 'success');
    } catch (error) {
        showToast(error.message || 'Foto konnte nicht verarbeitet werden.', 'error');
    } finally {
        element.disabled = false;
        element.value = '';
    }
}

function removeEditingPhoto(index) {
    editingProfileImages.splice(index, 1);
    renderFormImageList();
}

function moveEditingPhoto(index, direction) {
    if (index + direction < 0 || index + direction >= editingProfileImages.length) return;
    const temp = editingProfileImages[index];
    editingProfileImages[index] = editingProfileImages[index + direction];
    editingProfileImages[index + direction] = temp;
    renderFormImageList();
}

function renderFormImageList() {
    const container = document.getElementById('form-images-list');
    if (!container) return;
    if (editingProfileImages.length === 0) {
        container.innerHTML = `<p class="text-xs text-zinc-500 italic">Keine Bilder hochgeladen.</p>`;
        return;
    }
    container.innerHTML = editingProfileImages.map((img, i) => `
        <div class="relative w-20 h-20 border border-zinc-700 bg-zinc-900 group">
            <img src="${escapeHtml(getSafeImageUrl(img) || createPlaceholderDataUrl('Foto', 160, 160))}" alt="Profilbild ${i + 1}" decoding="async" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                <div class="flex justify-between w-full px-1">
                    <button type="button" onclick="moveEditingPhoto(${i}, -1)" aria-label="Bild nach links verschieben" class="text-white hover:text-gx-yellow p-1"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
                    <button type="button" onclick="moveEditingPhoto(${i}, 1)" aria-label="Bild nach rechts verschieben" class="text-white hover:text-gx-yellow p-1"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
                </div>
                <button type="button" onclick="removeEditingPhoto(${i})" aria-label="Bild entfernen" class="text-red-500 hover:text-red-400 mt-1">
                    <i data-lucide="trash" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `).join('');
    refreshIcons();
}

function openFormModal(type, id = null) {
    if (type === 'book') {
        if (id === null) openLibraryAdmin({ newBook: true });
        else openLibraryBook(id);
        return;
    }
    if (type === 'document') {
        if (id === null) openDocumentsAdmin({ newDocument: true });
        else openDocumentsAdmin({ itemId: id, tabId: 'documents' });
        return;
    }
    if (type === 'blog') {
        if (id === null) openBlogAdmin({ newPost: true });
        else openBlogAdmin({ itemId: id, tabId: 'posts' });
        return;
    }
    if (type === 'about') {
        openAdminStudio('about');
        return;
    }
    const allowedTypes = ['profile', 'book', 'project', 'document', 'blog'];
    if (!allowedTypes.includes(type)) return;
    let title, content;
    const item = ['book', 'project', 'document', 'blog'].includes(type) && id !== null
        ? findItemByTypeAndId(type, id)
        : null;
    if (id !== null && ['book', 'project', 'document', 'blog'].includes(type) && !item) {
        showToast('Der Eintrag wurde nicht gefunden.', 'error');
        return;
    }
    const idArgument = id === null ? 'null' : `decodeURIComponent('${encodeInlineId(id)}')`;
    currentImageBase64 = getSafeImageUrl(item?.cover || item?.img) || '';

    if (type === 'profile') {
        title = 'Startseite konfigurieren';
        editingProfileImages = [...(state.data.profile.images || [])];
        const p = state.data.profile;

        content = `
            <div class="space-y-4">
                <div>
                    <label for="inp-name" class="block text-sm text-gx-muted mb-1">Name</label>
                    <input type="text" id="inp-name" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(p.name)}">
                </div>
                <div>
                    <label for="inp-role" class="block text-sm text-gx-muted mb-1">Kurze Rolle/Beschreibung</label>
                    <textarea id="inp-role" rows="3" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">${escapeHtml(p.role)}</textarea>
                </div>

                <div class="border-t border-zinc-800 pt-4">
                    <h4 class="font-mono text-sm text-gx-yellow mb-2">Bildergalerie</h4>

                    <label class="block text-xs text-gx-muted mb-2">Hochgeladene Fotos (zum Sortieren oder Löschen hovern):</label>
                    <div id="form-images-list" class="flex flex-wrap gap-2 mb-4"></div>

                    <div class="mb-4">
                        <label for="inp-profile-photo" class="block text-xs text-gx-muted mb-1">Neues Foto hinzufügen</label>
                        <input id="inp-profile-photo" type="file" accept="image/*" onchange="handleAddProfilePhoto(this)" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none text-xs">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="inp-slider-active" ${p.slideshowActive ? 'checked' : ''} class="w-4 h-4 accent-gx-yellow">
                            <label for="inp-slider-active" class="text-sm text-gx-muted">Auto Slideshow</label>
                        </div>
                        <div>
                            <label for="inp-slider-interval" class="block text-xs text-gx-muted mb-1">Intervall (Sekunden)</label>
                            <input type="number" id="inp-slider-interval" min="1" max="60" class="w-full bg-zinc-900 border border-zinc-700 p-1 text-white outline-none focus:border-gx-yellow" value="${p.slideshowInterval || 10}">
                        </div>
                    </div>
                </div>
            </div>`;
        setTimeout(() => renderFormImageList(), 50);

    } else if (type === 'book') {
        title = id !== null ? 'Buch bearbeiten' : 'Buch hinzufügen';
        const coverUrl = getSafeImageUrl(item?.img || item?.cover);
        const topPosition = normalizeLibraryTopPosition(item?.topPosition);
        const medium = normalizeLibraryMedium(item?.medium);
        const readYear = normalizeLibraryReadYear(item?.readYear, item?.dateFinished) || (!String(item?.title || '').trim() ? new Date().getFullYear() : '');
        content = `
            <div class="space-y-4">
                <div class="grid sm:grid-cols-[7rem_minmax(0,1fr)] gap-4 items-start">
                    <div id="form-image-preview-container" class="w-28 aspect-[2/3] bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-600 overflow-hidden">
                        ${coverUrl ? `<img id="form-image-preview" src="${escapeHtml(coverUrl)}" alt="Cover-Vorschau" class="w-full h-full object-cover">` : '<i data-lucide="book-open" class="w-7 h-7"></i>'}
                    </div>
                    <div class="space-y-4 min-w-0">
                        <div><label for="inp-title" class="block text-sm text-gx-muted mb-1">Titel</label>
                        <input type="text" id="inp-title" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.title || '')}"></div>
                        <div><label for="inp-author" class="block text-sm text-gx-muted mb-1">Autor</label>
                        <input type="text" id="inp-author" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.author || '')}"></div>
                        <div><label for="inp-image-file" class="block text-sm text-gx-muted mb-1">Cover</label>
                        <input id="inp-image-file" type="file" accept="image/*" data-image-kind="book-cover" onchange="encodeImageFileAsURL(this)" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none text-xs"></div>
                    </div>
                </div>

                <div class="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label for="inp-medium" class="block text-sm text-gx-muted mb-1">Format</label>
                        <select id="inp-medium" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">
                            <option value="book" ${medium === 'book' ? 'selected' : ''}>Buch</option>
                            <option value="ebook" ${medium === 'ebook' ? 'selected' : ''}>E-Book</option>
                            <option value="audiobook" ${medium === 'audiobook' ? 'selected' : ''}>Hörbuch</option>
                        </select>
                    </div>
                    <div>
                        <label for="inp-date-finished" class="block text-sm text-gx-muted mb-1">Abgeschlossen am (optional)</label>
                        <input type="date" id="inp-date-finished" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.dateFinished || '')}">
                    </div>
                    <div>
                        <label for="inp-read-year" class="block text-sm text-gx-muted mb-1">Gelesen im Jahr (optional)</label>
                        <input type="number" id="inp-read-year" min="1900" max="2100" inputmode="numeric" placeholder="z. B. 2026" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(readYear)}">
                    </div>
                    <div>
                        <label for="inp-category" class="block text-sm text-gx-muted mb-1">Kategorie (optional)</label>
                        <input type="text" id="inp-category" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.category || '')}">
                    </div>
                    <div>
                        <label for="inp-language" class="block text-sm text-gx-muted mb-1">Sprache (optional)</label>
                        <input type="text" id="inp-language" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.language || '')}">
                    </div>
                </div>

                <div>
                    <label for="inp-takeaway" class="block text-sm text-gx-muted mb-1">Was ich aus dem Buch mitgenommen habe</label>
                    <textarea id="inp-takeaway" rows="4" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">${escapeHtml(item?.takeaway || item?.notes || '')}</textarea>
                </div>
                <div>
                    <label for="inp-application" class="block text-sm text-gx-muted mb-1">Wie ich es nutze</label>
                    <textarea id="inp-application" rows="3" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">${escapeHtml(item?.application || '')}</textarea>
                </div>
                <div>
                    <label for="inp-top-position" class="block text-sm text-gx-muted mb-1">Platz unter den fünf Favoriten</label>
                    <select id="inp-top-position" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">
                        <option value="">Kein Favorit</option>
                        ${[1, 2, 3, 4, 5].map(position => `<option value="${position}" ${topPosition === position ? 'selected' : ''}>Position ${position}</option>`).join('')}
                    </select>
                </div>
            </div>`;
    } else if (type === 'project') {
        title = id ? 'Projekt bearbeiten' : 'Projekt hinzufügen';
        content = `
            <div class="space-y-4">
                <div><label for="inp-title" class="block text-sm text-gx-muted mb-1">Projekttitel</label>
                <input type="text" id="inp-title" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.title || '')}"></div>
                <div><label for="inp-desc" class="block text-sm text-gx-muted mb-1">Kurzbeschreibung</label>
                <textarea id="inp-desc" rows="4" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">${escapeHtml(item?.desc || '')}</textarea></div>
                <div><label for="inp-tech" class="block text-sm text-gx-muted mb-1">Technologien (kommagetrennt)</label>
                <input type="text" id="inp-tech" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.tech || '')}"></div>
                <div><label for="inp-icon" class="block text-sm text-gx-muted mb-1">Icon (z.B. folder, monitor)</label>
                <input type="text" id="inp-icon" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.icon || '')}"></div>
                <div><label for="inp-image-file" class="block text-sm text-gx-muted mb-1">Screenshot (Bild)</label>
                <input id="inp-image-file" type="file" accept="image/*" onchange="encodeImageFileAsURL(this)" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none text-xs"></div>
            </div>`;
    } else if (type === 'document') {
        title = id ? 'Dokument bearbeiten' : 'Dokument hinzufügen';
        const fileUrl = item?.fileUrl && item.fileUrl !== '#' ? item.fileUrl : '';
        const originalFileUrl = item?.originalFileUrl && item.originalFileUrl !== '#' ? item.originalFileUrl : '';
        content = `
            <div class="space-y-4">
                <div><label for="inp-title" class="block text-sm text-gx-muted mb-1">Dokumenttitel</label>
                <input type="text" id="inp-title" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.title || '')}"></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label for="inp-category" class="block text-sm text-gx-muted mb-1">Kategorie</label>
                    <input type="text" id="inp-category" placeholder="z. B. Bildung" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.category || '')}"></div>
                    <div><label for="inp-year" class="block text-sm text-gx-muted mb-1">Jahr (optional)</label>
                    <input type="text" id="inp-year" inputmode="numeric" placeholder="z. B. 2026" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.year || '')}"></div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label for="inp-size" class="block text-sm text-gx-muted mb-1">Größe (z.B. 1.2 MB)</label>
                    <input type="text" id="inp-size" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.size || '')}"></div>
                    <div><label for="inp-ext" class="block text-sm text-gx-muted mb-1">Format (z.B. PDF)</label>
                    <input type="text" id="inp-ext" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.ext || '')}"></div>
                </div>
                <div>
                    <label for="inp-fileUrl" class="block text-sm text-gx-muted mb-1">Dateipfad oder URL</label>
                    <input type="text" id="inp-fileUrl" placeholder="assets/documents/dokument.pdf" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(fileUrl)}">
                    <p class="mt-1 text-xs text-zinc-500">Diese Datei wird für „Ansehen“ und „Herunterladen“ verwendet.</p>
                </div>
                <div>
                    <label for="inp-originalFileUrl" class="block text-sm text-gx-muted mb-1">Original-Dateipfad oder URL (optional)</label>
                    <input type="text" id="inp-originalFileUrl" placeholder="assets/documents/dokument-original.pdf" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(originalFileUrl)}">
                </div>
                <div class="grid sm:grid-cols-2 gap-3 border border-zinc-800 bg-zinc-950/60 p-3">
                    <label for="inp-has-original" class="flex items-center gap-3 text-sm text-gx-muted cursor-pointer">
                        <input type="checkbox" id="inp-has-original" ${item?.hasOriginal ? 'checked' : ''} class="w-4 h-4 accent-gx-yellow">
                        <span>Schaltfläche „Original“ anzeigen</span>
                    </label>
                    <label for="inp-featured" class="flex items-center gap-3 text-sm text-gx-muted cursor-pointer">
                        <input type="checkbox" id="inp-featured" ${item?.featured ? 'checked' : ''} class="w-4 h-4 accent-gx-yellow">
                        <span>Unter den vier Hauptdokumenten</span>
                    </label>
                </div>
                <div><label for="inp-image-file" class="block text-sm text-gx-muted mb-1">Vorschau (Bild)</label>
                <input id="inp-image-file" type="file" accept="image/*" onchange="encodeImageFileAsURL(this)" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none text-xs"></div>
            </div>`;
    } else if (type === 'blog') {
        title = id !== null ? 'Beitrag bearbeiten' : 'Neuer Blogbeitrag';
        const publishedAt = normalizeBlogPublishedAt(item?.publishedAt) || (id === null ? new Date().toISOString().slice(0, 10) : '');
        const postImage = getSafeImageUrl(item?.cover || item?.img);
        const category = normalizeBlogCategory(item?.category, item?.tag);
        const postType = normalizeBlogType(item?.type, category);
        const status = item?.status === 'draft' ? 'draft' : 'published';
        const slug = normalizeBlogSlug(item?.slug, item?.title || 'beitrag');
        const tags = normalizeBlogTags(item?.tags, item?.tag).join(', ');
        content = `
            <div class="space-y-4">
                <div class="grid sm:grid-cols-2 gap-4">
                    <div><label for="inp-title" class="block text-sm text-gx-muted mb-1">Titel</label>
                    <input type="text" id="inp-title" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.title || '')}"></div>
                    <div><label for="inp-slug" class="block text-sm text-gx-muted mb-1">Adresse</label>
                    <input type="text" id="inp-slug" placeholder="wird-aus-dem-titel-erzeugt" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow font-mono text-sm" value="${id === null ? '' : escapeHtml(slug)}"></div>
                </div>
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><label for="inp-date" class="block text-sm text-gx-muted mb-1">Veröffentlichungsdatum</label>
                    <input type="date" id="inp-date" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(publishedAt)}"></div>
                    <div><label for="inp-status" class="block text-sm text-gx-muted mb-1">Status</label>
                    <select id="inp-status" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">
                        <option value="published" ${status === 'published' ? 'selected' : ''}>Veröffentlicht</option>
                        <option value="draft" ${status === 'draft' ? 'selected' : ''}>Entwurf</option>
                    </select></div>
                    <div><label for="inp-category" class="block text-sm text-gx-muted mb-1">Kategorie</label>
                    <select id="inp-category" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">
                        ${BLOG_CATEGORIES.map(option => `<option value="${option.key}" ${category === option.key ? 'selected' : ''}>${option.label}</option>`).join('')}
                    </select></div>
                    <div><label for="inp-post-type" class="block text-sm text-gx-muted mb-1">Format</label>
                    <select id="inp-post-type" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">
                        ${BLOG_TYPES.map(option => `<option value="${option.key}" ${postType === option.key ? 'selected' : ''}>${option.label}</option>`).join('')}
                    </select></div>
                </div>
                <div><label for="inp-excerpt" class="block text-sm text-gx-muted mb-1">Kurze Vorschau</label>
                <textarea id="inp-excerpt" rows="3" maxlength="420" placeholder="Worum geht es – in ein bis zwei klaren Sätzen?" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">${escapeHtml(item?.excerpt || '')}</textarea></div>
                <div>
                    <label for="inp-desc" class="block text-sm text-gx-muted mb-1">Beitragstext</label>
                    <textarea id="inp-desc" rows="14" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow font-mono text-sm leading-relaxed">${escapeHtml(item?.contentMarkdown || item?.content || item?.desc || '')}</textarea>
                    <p class="mt-1 text-xs text-zinc-500">Absätze mit einer Leerzeile trennen. Optional: ## Überschrift, - Liste oder &gt; Zitat.</p>
                </div>
                <div><label for="inp-tags" class="block text-sm text-gx-muted mb-1">Tags (maximal 3, mit Komma trennen)</label>
                <input type="text" id="inp-tags" placeholder="Website, Design, JSON" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(tags)}"></div>
                <div class="grid sm:grid-cols-2 gap-4">
                    <div><label for="inp-result" class="block text-sm text-gx-muted mb-1">Was hat sich geändert? (optional)</label>
                    <textarea id="inp-result" rows="3" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">${escapeHtml(item?.result || '')}</textarea></div>
                    <div><label for="inp-next-step" class="block text-sm text-gx-muted mb-1">Nächster Schritt (optional)</label>
                    <textarea id="inp-next-step" rows="3" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">${escapeHtml(item?.nextStep || '')}</textarea></div>
                </div>
                <label for="inp-featured" class="flex items-center gap-3 border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-gx-muted cursor-pointer">
                    <input type="checkbox" id="inp-featured" ${(item?.featured || (id === null && getCollectionForType('blog').length === 0)) ? 'checked' : ''} class="w-4 h-4 accent-gx-yellow">
                    <span>Als aktuellen Hauptbeitrag anzeigen</span>
                </label>
                <div class="blog-editor-image-row">
                    <div id="form-image-preview-container" class="blog-editor-image-preview bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-600 overflow-hidden">
                        ${postImage ? `<img id="form-image-preview" src="${escapeHtml(postImage)}" alt="Beitragsbild-Vorschau" class="w-full h-full object-cover">` : '<i data-lucide="image" class="w-7 h-7"></i>'}
                    </div>
                    <div>
                        <label for="inp-blog-image-url" class="block text-sm text-gx-muted mb-1">Titelbild – Pfad oder URL (optional)</label>
                        <input id="inp-blog-image-url" type="text" placeholder="assets/blog/beitragsbild.webp" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(postImage)}">
                        <label for="inp-cover-alt" class="block text-sm text-gx-muted mb-1 mt-3">Bildbeschreibung</label>
                        <input id="inp-cover-alt" type="text" placeholder="Was ist auf dem Bild zu sehen?" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.coverAlt || '')}">
                        <p class="mt-1 text-xs text-zinc-500">Ohne Bild erzeugt der Blog automatisch ein passendes typografisches Motiv.</p>
                    </div>
                </div>
            </div>`;
    }

    const html = `
        <div class="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
            <h3 class="text-xl font-bold font-mono text-gx-yellow">${title}</h3>
            <button type="button" onclick="closeModal(); playClickSound();" aria-label="Dialog schließen" class="text-zinc-500 hover:text-white transition-colors"><i data-lucide="x"></i></button>
        </div>
        <div class="p-6 max-h-[70vh] overflow-y-auto">${content}</div>
        <div class="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-4">
            <button type="button" onclick="closeModal(); playClickSound();" class="px-6 py-2 border border-zinc-700 hover:bg-zinc-800 transition-colors text-sm font-mono">Abbrechen</button>
            <button type="button" onclick="saveItem('${type}', ${idArgument}); playClickSound();" class="px-6 py-2 bg-gx-yellow text-gx-bg hover:bg-yellow-500 font-bold transition-colors text-sm font-mono">Speichern</button>
        </div>
    `;
    showModal(html);
}

function saveItem(type, id) {
    if (type === 'profile') {
        state.data.profile.name = document.getElementById('inp-name').value.trim() || 'Ivan';
        state.data.profile.role = document.getElementById('inp-role').value.trim();
        state.data.profile.images = editingProfileImages.map(getSafeImageUrl).filter(Boolean).slice(0, 12);
        state.data.profile.slideshowActive = document.getElementById('inp-slider-active').checked;
        const interval = Number.parseInt(document.getElementById('inp-slider-interval').value, 10);
        state.data.profile.slideshowInterval = Number.isFinite(interval) ? Math.max(1, Math.min(60, interval)) : 10;
        currentSlide = 0;
    } else {
        const arr = getCollectionForType(type);
        if (!arr) return;
        let newItem = id !== null ? findItemByTypeAndId(type, id) : { id: Date.now() };
        if (!newItem) {
            showToast('Der Eintrag wurde nicht gefunden.', 'error');
            return;
        }

        newItem.title = document.getElementById('inp-title').value.trim();
        if (!newItem.title) {
            showToast('Bitte gib einen Titel ein.', 'error');
            document.getElementById('inp-title').focus();
            return;
        }
        if(currentImageBase64 && type !== 'blog') newItem.img = getSafeImageUrl(currentImageBase64);

        if (type === 'book') {
            newItem.author = document.getElementById('inp-author').value.trim();
            newItem.medium = normalizeLibraryMedium(document.getElementById('inp-medium').value);
            newItem.dateFinished = normalizeLibraryDate(document.getElementById('inp-date-finished').value);
            newItem.readYear = normalizeLibraryReadYear(document.getElementById('inp-read-year').value, newItem.dateFinished);
            newItem.category = document.getElementById('inp-category').value.trim();
            newItem.language = document.getElementById('inp-language').value.trim();
            newItem.takeaway = document.getElementById('inp-takeaway').value.trim();
            newItem.application = document.getElementById('inp-application').value.trim();
            newItem.status = 'read';
            newItem.dateAdded = normalizeLibraryDate(newItem.dateAdded) || new Date().toISOString().slice(0, 10);
            newItem.isPlaceholder = false;
            delete newItem.notes;
            delete newItem.cover;
            delete newItem.icon;
            const topPosition = normalizeLibraryTopPosition(document.getElementById('inp-top-position').value);
            newItem.top = Boolean(topPosition);
            newItem.topPosition = topPosition;

            if (topPosition) {
                for (let index = arr.length - 1; index >= 0; index -= 1) {
                    const otherBook = arr[index];
                    if (otherBook === newItem || normalizeLibraryTopPosition(otherBook.topPosition) !== topPosition) continue;
                    if (isLibraryPlaceholder(otherBook)) {
                        arr.splice(index, 1);
                    } else {
                        otherBook.top = false;
                        otherBook.topPosition = null;
                    }
                }
            }
        } else if (type === 'project') {
            newItem.desc = document.getElementById('inp-desc').value.trim();
            newItem.tech = document.getElementById('inp-tech').value.trim();
            newItem.icon = normalizeIconName(document.getElementById('inp-icon').value, 'folder');
        } else if (type === 'document') {
            newItem.category = document.getElementById('inp-category').value.trim();
            newItem.year = document.getElementById('inp-year').value.trim();
            newItem.size = document.getElementById('inp-size').value.trim();
            newItem.ext = document.getElementById('inp-ext').value.trim().toUpperCase() || 'PDF';
            newItem.fileUrl = getSafeLinkUrl(document.getElementById('inp-fileUrl').value);
            const originalFileValue = document.getElementById('inp-originalFileUrl').value.trim();
            newItem.originalFileUrl = originalFileValue ? getSafeLinkUrl(originalFileValue) : '';
            newItem.hasOriginal = document.getElementById('inp-has-original').checked || Boolean(originalFileValue);
            newItem.featured = document.getElementById('inp-featured').checked;
            if (!newItem.code) {
                const highestCode = arr.reduce((highest, documentItem) => {
                    const match = String(documentItem.code || '').match(/^DOC-(\d+)$/i);
                    return match ? Math.max(highest, Number(match[1])) : highest;
                }, 0);
                newItem.code = `DOC-${String(highestCode + 1).padStart(2, '0')}`;
            }
            if(!newItem.icon) newItem.icon = 'file-text';
        } else if (type === 'blog') {
            newItem.publishedAt = normalizeBlogPublishedAt(document.getElementById('inp-date').value);
            newItem.status = document.getElementById('inp-status').value === 'draft' ? 'draft' : 'published';
            newItem.category = normalizeBlogCategory(document.getElementById('inp-category').value);
            newItem.type = normalizeBlogType(document.getElementById('inp-post-type').value, newItem.category);
            newItem.tags = normalizeBlogTags(document.getElementById('inp-tags').value);
            newItem.contentMarkdown = document.getElementById('inp-desc').value.trim();
            const excerpt = document.getElementById('inp-excerpt').value.trim();
            newItem.excerpt = excerpt || (newItem.contentMarkdown.length > 230
                ? `${newItem.contentMarkdown.slice(0, 227).trimEnd()}…`
                : newItem.contentMarkdown);
            const requestedSlug = normalizeBlogSlug(document.getElementById('inp-slug').value, newItem.title);
            const usedSlugs = new Set(arr
                .filter(otherPost => otherPost !== newItem)
                .map(otherPost => normalizeBlogSlug(otherPost.slug, otherPost.title)));
            let uniqueSlug = requestedSlug;
            let slugSuffix = 2;
            while (usedSlugs.has(uniqueSlug)) {
                uniqueSlug = `${requestedSlug}-${slugSuffix}`;
                slugSuffix += 1;
            }
            newItem.slug = uniqueSlug;
            const blogImageValue = document.getElementById('inp-blog-image-url').value.trim();
            newItem.cover = blogImageValue ? getSafeImageUrl(blogImageValue) : '';
            newItem.coverAlt = document.getElementById('inp-cover-alt').value.trim();
            newItem.result = document.getElementById('inp-result').value.trim();
            newItem.nextStep = document.getElementById('inp-next-step').value.trim();
            newItem.featured = newItem.status === 'published' && document.getElementById('inp-featured').checked;
            newItem.updatedAt = new Date().toISOString();
            delete newItem.desc;
            delete newItem.content;
            delete newItem.date;
            delete newItem.tag;
            delete newItem.img;
            delete newItem.externalUrl;
            delete newItem.externalLabel;
            delete newItem.telegramUrl;
            if (newItem.featured) {
                arr.forEach(otherPost => {
                    if (otherPost !== newItem) otherPost.featured = false;
                });
            } else if (newItem.status === 'published' && !arr.some(otherPost => (
                otherPost !== newItem && otherPost.status !== 'draft' && otherPost.featured === true
            ))) {
                newItem.featured = true;
            }
        }
        if (id === null) arr.push(newItem);
    }
    if (!saveData()) return;
    renderSection(type);
    if (type === 'profile') startSlideshow();
    closeModal();
    showToast('Änderungen wurden gespeichert.', 'success');
}

function openViewModal(type, id) {
    if(isAdmin) return;
    if (!['book', 'project', 'document', 'blog'].includes(type)) return;
    const item = findItemByTypeAndId(type, id);
    if(!item) return;

    if (type === 'book') {
        if (isLibraryPlaceholder(item)) return;
        showModal(renderLibraryBookDetail(item));
        document.getElementById('modal-container')?.classList.add('library-detail-modal-host');
        refreshIcons();
        return;
    }

    if (type === 'document' && typeof openDocumentViewer === 'function') {
        openDocumentViewer(id, 'primary');
        return;
    }

    if (type === 'blog' && typeof openBlogPost === 'function') {
        openBlogPost(id);
        return;
    }

    let content = '';
    if (type === 'project') {
        const imageUrl = getSafeImageUrl(item.img);
        content = `
            <div class="flex flex-col gap-8">
                ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="Projektvorschau: ${escapeHtml(item.title || 'Projekt')}" decoding="async" class="w-full max-h-[400px] object-cover rounded shadow-xl border border-zinc-800">` : ''}
                <div>
                    <h3 class="text-3xl md:text-4xl font-bold mb-4 text-white">${escapeHtml(item.title || 'Projekt')}</h3>
                    <div class="mb-8 flex gap-2 flex-wrap">${String(item.tech || '').split(',').map(t => t.trim()).filter(Boolean).map(t => `<span class="px-3 py-1 bg-zinc-800 text-sm font-mono rounded text-gx-yellow border border-zinc-700">${escapeHtml(t)}</span>`).join('')}</div>
                    <p class="text-gx-muted whitespace-pre-wrap text-lg leading-relaxed bg-zinc-900/50 p-6 border border-zinc-800 rounded">${escapeHtml(item.desc || '')}</p>
                </div>
            </div>`;
    } else if (type === 'document') {
        const imageUrl = getSafeImageUrl(item.img);
        const fileUrl = getSafeLinkUrl(item.fileUrl);
        const icon = normalizeIconName(item.icon, 'file-text');
        content = `
            <div class="text-center py-8">
                ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="Dokumentvorschau: ${escapeHtml(item.title || 'Dokument')}" decoding="async" class="max-w-full max-h-[500px] mx-auto mb-8 border border-zinc-800 rounded shadow-2xl">` :
                `<div class="w-40 h-40 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-8 border border-zinc-800 shadow-xl"><i data-lucide="${icon}" class="w-20 h-20 text-zinc-600"></i></div>`}
                <h3 class="text-3xl font-bold mb-3 text-white">${escapeHtml(item.title || 'Dokument')}</h3>
                <div class="flex justify-center gap-4">
                    <a href="${escapeHtml(fileUrl)}" download onclick="if(this.getAttribute('href') === '#') { event.preventDefault(); showToast('Für dieses Dokument wurde noch keine Datei hinterlegt.'); }" class="inline-flex bg-gx-yellow text-gx-bg hover:bg-yellow-500 py-3 px-8 font-bold items-center gap-2 transition-colors rounded shadow-lg shadow-gx-yellow/20"><i data-lucide="download" class="w-5 h-5"></i> Herunterladen</a>
                </div>
            </div>`;
    }
    showModal(`
        <div class="p-4 border-b border-zinc-800 flex justify-end bg-zinc-900 absolute top-0 w-full z-10 bg-opacity-90 backdrop-blur">
            <button type="button" onclick="closeModal(); playClickSound();" aria-label="Dialog schließen" class="text-zinc-500 hover:text-white transition-colors bg-zinc-800 p-2 rounded-full"><i data-lucide="x"></i></button>
        </div>
        <div class="p-8 pt-24 max-h-[90vh] overflow-y-auto">${content}</div>
    `);
}

function requestDelete(type, id) {
    if (!['book', 'project', 'document', 'blog'].includes(type) || !findItemByTypeAndId(type, id)) return;
    itemToDelete = { type, id };
    showModal(`
        <div class="p-8 text-center max-w-sm mx-auto">
            <div class="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-900"><i data-lucide="alert-triangle" class="text-red-500 w-8 h-8"></i></div>
            <h3 class="text-xl font-bold mb-4 text-white">Sind Sie sicher?</h3>
            <div class="flex justify-center gap-4">
                <button type="button" onclick="closeModal(); playClickSound();" class="px-6 py-2 border border-zinc-700 hover:bg-zinc-800 transition-colors text-sm font-mono">Abbrechen</button>
                <button type="button" onclick="confirmDelete(); playClickSound();" class="px-6 py-2 bg-red-600 text-white hover:bg-red-700 font-bold transition-colors text-sm font-mono">Löschen</button>
            </div>
        </div>
    `);
}

function confirmDelete() {
    if (itemToDelete) {
        const keyByType = { project: 'projects', book: 'books', document: 'documents', blog: 'blogs' };
        const key = keyByType[itemToDelete.type];
        if (!key || !Array.isArray(state.data[key])) return;
        const previous = state.data[key];
        state.data[key] = previous.filter(item => String(item.id) !== String(itemToDelete.id));
        if (!saveData()) {
            state.data[key] = previous;
            return;
        }
        const deletedType = itemToDelete.type;
        itemToDelete = null;
        renderSection(deletedType);
        closeModal();
        showToast('Eintrag wurde gelöscht.', 'success');
    }
}
