/* Compact document archive, full drawer and internal file viewer. */

let activeDocumentId = 'document-school-certificate';
let documentsDrawerOpen = false;
let documentsDrawerCloseTimer = null;
let documentsDrawerReturnFocus = null;

function getDocumentsContent() {
    return normalizeDocumentsContent(state.data.documentsContent);
}

function renderDocumentsContent() {
    const content = getDocumentsContent();
    document.querySelectorAll('[data-documents-text]').forEach(element => {
        const text = content[element.dataset.documentsText];
        if (text !== undefined && element.textContent !== text) element.textContent = text;
    });
}

function openDocumentsAdmin(options = {}) {
    if (!isAdmin) return;
    openAdminStudio('documents', options);
}

function getDocuments() {
    return Array.isArray(state.data.documents) ? state.data.documents : [];
}

function getDocumentSource(documentItem, sourceKind = 'primary') {
    const value = sourceKind === 'original' ? documentItem?.originalFileUrl : documentItem?.fileUrl;
    const safeUrl = getSafeLinkUrl(value);
    return safeUrl && safeUrl !== '#' ? safeUrl : '';
}

function getFeaturedDocuments() {
    return getDocuments()
        .filter(item => item.featured === true && normalizeDocumentFeaturedPosition(item.featuredPosition))
        .sort((first, second) => first.featuredPosition - second.featuredPosition)
        .slice(0, 4);
}

function getActiveDocument(featuredDocuments = getFeaturedDocuments()) {
    const selected = featuredDocuments.find(item => String(item.id) === String(activeDocumentId));
    if (selected) return selected;
    const schoolCertificate = featuredDocuments.find(item => String(item.id) === 'document-school-certificate');
    const fallback = schoolCertificate || featuredDocuments[0] || null;
    activeDocumentId = fallback?.id ?? null;
    return fallback;
}

function renderDocumentAdminActions(documentItem, { inDrawer = false } = {}) {
    if (!isAdmin) return '';
    const id = encodeInlineId(documentItem?.id);
    return `
        <div class="document-admin-actions${inDrawer ? ' is-drawer' : ''} admin-only">
            <button type="button" onclick="event.stopPropagation(); openDocumentsAdmin({ itemId: decodeURIComponent('${id}'), tabId: 'documents' }); playClickSound();" aria-label="Dokument im Admin Studio bearbeiten">
                <i data-lucide="edit-2" aria-hidden="true"></i>
            </button>
        </div>
    `;
}

function renderDocumentTab(documentItem) {
    const id = encodeInlineId(documentItem?.id);
    const active = String(documentItem?.id) === String(activeDocumentId);
    const icon = normalizeIconName(documentItem?.icon, 'file-text');
    const metadata = [documentItem?.category, documentItem?.year].map(value => String(value || '').trim()).filter(Boolean);
    return `
        <article class="document-tab${active ? ' is-active' : ''}">
            ${renderDocumentAdminActions(documentItem)}
            <button type="button" class="document-tab-main" onclick="selectDocument(decodeURIComponent('${id}')); playClickSound();" aria-pressed="${active}" aria-label="${escapeHtml(documentItem?.title || 'Dokument')} auswählen">
                <span class="document-tab-icon"><i data-lucide="${icon}" aria-hidden="true"></i></span>
                <span class="document-tab-copy">
                    <span class="document-tab-code">${escapeHtml(documentItem?.code || 'DOC')}</span>
                    <strong>${escapeHtml(documentItem?.title || 'Dokument')}</strong>
                    <span class="document-tab-meta">${metadata.map(item => `<span>${escapeHtml(item)}</span>`).join('<span aria-hidden="true">·</span>')}</span>
                </span>
            </button>
        </article>
    `;
}

