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

    const overlay = document.getElementById('global-modal');
    const container = document.getElementById('modal-container');
    resetSpecialModalClasses();

    container.className = 'about-more-modal about-main-drawer';
    container.innerHTML = `
        <div class="about-more-modal-inner" onclick="event.stopPropagation();">
            <div class="about-more-modal-head">
                <button type="button" onclick="closeModal(); playClickSound();" class="about-more-modal-close about-drawer-back" aria-label="Zurück zur Seite">
                    <i data-lucide="arrow-left"></i>
                </button>
                <h2 id="about-drawer-title" tabindex="-1" class="about-more-modal-title">Über mich</h2>
                <span class="about-drawer-kicker" aria-hidden="true">01 / PROFIL</span>
            </div>
            <div class="about-more-modal-body">
                ${sectionsHtml}
            </div>
        </div>
    `;

    overlay.classList.add('about-more-modal-open');
    overlay.classList.add('about-drawer-open');
    overlay.setAttribute('aria-labelledby', 'about-drawer-title');
    activateGlobalModal();
    setTimeout(() => document.getElementById('about-drawer-title')?.focus({ preventScroll: true }), 40);
    refreshIcons();
}

function showModal(html) {
    const container = document.getElementById('modal-container');
    resetSpecialModalClasses();

    container.className = "bg-gx-card border border-zinc-700 w-full max-w-2xl relative shadow-2xl shadow-gx-yellow/10 transform transition-transform duration-300 my-auto rounded-sm overflow-hidden";
    container.innerHTML = html;

    activateGlobalModal();
    refreshIcons();
}

function closeModal() {
    const overlay = document.getElementById('global-modal');
    if (!overlay || overlay.classList.contains('hidden')) return;
    clearTimeout(modalCloseTimerId);
    const closeDelay = overlay.classList.contains('about-drawer-open') ? 380 : 300;
    overlay.classList.add('opacity-0');
    modalCloseTimerId = setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
        resetSpecialModalClasses();
        const focusOverlay = document.getElementById('about-principle-focus-overlay');
        const focusOverlayOpen = focusOverlay && !focusOverlay.classList.contains('hidden');
        if (!focusOverlayOpen) document.body.style.overflow = bodyOverflowBeforeModal;
        if (modalReturnFocus && document.contains(modalReturnFocus)) {
            modalReturnFocus.focus({ preventScroll: true });
        }
        modalReturnFocus = null;
    }, closeDelay);
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
        currentImageBase64 = await optimizeImageFile(file, 1600, 0.82);
        showToast('Bild wurde optimiert und vorbereitet.', 'success');
    } catch (error) {
        showToast(error.message || 'Bild konnte nicht verarbeitet werden.', 'error');
    } finally {
        element.disabled = false;
        element.value = '';
    }
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
    const allowedTypes = ['profile', 'about', 'book', 'project', 'document', 'blog'];
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
    currentImageBase64 = getSafeImageUrl(item?.img) || '';

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
                            <input type="number" id="inp-slider-interval" min="1" max="60" class="w-full bg-zinc-900 border border-zinc-700 p-1 text-white outline-none focus:border-gx-yellow" value="${p.slideshowInterval || 4}">
                        </div>
                    </div>
                </div>
            </div>`;
        setTimeout(() => renderFormImageList(), 50);

    } else if (type === 'about') {
        title = 'Über mich bearbeiten';
        state.data.about = migrateAboutData(state.data.about);
        const ab = state.data.about;
        content = `
            <div class="space-y-4">
                <div><label for="inp-p1" class="block text-sm text-gx-muted mb-1">Absatz 1</label>
                <textarea id="inp-p1" rows="4" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">${escapeHtml(ab.introShort || '')}</textarea></div>
                <div><label for="inp-p2" class="block text-sm text-gx-muted mb-1">Absatz 2</label>
                <textarea id="inp-p2" rows="4" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">${escapeHtml(ab.introFull || '')}</textarea></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label for="inp-loc" class="block text-sm text-gx-muted mb-1">Standort</label>
                    <input type="text" id="inp-loc" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(findFactValue('Standort', ab))}"></div>
                    <div><label for="inp-lang" class="block text-sm text-gx-muted mb-1">Sprachen</label>
                    <input type="text" id="inp-lang" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(findFactValue('Sprachen', ab))}"></div>
                </div>
                <div><label for="inp-tech" class="block text-sm text-gx-muted mb-1">Technologien</label>
                <input type="text" id="inp-tech" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(findFactValue('Technologien', ab))}"></div>
            </div>`;
    } else if (type === 'book') {
        title = id ? 'Buch bearbeiten' : 'Buch hinzufügen';
        content = `
            <div class="space-y-4">
                <div><label for="inp-title" class="block text-sm text-gx-muted mb-1">Titel</label>
                <input type="text" id="inp-title" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.title || '')}"></div>
                <div><label for="inp-author" class="block text-sm text-gx-muted mb-1">Autor</label>
                <input type="text" id="inp-author" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.author || '')}"></div>
                <div><label for="inp-image-file" class="block text-sm text-gx-muted mb-1">Cover (Bild)</label>
                <input id="inp-image-file" type="file" accept="image/*" onchange="encodeImageFileAsURL(this)" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none text-xs"></div>
                <div><label for="inp-notes" class="block text-sm text-gx-muted mb-1">Notizen / Eindrücke</label>
                <textarea id="inp-notes" rows="4" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">${escapeHtml(item?.notes || '')}</textarea></div>
                <div class="flex items-center gap-2 mt-4">
                    <input type="checkbox" id="inp-top" ${item?.top ? 'checked' : ''} class="w-4 h-4 accent-gx-yellow">
                    <label for="inp-top" class="text-sm text-gx-muted">Zu Top-5 Favoriten hinzufügen</label>
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
        content = `
            <div class="space-y-4">
                <div><label for="inp-title" class="block text-sm text-gx-muted mb-1">Dokumenttitel</label>
                <input type="text" id="inp-title" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.title || '')}"></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label for="inp-size" class="block text-sm text-gx-muted mb-1">Größe (z.B. 1.2 MB)</label>
                    <input type="text" id="inp-size" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.size || '')}"></div>
                    <div><label for="inp-ext" class="block text-sm text-gx-muted mb-1">Format (z.B. PDF)</label>
                    <input type="text" id="inp-ext" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.ext || '')}"></div>
                </div>
                <div><label for="inp-fileUrl" class="block text-sm text-gx-muted mb-1">Download-URL</label>
                <input type="text" id="inp-fileUrl" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.fileUrl || '')}"></div>
                <div><label for="inp-image-file" class="block text-sm text-gx-muted mb-1">Vorschau (Bild)</label>
                <input id="inp-image-file" type="file" accept="image/*" onchange="encodeImageFileAsURL(this)" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none text-xs"></div>
            </div>`;
    } else if (type === 'blog') {
        title = id ? 'Beitrag bearbeiten' : 'Neuer Blogbeitrag';
        content = `
            <div class="space-y-4">
                <div><label for="inp-title" class="block text-sm text-gx-muted mb-1">Titel</label>
                <input type="text" id="inp-title" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.title || '')}"></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label for="inp-date" class="block text-sm text-gx-muted mb-1">Datum (z.B. Juni 2026)</label>
                    <input type="text" id="inp-date" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.date || '')}"></div>
                    <div><label for="inp-tag" class="block text-sm text-gx-muted mb-1">Tag/Kategorie (z.B. #WebDev)</label>
                    <input type="text" id="inp-tag" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow" value="${escapeHtml(item?.tag || '')}"></div>
                </div>
                <div><label for="inp-desc" class="block text-sm text-gx-muted mb-1">Beitragstext</label>
                <textarea id="inp-desc" rows="6" class="w-full bg-zinc-900 border border-zinc-700 p-2 text-white outline-none focus:border-gx-yellow">${escapeHtml(item?.desc || '')}</textarea></div>
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
        state.data.profile.slideshowInterval = Number.isFinite(interval) ? Math.max(1, Math.min(60, interval)) : 4;
        currentSlide = 0;
    } else if (type === 'about') {
        state.data.about = migrateAboutData(state.data.about);
        state.data.about.introShort = document.getElementById('inp-p1').value.trim();
        state.data.about.introFull = document.getElementById('inp-p2').value.trim();
        setFactValue('Standort', document.getElementById('inp-loc').value.trim(), state.data.about);
        setFactValue('Sprachen', document.getElementById('inp-lang').value.trim(), state.data.about);
        setFactValue('Technologien', document.getElementById('inp-tech').value.trim(), state.data.about);
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
        if(currentImageBase64) newItem.img = getSafeImageUrl(currentImageBase64);

        if (type === 'book') {
            newItem.author = document.getElementById('inp-author').value.trim();
            newItem.notes = document.getElementById('inp-notes').value.trim();
            newItem.top = document.getElementById('inp-top').checked;
            if(!newItem.icon) newItem.icon = 'book';
        } else if (type === 'project') {
            newItem.desc = document.getElementById('inp-desc').value.trim();
            newItem.tech = document.getElementById('inp-tech').value.trim();
            newItem.icon = normalizeIconName(document.getElementById('inp-icon').value, 'folder');
        } else if (type === 'document') {
            newItem.size = document.getElementById('inp-size').value.trim();
            newItem.ext = document.getElementById('inp-ext').value.trim();
            newItem.fileUrl = getSafeLinkUrl(document.getElementById('inp-fileUrl').value);
            if(!newItem.icon) newItem.icon = 'file-text';
        } else if (type === 'blog') {
            newItem.date = document.getElementById('inp-date').value.trim();
            newItem.tag = document.getElementById('inp-tag').value.trim();
            newItem.desc = document.getElementById('inp-desc').value.trim();
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

    let content = '';
    if(type === 'book') {
        const imageUrl = getSafeImageUrl(item.img);
        const icon = normalizeIconName(item.icon, 'book');
        content = `
            <div class="flex flex-col md:flex-row gap-8">
                <div class="w-full md:w-1/3 shrink-0">
                    ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="Cover: ${escapeHtml(item.title || 'Buch')}" decoding="async" class="w-full rounded shadow-xl object-cover aspect-[2/3] border border-zinc-800">` :
                    `<div class="w-full aspect-[2/3] bg-zinc-900 flex items-center justify-center rounded shadow-xl border border-zinc-800"><i data-lucide="${icon}" class="w-20 h-20 text-zinc-700"></i></div>`}
                </div>
                <div class="flex-1">
                    <h3 class="text-3xl font-bold mb-2 text-white">${escapeHtml(item.title || 'Buch')}</h3>
                    <p class="text-xl text-gx-muted mb-8">${escapeHtml(item.author || '')}</p>
                    ${item.notes ? `
                        <div class="bg-zinc-900/50 p-6 border border-zinc-800 rounded relative">
                            <h4 class="font-bold text-white mb-3 flex items-center gap-2"><i data-lucide="edit-3" class="w-4 h-4 text-gx-yellow"></i> Eindrücke & Notizen:</h4>
                            <p class="text-gx-muted whitespace-pre-wrap leading-relaxed relative z-10">${escapeHtml(item.notes)}</p>
                        </div>
                    ` : ''}
                </div>
            </div>`;
    } else if (type === 'project') {
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
    } else if (type === 'blog') {
        content = `
            <div class="space-y-4">
                <div class="flex items-center gap-3 text-sm font-mono text-zinc-500">
                    <i data-lucide="calendar" class="w-4 h-4"></i> ${escapeHtml(item.date || 'Kürzlich')}
                    <span class="text-gx-yellow ml-auto">${escapeHtml(item.tag || '#WebDev')}</span>
                </div>
                <h3 class="text-3xl font-bold text-white">${escapeHtml(item.title || 'Beitrag')}</h3>
                <div class="bg-zinc-900/50 p-6 border border-zinc-800 rounded-sm">
                    <p class="text-gx-muted whitespace-pre-wrap leading-relaxed text-lg">${escapeHtml(item.desc || '')}</p>
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