function renderDocumentPaper(documentItem) {
    const imageUrl = getSafeImageUrl(documentItem?.img);
    const icon = normalizeIconName(documentItem?.icon, 'file-text');
    return `
        <div class="document-scanner" aria-hidden="true">
            <span class="document-scanner-corners"></span>
            <span class="document-scanner-dots"><span></span></span>
            <div class="document-paper-stack">
                <div class="document-paper">
                    ${imageUrl
                        ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async">`
                        : `<i data-lucide="${icon}"></i><span>${escapeHtml(documentItem?.ext || 'PDF')}</span>`}
                </div>
            </div>
            <span class="document-scan-line"></span>
        </div>
    `;
}

function renderDocumentAction(documentItem, action) {
    const content = getDocumentsContent();
    const id = encodeInlineId(documentItem?.id);
    const title = escapeHtml(documentItem?.title || 'Dokument');
    if (action === 'view') {
        return `<button type="button" class="document-action is-primary" onclick="openDocumentViewer(decodeURIComponent('${id}'), 'primary'); playClickSound();" aria-label="${title} ${escapeHtml(content.viewLabel)}"><i data-lucide="eye" aria-hidden="true"></i><span>${escapeHtml(content.viewLabel)}</span></button>`;
    }
    if (action === 'download') {
        return `<button type="button" class="document-action" onclick="downloadDocumentFile(decodeURIComponent('${id}'), 'primary'); playClickSound();" aria-label="${title} ${escapeHtml(content.downloadLabel)}"><i data-lucide="download" aria-hidden="true"></i><span>${escapeHtml(content.downloadLabel)}</span></button>`;
    }
    if (action === 'original' && documentItem?.hasOriginal) {
        return `<button type="button" class="document-action" onclick="openDocumentViewer(decodeURIComponent('${id}'), 'original'); playClickSound();" aria-label="${escapeHtml(content.originalLabel)} von ${title} ${escapeHtml(content.viewLabel)}"><i data-lucide="languages" aria-hidden="true"></i><span>${escapeHtml(content.originalLabel)}</span></button>`;
    }
    return '';
}

function renderActiveDocument(documentItem) {
    const content = getDocumentsContent();
    if (!documentItem) {
        return `<div class="document-empty">${escapeHtml(content.emptyLabel)}</div>`;
    }
    const category = String(documentItem.category || 'Dokument').trim();
    const year = String(documentItem.year || '—').trim();
    const ext = String(documentItem.ext || 'PDF').trim();
    return `
        ${renderDocumentPaper(documentItem)}
        <div class="document-active-info">
            <h3>${escapeHtml(documentItem.title || 'Dokument')}</h3>
            <dl class="document-active-meta">
                <dt>${escapeHtml(content.categoryLabel)}</dt><dd>${escapeHtml(category)}</dd>
                <dt>${escapeHtml(content.yearLabel)}</dt><dd>${escapeHtml(year)}</dd>
                <dt>${escapeHtml(content.fileTypeLabel)}</dt><dd>${escapeHtml(ext)}</dd>
            </dl>
            <div class="document-active-actions">
                ${renderDocumentAction(documentItem, 'view')}
                ${renderDocumentAction(documentItem, 'download')}
                ${renderDocumentAction(documentItem, 'original')}
            </div>
        </div>
    `;
}

function renderDocuments() {
    const tabsContainer = document.getElementById('documents-container');
    const activePanel = document.getElementById('document-active-panel');
    if (!tabsContainer || !activePanel) return;

    renderDocumentsContent();
    const featuredDocuments = getFeaturedDocuments();
    const activeDocument = getActiveDocument(featuredDocuments);
    tabsContainer.innerHTML = featuredDocuments.length
        ? featuredDocuments.map(renderDocumentTab).join('')
        : `<div class="document-empty">${escapeHtml(getDocumentsContent().emptyLabel)}</div>`;
    activePanel.innerHTML = renderActiveDocument(activeDocument);

    renderAllDocuments();
    bindDocumentsUi();
    refreshIcons();
}

function selectDocument(documentId) {
    if (!findItemByTypeAndId('document', documentId)) return;
    activeDocumentId = documentId;
    renderDocuments();
}

function renderAllDocumentRow(documentItem) {
    const content = getDocumentsContent();
    const id = encodeInlineId(documentItem?.id);
    const metadata = [documentItem?.category, documentItem?.year].map(value => String(value || '').trim()).filter(Boolean).join(' · ');
    return `
        <article class="document-all-row">
            <span class="document-all-code">${escapeHtml(documentItem?.code || 'DOC')}</span>
            <div class="document-all-title">
                <strong>${escapeHtml(documentItem?.title || 'Dokument')}</strong>
                <span>${escapeHtml(metadata)}</span>
            </div>
            <span class="document-all-meta">${escapeHtml(documentItem?.size || '—')}</span>
            <span class="document-all-meta">${escapeHtml(documentItem?.ext || 'PDF')}</span>
            <div class="document-all-actions">
                <button type="button" class="document-action is-primary" onclick="setDocumentsDrawerOpen(false, { immediate: true }); openDocumentViewer(decodeURIComponent('${id}'), 'primary'); playClickSound();" aria-label="${escapeHtml(documentItem?.title || 'Dokument')} ${escapeHtml(content.viewLabel)}"><i data-lucide="eye" aria-hidden="true"></i><span>${escapeHtml(content.viewLabel)}</span></button>
                <button type="button" class="document-action" onclick="downloadDocumentFile(decodeURIComponent('${id}'), 'primary'); playClickSound();" aria-label="${escapeHtml(documentItem?.title || 'Dokument')} ${escapeHtml(content.downloadLabel)}"><i data-lucide="download" aria-hidden="true"></i><span>${escapeHtml(content.downloadLabel)}</span></button>
                ${documentItem?.hasOriginal ? `<button type="button" class="document-action" onclick="setDocumentsDrawerOpen(false, { immediate: true }); openDocumentViewer(decodeURIComponent('${id}'), 'original'); playClickSound();" aria-label="${escapeHtml(content.originalLabel)} von ${escapeHtml(documentItem?.title || 'Dokument')} ${escapeHtml(content.viewLabel)}"><i data-lucide="languages" aria-hidden="true"></i><span>${escapeHtml(content.originalLabel)}</span></button>` : ''}
                ${renderDocumentAdminActions(documentItem, { inDrawer: true })}
            </div>
        </article>
    `;
}

function renderAllDocuments() {
    const container = document.getElementById('documents-all-container');
    if (!container) return;
    const documents = getDocuments();
    container.innerHTML = documents.length
        ? documents.map(renderAllDocumentRow).join('')
        : `<p class="document-empty">${escapeHtml(getDocumentsContent().emptyLabel)}</p>`;
    refreshIcons();
}

function getDocumentsDrawer() {
    const drawer = document.getElementById('documents-drawer');
    if (drawer && drawer.parentElement !== document.body) document.body.appendChild(drawer);
    return drawer;
}

function setDocumentsDrawerOpen(open, { immediate = false } = {}) {
    const drawer = getDocumentsDrawer();
    const toggle = document.getElementById('documents-open-all');
    if (!drawer || !toggle) return;

    clearTimeout(documentsDrawerCloseTimer);
    documentsDrawerOpen = Boolean(open);
    toggle.setAttribute('aria-expanded', String(documentsDrawerOpen));
    drawer.setAttribute('aria-hidden', String(!documentsDrawerOpen));
    document.body.classList.toggle('documents-drawer-open', documentsDrawerOpen);

    if (documentsDrawerOpen) {
        if (typeof setLibraryDrawerOpen === 'function') setLibraryDrawerOpen(false, { immediate: true });
        if (typeof setProjectsDrawerOpen === 'function') setProjectsDrawerOpen(false, { immediate: true });
        documentsDrawerReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : toggle;
        drawer.hidden = false;
        renderAllDocuments();
        requestAnimationFrame(() => {
            drawer.classList.add('is-open');
            drawer.querySelector('.documents-drawer-close')?.focus({ preventScroll: true });
        });
        return;
    }

    drawer.classList.remove('is-open');
    const finishClose = () => {
        if (documentsDrawerOpen) return;
        drawer.hidden = true;
        if (documentsDrawerReturnFocus && document.contains(documentsDrawerReturnFocus)) {
            documentsDrawerReturnFocus.focus({ preventScroll: true });
        }
        documentsDrawerReturnFocus = null;
    };
    if (immediate) finishClose();
    else documentsDrawerCloseTimer = setTimeout(finishClose, 340);
}

function trapDocumentsDrawerFocus(event) {
    if (!documentsDrawerOpen || event.key !== 'Tab') return;
    if (document.body.classList.contains('admin-studio-open')) return;
    const globalOverlay = document.getElementById('global-modal');
    if (globalOverlay && !globalOverlay.classList.contains('hidden')) return;
    const panel = document.querySelector('.documents-drawer-panel');
    if (!panel) return;
    const focusable = [...panel.querySelectorAll('button:not([disabled]), a[href]:not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])')]
        .filter(element => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

function bindDocumentsUi() {
    const drawer = getDocumentsDrawer();
    const openButton = document.getElementById('documents-open-all');
    if (openButton && !openButton.dataset.documentsBound) {
        openButton.dataset.documentsBound = 'true';
        openButton.addEventListener('click', () => {
            setDocumentsDrawerOpen(true);
            playClickSound();
        });
    }

    if (drawer && !drawer.dataset.documentsBound) {
        drawer.dataset.documentsBound = 'true';
        drawer.querySelectorAll('[data-documents-close]').forEach(button => {
            button.addEventListener('click', () => setDocumentsDrawerOpen(false));
        });
    }

    if (!document.documentElement.dataset.documentsKeyboardBound) {
        document.documentElement.dataset.documentsKeyboardBound = 'true';
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && documentsDrawerOpen) {
                const globalOverlay = document.getElementById('global-modal');
                if (!globalOverlay || globalOverlay.classList.contains('hidden')) {
                    event.preventDefault();
                    setDocumentsDrawerOpen(false);
                }
                return;
            }
            trapDocumentsDrawerFocus(event);
        });
    }
}

function getDocumentDownloadName(documentItem, sourceKind) {
    const baseName = String(documentItem?.title || 'Dokument')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'dokument';
    const suffix = sourceKind === 'original' ? '-original' : '';
    const extension = String(documentItem?.ext || 'pdf').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'pdf';
    return `${baseName}${suffix}.${extension}`;
}

function downloadDocumentFile(documentId, sourceKind = 'primary') {
    const documentItem = findItemByTypeAndId('document', documentId);
    if (!documentItem) return;
    const sourceUrl = getDocumentSource(documentItem, sourceKind);
    if (!sourceUrl) {
        showToast(sourceKind === 'original'
            ? 'Für dieses Dokument wurde noch kein Original hinterlegt.'
            : 'Für dieses Dokument wurde noch keine Datei hinterlegt.');
        return;
    }

    const anchor = document.createElement('a');
    anchor.href = sourceUrl;
    anchor.download = getDocumentDownloadName(documentItem, sourceKind);
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
}

function renderDocumentViewerMedia(documentItem, sourceUrl, sourceKind) {
    const previewImage = sourceKind === 'primary' ? getSafeImageUrl(documentItem?.img) : '';
    const mediaUrl = sourceUrl || previewImage;
    const title = `${documentItem?.title || 'Dokument'}${sourceKind === 'original' ? ' – Original' : ''}`;
    const isImage = (previewImage && !sourceUrl)
        || /\.(?:png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i.test(mediaUrl)
        || /^data:image\//i.test(mediaUrl);
    if (isImage) {
        return `<img src="${escapeHtml(mediaUrl)}" alt="${escapeHtml(title)}" class="document-viewer-image">`;
    }
    return `
        <object data="${escapeHtml(mediaUrl)}" type="application/pdf" class="document-viewer-frame" aria-label="${escapeHtml(title)}">
            <p>Dieses Dokument kann im eingebauten Viewer nicht angezeigt werden.</p>
        </object>
    `;
}

function openDocumentViewer(documentId, sourceKind = 'primary') {
    const documentItem = findItemByTypeAndId('document', documentId);
    if (!documentItem) return;
    const normalizedKind = sourceKind === 'original' ? 'original' : 'primary';
    const sourceUrl = getDocumentSource(documentItem, normalizedKind);
    const previewImage = normalizedKind === 'primary' ? getSafeImageUrl(documentItem.img) : '';
    if (!sourceUrl && !previewImage) {
        showToast(normalizedKind === 'original'
            ? 'Für dieses Dokument wurde noch kein Original hinterlegt.'
            : 'Für dieses Dokument wurde noch keine Datei hinterlegt.');
        return;
    }

    if (documentsDrawerOpen) setDocumentsDrawerOpen(false, { immediate: true });
    const id = encodeInlineId(documentItem.id);
    const content = getDocumentsContent();
    const originalSwitch = documentItem.hasOriginal && normalizedKind === 'primary'
        ? `<button type="button" class="document-action" onclick="openDocumentViewer(decodeURIComponent('${id}'), 'original'); playClickSound();" aria-label="${escapeHtml(content.originalLabel)} ${escapeHtml(content.viewLabel)}"><i data-lucide="languages" aria-hidden="true"></i><span>${escapeHtml(content.originalLabel)}</span></button>`
        : '';
    const translatedSwitch = normalizedKind === 'original'
        ? `<button type="button" class="document-action" onclick="openDocumentViewer(decodeURIComponent('${id}'), 'primary'); playClickSound();" aria-label="${escapeHtml(content.translationLabel)} ${escapeHtml(content.viewLabel)}"><i data-lucide="languages" aria-hidden="true"></i><span>${escapeHtml(content.translationLabel)}</span></button>`
        : '';

    showModal(`
        <article class="document-viewer">
            <header class="document-viewer-header">
                <div class="document-viewer-heading">
                    <span>${normalizedKind === 'original' ? escapeHtml(content.originalLabel) : escapeHtml(documentItem.ext || 'Dokument')}</span>
                    <h3>${escapeHtml(documentItem.title || 'Dokument')}</h3>
                </div>
                <div class="document-viewer-toolbar">
                    ${originalSwitch}
                    ${translatedSwitch}
                    <button type="button" class="document-action" onclick="downloadDocumentFile(decodeURIComponent('${id}'), '${normalizedKind}'); playClickSound();" aria-label="Dokument ${escapeHtml(content.downloadLabel)}"><i data-lucide="download" aria-hidden="true"></i><span>${escapeHtml(content.downloadLabel)}</span></button>
                    <button type="button" class="documents-icon-button" onclick="closeModal(); playClickSound();" aria-label="Dokument schließen"><i data-lucide="x" aria-hidden="true"></i></button>
                </div>
            </header>
            <div class="document-viewer-body">
                ${renderDocumentViewerMedia(documentItem, sourceUrl, normalizedKind)}
            </div>
        </article>
    `);
    document.getElementById('modal-container')?.classList.add('document-viewer-modal-host');
    refreshIcons();
}
