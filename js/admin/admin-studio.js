/* Lazy-loaded, schema-oriented Admin Studio. Normal browsing does not mount this UI. */
(function initializeAdminStudio() {
    'use strict';

    if (window.AdminStudio) return;

    const sections = new Map();
    const uiState = {
        adminEnabled: false,
        root: null,
        panel: null,
        tabList: null,
        body: null,
        saveButton: null,
        dirtyBadge: null,
        status: null,
        activeSectionId: '',
        activeTabId: '',
        draft: null,
        original: null,
        dirty: false,
        previewFrame: 0,
        selectedItems: new Map(),
        filters: new Map(),
        pendingImage: false,
        uploadToken: 0,
        returnFocus: null
    };

    function clone(value) {
        return typeof cloneData === 'function'
            ? cloneData(value)
            : JSON.parse(JSON.stringify(value));
    }

    function esc(value) {
        return typeof escapeHtml === 'function'
            ? escapeHtml(value)
            : String(value ?? '').replace(/[&<>"']/g, character => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
            }[character]));
    }

    function createId(prefix) {
        const randomPart = Math.random().toString(36).slice(2, 7);
        return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
    }

    function pathParts(path) {
        return String(path || '').split('.').filter(Boolean).map(part => /^\d+$/.test(part) ? Number(part) : part);
    }

    function getAtPath(source, path) {
        return pathParts(path).reduce((current, part) => current?.[part], source);
    }

    function setAtPath(source, path, value) {
        const parts = pathParts(path);
        if (!parts.length) return;
        let current = source;
        parts.slice(0, -1).forEach((part, index) => {
            const nextPart = parts[index + 1];
            if (!current[part] || typeof current[part] !== 'object') {
                current[part] = typeof nextPart === 'number' ? [] : {};
            }
            current = current[part];
        });
        current[parts[parts.length - 1]] = value;
    }

    function getActiveSection() {
        return sections.get(uiState.activeSectionId) || null;
    }

    function getCollection(path) {
        const collection = getAtPath(uiState.draft, path);
        return Array.isArray(collection) ? collection : [];
    }

    function setStudioStatus(message, tone = '') {
        if (!uiState.status) return;
        uiState.status.textContent = message || '';
        uiState.status.dataset.tone = tone;
    }

    function updateDirtyState() {
        uiState.root?.classList.toggle('is-dirty', uiState.dirty);
        if (uiState.saveButton) uiState.saveButton.disabled = !uiState.dirty || uiState.pendingImage;
        if (uiState.dirtyBadge) {
            uiState.dirtyBadge.textContent = uiState.dirty ? 'Nicht gespeichert' : 'Gespeichert';
            uiState.dirtyBadge.dataset.state = uiState.dirty ? 'dirty' : 'saved';
        }
    }

    function schedulePreview() {
        window.cancelAnimationFrame(uiState.previewFrame);
        uiState.previewFrame = window.requestAnimationFrame(() => {
            uiState.previewFrame = 0;
            const section = getActiveSection();
            section?.preview?.(uiState.draft);
        });
    }

    function cancelPreview() {
        window.cancelAnimationFrame(uiState.previewFrame);
        uiState.previewFrame = 0;
        uiState.uploadToken += 1;
        uiState.pendingImage = false;
    }

    function markDirty(message = 'Vorschau aktualisiert – noch nicht gespeichert.') {
        uiState.dirty = true;
        updateDirtyState();
        setStudioStatus(message, 'pending');
        schedulePreview();
    }

    function registerSection(config) {
        if (!config || !config.id || typeof config.getData !== 'function' || typeof config.preview !== 'function') {
            throw new Error('Ungültige Admin-Studio-Sektion.');
        }
        sections.set(config.id, config);
    }

    function mount() {
        if (uiState.root) return;
        const root = document.createElement('div');
        root.id = 'admin-studio';
        root.className = 'admin-studio hidden';
        root.setAttribute('aria-hidden', 'true');
        root.innerHTML = `
            <aside class="admin-studio-panel" role="dialog" aria-modal="false" aria-labelledby="admin-studio-title">
                <header class="admin-studio-header">
                    <div class="admin-studio-brand">
                        <span class="admin-studio-brand-icon"><i data-lucide="sliders-horizontal"></i></span>
                        <span>
                            <strong id="admin-studio-title">Admin Studio</strong>
                            <small id="admin-studio-section-label">Sektion</small>
                        </span>
                    </div>
                    <div class="admin-studio-header-actions">
                        <span class="admin-studio-dirty-badge" data-state="saved">Gespeichert</span>
                        <button type="button" class="admin-studio-icon-btn" data-admin-action="close" aria-label="Admin Studio schließen">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                </header>
                <nav class="admin-studio-tabs" role="tablist" aria-label="Bearbeitungsbereiche"></nav>
                <div class="admin-studio-body" role="tabpanel"></div>
                <footer class="admin-studio-footer">
                    <p class="admin-studio-status" aria-live="polite">Bereit.</p>
                    <div class="admin-studio-footer-actions">
                        <button type="button" class="admin-studio-button is-secondary" data-admin-action="cancel">Verwerfen</button>
                        <button type="button" class="admin-studio-button is-primary" data-admin-action="save" disabled>
                            <i data-lucide="save"></i> Speichern
                        </button>
                    </div>
                </footer>
            </aside>
        `;
        document.body.appendChild(root);
        uiState.root = root;
        uiState.panel = root.querySelector('.admin-studio-panel');
        uiState.tabList = root.querySelector('.admin-studio-tabs');
        uiState.body = root.querySelector('.admin-studio-body');
        uiState.saveButton = root.querySelector('[data-admin-action="save"]');
        uiState.dirtyBadge = root.querySelector('.admin-studio-dirty-badge');
        uiState.status = root.querySelector('.admin-studio-status');
        root.addEventListener('click', handleClick);
        root.addEventListener('input', handleInput);
        root.addEventListener('change', handleChange);
        root.addEventListener('keydown', handleStudioKeydown);
        refreshIcons();
    }

    function renderTabs(section) {
        uiState.tabList.style.setProperty('--admin-tab-count', String(Math.max(section.tabs.length, 1)));
        uiState.tabList.innerHTML = section.tabs.map(tab => {
            const active = tab.id === uiState.activeTabId;
            return `
                <button type="button" role="tab" aria-selected="${active}" class="admin-studio-tab${active ? ' is-active' : ''}" data-admin-action="tab" data-tab-id="${esc(tab.id)}">
                    <i data-lucide="${esc(tab.icon || 'circle')}"></i>
                    <span>${esc(tab.label)}</span>
                </button>
            `;
        }).join('');
    }

    function renderActiveTab({ preserveScroll = false } = {}) {
        const section = getActiveSection();
        if (!section || !uiState.body) return;
        const previousScroll = preserveScroll ? uiState.body.scrollTop : 0;
        uiState.body.innerHTML = section.renderTab(uiState.activeTabId, uiState.draft);
        uiState.body.querySelectorAll('[data-admin-filter]').forEach(input => {
            input.value = uiState.filters.get(`${section.id}:${input.dataset.adminFilter}`) || '';
            filterCollectionEntries(input);
        });
        if (preserveScroll) uiState.body.scrollTop = previousScroll;
        refreshIcons();
    }

    function open(sectionId, options = {}) {
        if (!uiState.adminEnabled) return;
        const section = sections.get(sectionId) || sections.values().next().value;
        if (!section) return;
        mount();

        if (uiState.activeSectionId && uiState.activeSectionId !== section.id && uiState.dirty) {
            if (!window.confirm('Ungespeicherte Änderungen verwerfen und die andere Sektion öffnen?')) return;
            cancelPreview();
            getActiveSection()?.preview?.(uiState.original);
        }

        const isNewSession = uiState.activeSectionId !== section.id || !document.body.classList.contains('admin-studio-open');
        if (isNewSession) {
            cancelPreview();
            uiState.returnFocus = document.activeElement;
        }
        uiState.activeSectionId = section.id;
        uiState.root.dataset.section = section.id;
        if (isNewSession) {
            const normalized = section.normalize ? section.normalize(section.getData()) : clone(section.getData());
            uiState.original = clone(normalized);
            uiState.draft = clone(normalized);
            uiState.activeTabId = section.tabs[0]?.id || '';
            uiState.selectedItems.clear();
            uiState.filters.clear();
            uiState.dirty = false;
        }

        if (options.itemId) {
            const itemId = String(options.itemId);
            uiState.selectedItems.set(section.itemCollection || (section.id === 'projects' ? 'items' : section.id), itemId);
            if (section.id === 'projects') uiState.selectedItems.set('project-scope', itemId);
        }
        if (options.tabId && section.tabs.some(tab => tab.id === options.tabId)) {
            uiState.activeTabId = options.tabId;
        }
        const opening = section.onOpen?.(uiState.draft, options, uiState);
        if (opening?.dirty) markDirty(opening.message);

        const label = uiState.root.querySelector('#admin-studio-section-label');
        if (label) label.textContent = section.label;
        renderTabs(section);
        renderActiveTab();
        updateDirtyState();
        setStudioStatus('Änderungen werden zuerst nur als Vorschau gezeigt.', 'info');
        uiState.root.classList.remove('hidden');
        uiState.root.setAttribute('aria-hidden', 'false');
        document.body.classList.add('admin-studio-open');
        requestAnimationFrame(() => uiState.root.classList.add('is-open'));
        setTimeout(() => {
            if (!document.body.classList.contains('admin-studio-open')) return;
            const target = (options.itemId || options.newBook || options.newDocument || options.newPost)
                ? uiState.body.querySelector('.admin-item-editor [data-admin-path]')
                : options.position ? uiState.body.querySelector(`[data-admin-${section.id === 'documents' ? 'document' : 'library'}-slot="${Number(options.position)}"]`) : null;
            (target || uiState.root.querySelector('.admin-studio-tab.is-active'))?.focus({ preventScroll: !target });
        }, 30);
    }

    function close({ discard = true } = {}) {
        if (!uiState.root || uiState.root.classList.contains('hidden')) return;
        if (discard && uiState.dirty) {
            const shouldDiscard = window.confirm('Ungespeicherte Änderungen wirklich verwerfen?');
            if (!shouldDiscard) return;
            cancelPreview();
            getActiveSection()?.preview?.(uiState.original);
        }
        cancelPreview();
        uiState.dirty = false;
        updateDirtyState();
        uiState.root.classList.remove('is-open');
        document.body.classList.remove('admin-studio-open');
        if (uiState.returnFocus?.isConnected) uiState.returnFocus.focus({ preventScroll: true });
        setTimeout(() => {
            if (uiState.root?.classList.contains('is-open')) return;
            uiState.root?.classList.add('hidden');
            uiState.root?.setAttribute('aria-hidden', 'true');
        }, 220);
    }

    function save() {
        const section = getActiveSection();
        if (!section || !uiState.dirty || uiState.pendingImage) return;
        const validation = section.validate?.(uiState.draft);
        if (validation) {
            if (validation.itemId) uiState.selectedItems.set(section.itemCollection || 'items', String(validation.itemId));
            if (validation.tabId) uiState.activeTabId = validation.tabId;
            uiState.filters.clear();
            renderTabs(section);
            renderActiveTab();
            setStudioStatus(validation.message, 'error');
            [...uiState.body.querySelectorAll('[data-admin-path]')].find(input => input.dataset.adminPath === validation.path)?.focus();
            return;
        }
        window.cancelAnimationFrame(uiState.previewFrame);
        uiState.previewFrame = 0;
        section.preview(uiState.draft);
        const saved = section.commit ? section.commit(uiState.draft) : false;
        if (!saved) {
            setStudioStatus('Speichern fehlgeschlagen. Die Vorschau bleibt geöffnet.', 'error');
            return;
        }
        const normalized = section.normalize ? section.normalize(section.getData()) : clone(section.getData());
        uiState.original = clone(normalized);
        uiState.draft = clone(normalized);
        uiState.dirty = false;
        updateDirtyState();
        renderActiveTab({ preserveScroll: true });
        setStudioStatus('Änderungen lokal gespeichert.', 'success');
        showToast('Änderungen wurden gespeichert.', 'success');
    }

    function cancel() {
        if (!uiState.dirty) {
            close({ discard: false });
            return;
        }
        const shouldDiscard = window.confirm('Alle Änderungen dieser Bearbeitung verwerfen?');
        if (!shouldDiscard) return;
        cancelPreview();
        getActiveSection()?.preview?.(uiState.original);
        uiState.draft = clone(uiState.original);
        uiState.dirty = false;
        updateDirtyState();
        close({ discard: false });
    }

    function setAdminMode(enabled) {
        uiState.adminEnabled = Boolean(enabled);
        if (!uiState.adminEnabled) {
            cancelPreview();
            if (uiState.dirty) getActiveSection()?.preview?.(uiState.original);
            close({ discard: false });
            uiState.dirty = false;
            updateDirtyState();
        }
    }

    function valueFromInput(input) {
        if (input.type === 'checkbox') return input.checked;
        if (input.dataset.valueType === 'nullable-number') return input.value === '' ? null : Number(input.value);
        if (input.dataset.valueType === 'number' || input.type === 'range' || input.type === 'number') {
            return Number(input.value);
        }
        if (input.dataset.valueType === 'tags') {
            return input.value.split(',').map(value => value.trim()).filter(Boolean).slice(0, 8);
        }
        return input.value;
    }

    function filterCollectionEntries(input) {
        const needle = input.value.trim().toLocaleLowerCase('de-DE');
        uiState.body.querySelectorAll(`[data-admin-filter-item="${input.dataset.adminFilter}"]`).forEach(item => {
            item.hidden = Boolean(needle && !String(item.dataset.searchText || '').includes(needle));
        });
    }

    function handleInput(event) {
        const filter = event.target.closest('[data-admin-filter]');
        if (filter) {
            uiState.filters.set(`${uiState.activeSectionId}:${filter.dataset.adminFilter}`, filter.value);
            filterCollectionEntries(filter);
            return;
        }

        const input = event.target.closest('[data-admin-path]');
        if (!input || !uiState.draft) return;
        setAtPath(uiState.draft, input.dataset.adminPath, valueFromInput(input));
        getActiveSection()?.afterInput?.(input, uiState.draft);
        if (input.type === 'range') {
            const output = [...uiState.body.querySelectorAll('[data-range-output]')]
                .find(candidate => candidate.dataset.rangeOutput === input.dataset.adminPath);
            if (output) output.textContent = `${input.value}${input.dataset.unit || ''}`;
        }
        markDirty();
        if (input.type === 'checkbox') {
            requestAnimationFrame(() => renderActiveTab({ preserveScroll: true }));
        }
    }

    async function handleChange(event) {
        if (getActiveSection()?.handleChange?.(event, uiState.draft)) return;
        const projectScope = event.target.closest('[data-admin-project-scope]');
        if (projectScope) {
            uiState.selectedItems.set('project-scope', projectScope.value);
            renderActiveTab({ preserveScroll: true });
            return;
        }

        const upload = event.target.closest('[data-admin-social-qr], [data-admin-education-image], [data-admin-project-image]');
        if (!upload || !upload.files?.[0]) return;
        upload.disabled = true;
        try {
            const optimizedImage = await optimizeImageFile(upload.files[0], upload.matches('[data-admin-project-image]') ? 1600 : 1280, 0.84);
            if (upload.matches('[data-admin-social-qr]')) {
                const index = Number(upload.dataset.adminSocialQr);
                const social = uiState.draft?.contact?.socials?.[index];
                if (!social) return;
                social.qrImage = optimizedImage;
                markDirty('QR-Bild vorbereitet – noch nicht gespeichert.');
            } else if (upload.matches('[data-admin-education-image]')) {
                const itemIndex = Number(upload.dataset.adminEducationImage);
                const evidenceIndex = Number(upload.dataset.evidenceIndex);
                const evidence = uiState.draft?.items?.[itemIndex]?.evidence?.[evidenceIndex];
                if (!evidence) return;
                evidence.type = 'image';
                evidence.url = optimizedImage;
                markDirty('Bildnachweis vorbereitet – noch nicht gespeichert.');
            } else {
                const path = upload.dataset.adminProjectImage;
                if (!path) return;
                setAtPath(uiState.draft, path, optimizedImage);
                markDirty('Projektbild vorbereitet – noch nicht gespeichert.');
            }
            renderActiveTab({ preserveScroll: true });
            showToast('Bild wurde optimiert und vorbereitet.', 'success');
        } catch (error) {
            showToast(error.message || 'Bild konnte nicht verarbeitet werden.', 'error');
        } finally {
            upload.disabled = false;
            upload.value = '';
        }
    }

    function handleClick(event) {
        const button = event.target.closest('[data-admin-action]');
        if (!button) return;
        const action = button.dataset.adminAction;

        if (action === 'close') return close();
        if (action === 'cancel') return cancel();
        if (action === 'save') return save();
        if (action === 'tab') {
            uiState.activeTabId = button.dataset.tabId;
            renderTabs(getActiveSection());
            renderActiveTab();
            return;
        }

        const section = getActiveSection();
        if (!section?.handleAction) return;
        const result = section.handleAction(action, button, uiState.draft, uiState);
        if (!result) return;
        if (result.dirty !== false) markDirty(result.message);
        if (result.render !== false) renderActiveTab({ preserveScroll: result.preserveScroll !== false });
        if (section.id === 'library' || section.id === 'documents' || section.id === 'blog') {
            const target = ['add-collection', 'edit-library-favorite', 'edit-document-featured', 'edit-blog-featured', 'edit-collection'].includes(action)
                ? uiState.body.querySelector('.admin-item-editor [data-admin-path]')
                : [...uiState.body.querySelectorAll('[data-admin-action]')].find(candidate =>
                    candidate.dataset.adminAction === action && candidate.dataset.itemId === button.dataset.itemId);
            (target || uiState.body.querySelector('[data-admin-action="add-collection"]'))?.focus({ preventScroll: !target });
        }
    }

    function handleStudioKeydown(event) {
        const currentTab = event.target.closest('[role="tab"]');
        if (!currentTab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const tabs = [...uiState.tabList.querySelectorAll('[role="tab"]')];
        const currentIndex = tabs.indexOf(currentTab);
        let nextIndex = currentIndex;
        if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        event.preventDefault();
        tabs[nextIndex]?.click();
        requestAnimationFrame(() => uiState.tabList.querySelector(`[data-tab-id="${tabs[nextIndex]?.dataset.tabId}"]`)?.focus());
    }

    window.AdminStudio = {
        registerSection, open, close, setAdminMode,
        hasUnsavedChanges: () => uiState.dirty || uiState.pendingImage
    };

    window.addEventListener('keydown', event => {
        if (event.key === 'Escape' && uiState.root && !uiState.root.classList.contains('hidden')) {
            event.stopPropagation();
            close();
        }
    }, true);

    function field({ label, path, value = '', type = 'text', valueType = '', help = '', placeholder = '', min, max, step, unit = '', wide = false }) {
        const id = `admin-field-${path.replace(/[^a-z0-9]+/gi, '-')}`;
        const inputAttributes = [
            `id="${esc(id)}"`,
            `data-admin-path="${esc(path)}"`,
            `type="${esc(type)}"`,
            `value="${esc(value)}"`,
            valueType ? `data-value-type="${esc(valueType)}"` : '',
            placeholder ? `placeholder="${esc(placeholder)}"` : '',
            Number.isFinite(min) ? `min="${min}"` : '',
            Number.isFinite(max) ? `max="${max}"` : '',
            Number.isFinite(step) ? `step="${step}"` : ''
        ].filter(Boolean).join(' ');
        return `
            <label class="admin-field${wide ? ' is-wide' : ''}" for="${esc(id)}">
                <span class="admin-field-label">${esc(label)}</span>
                <input ${inputAttributes}>
                ${help ? `<small>${esc(help)}</small>` : ''}
            </label>
        `;
    }

    function textareaField({ label, path, value = '', rows = 4, help = '', wide = true }) {
        const id = `admin-field-${path.replace(/[^a-z0-9]+/gi, '-')}`;
        return `
            <label class="admin-field${wide ? ' is-wide' : ''}" for="${esc(id)}">
                <span class="admin-field-label">${esc(label)}</span>
                <textarea id="${esc(id)}" data-admin-path="${esc(path)}" rows="${rows}">${esc(value)}</textarea>
                ${help ? `<small>${esc(help)}</small>` : ''}
            </label>
        `;
    }

    function selectField({ label, path, value = '', options = [], wide = false }) {
        const id = `admin-field-${path.replace(/[^a-z0-9]+/gi, '-')}`;
        return `
            <label class="admin-field${wide ? ' is-wide' : ''}" for="${esc(id)}">
                <span class="admin-field-label">${esc(label)}</span>
                <select id="${esc(id)}" data-admin-path="${esc(path)}">
                    ${options.map(option => `<option value="${esc(option.value)}" ${String(option.value) === String(value) ? 'selected' : ''}>${esc(option.label)}</option>`).join('')}
                </select>
            </label>
        `;
    }

    function checkboxField({ label, path, checked = false, help = '' }) {
        const id = `admin-field-${path.replace(/[^a-z0-9]+/gi, '-')}`;
        return `
            <label class="admin-check" for="${esc(id)}">
                <input id="${esc(id)}" data-admin-path="${esc(path)}" type="checkbox" ${checked ? 'checked' : ''}>
                <span><strong>${esc(label)}</strong>${help ? `<small>${esc(help)}</small>` : ''}</span>
            </label>
        `;
    }

    function sectionBlock(title, description, content, className = '') {
        return `
            <section class="admin-editor-section ${esc(className)}">
                <header class="admin-editor-section-head">
                    <div><h3>${esc(title)}</h3>${description ? `<p>${esc(description)}</p>` : ''}</div>
                </header>
                ${content}
            </section>
        `;
    }

    function rangeField({ label, path, value, min, max, step = 1, unit = 'px', help = '' }) {
        return `
            <label class="admin-range-field">
                <span class="admin-range-head"><strong>${esc(label)}</strong><output data-range-output="${esc(path)}">${esc(value)}${esc(unit)}</output></span>
                <input type="range" min="${min}" max="${max}" step="${step}" value="${esc(value)}" data-admin-path="${esc(path)}" data-value-type="number" data-unit="${esc(unit)}">
                ${help ? `<small>${esc(help)}</small>` : ''}
            </label>
        `;
    }

    function getSelectedItemId(collectionPath) {
        return uiState.selectedItems.get(collectionPath) || '';
    }

    function renderCollectionManager({
        title,
        description = '',
        collectionPath,
        items,
        addLabel,
        nameForItem,
        detailForItem,
        editorForItem,
        homepageIdsKey = '',
        filterable = false,
        reorderable = true,
        emptyLabel = 'Noch keine Einträge vorhanden.'
    }) {
        const selectedId = getSelectedItemId(collectionPath);
        const homepageIds = homepageIdsKey && Array.isArray(uiState.draft?.[homepageIdsKey])
            ? uiState.draft[homepageIdsKey].map(String)
            : [];
        const filterId = collectionPath.replace(/[^a-z0-9]+/gi, '-');
        const rows = items.map((item, index) => {
            const itemId = String(item.id || '');
            const selected = itemId === selectedId;
            const itemName = nameForItem(item, index) || `Eintrag ${index + 1}`;
            const detail = detailForItem ? detailForItem(item, index) : '';
            const featured = homepageIds.includes(itemId);
            const searchText = `${itemName} ${detail}`.toLocaleLowerCase('de-DE');
            return `
                <div class="admin-collection-entry" data-admin-filter-item="${esc(filterId)}" data-search-text="${esc(searchText)}">
                    <div class="admin-collection-row${selected ? ' is-selected' : ''}">
                        <span class="admin-collection-index">${String(index + 1).padStart(2, '0')}</span>
                        <button type="button" class="admin-collection-main" data-admin-action="edit-collection" data-collection="${esc(collectionPath)}" data-item-id="${esc(itemId)}">
                            <strong>${esc(itemName)}</strong>
                            ${detail ? `<small>${esc(detail)}</small>` : ''}
                        </button>
                        ${homepageIdsKey ? `<button type="button" class="admin-row-toggle${featured ? ' is-active' : ''}" data-admin-action="toggle-home" data-collection="${esc(collectionPath)}" data-item-id="${esc(itemId)}" data-home-key="${esc(homepageIdsKey)}" aria-label="${featured ? 'Von der Übersicht entfernen' : 'Auf der Übersicht anzeigen'}" title="${featured ? 'Auf Übersicht sichtbar' : 'Nicht auf Übersicht'}"><i data-lucide="${featured ? 'eye' : 'eye-off'}"></i></button>` : ''}
                        <div class="admin-row-actions">
                            ${reorderable ? `<button type="button" data-admin-action="move-collection" data-collection="${esc(collectionPath)}" data-item-id="${esc(itemId)}" data-direction="-1" aria-label="Nach oben" ${index === 0 ? 'disabled' : ''}><i data-lucide="chevron-up"></i></button>
                            <button type="button" data-admin-action="move-collection" data-collection="${esc(collectionPath)}" data-item-id="${esc(itemId)}" data-direction="1" aria-label="Nach unten" ${index === items.length - 1 ? 'disabled' : ''}><i data-lucide="chevron-down"></i></button>` : ''}
                            <button type="button" class="is-danger" data-admin-action="delete-collection" data-collection="${esc(collectionPath)}" data-item-id="${esc(itemId)}" aria-label="Löschen"><i data-lucide="trash-2"></i></button>
                        </div>
                    </div>
                    ${selected ? `<div class="admin-item-editor">${editorForItem(item, index, collectionPath)}</div>` : ''}
                </div>
            `;
        }).join('');

        return sectionBlock(title, description, `
            <div class="admin-collection-toolbar">
                ${filterable ? `<label class="admin-search"><i data-lucide="search"></i><input type="search" data-admin-filter="${esc(filterId)}" placeholder="Suchen…"></label>` : '<span></span>'}
                <button type="button" class="admin-inline-add" data-admin-action="add-collection" data-collection="${esc(collectionPath)}"><i data-lucide="plus"></i>${esc(addLabel)}</button>
            </div>
            <div class="admin-collection-list">${rows || `<p class="admin-empty-state">${esc(emptyLabel)}</p>`}</div>
        `);
    }

    function renderContentTab(draft) {
        const content = draft.content || {};
        const labels = [
            ['Seitentitel', 'sectionTitle'],
            ['Profil-Überschrift', 'profileTitle'],
            ['„Mehr“-Button', 'moreButtonLabel'],
            ['Fokus-Überschrift', 'focusLabel'],
            ['Fakten-Überschrift', 'factsTitle'],
            ['Prinzipien-Überschrift', 'principlesTitle'],
            ['Prinzipien-Button', 'principlesButtonLabel'],
            ['Fähigkeiten-Überschrift', 'skillsTitle'],
            ['Fähigkeiten-Button', 'skillsButtonLabel'],
            ['Titel im Profil-Drawer', 'drawerTitle'],
            ['Kennzeichnung im Profil-Drawer', 'drawerKicker'],
            ['Titel der Prinzipien-Ansicht', 'principlesDrawerTitle'],
            ['Titel der Fähigkeiten-Ansicht', 'skillsDrawerTitle']
        ].map(([label, key]) => field({ label, path: `content.${key}`, value: content[key] })).join('');

        const intro = sectionBlock('Kurzprofil', 'Die kurze Version steht direkt auf der Seite, die lange Version im „Mehr“-Drawer.', `
            <div class="admin-field-grid">
                ${textareaField({ label: 'Kurzer Text', path: 'introShort', value: draft.introShort, rows: 4 })}
                ${textareaField({ label: 'Erweiterter Text', path: 'introFull', value: draft.introFull, rows: 6 })}
            </div>
        `);

        const focusSlides = renderCollectionManager({
            title: 'Fokus-Slider',
            description: 'Diese Einträge wechseln automatisch. Ein bis fünf kurze Aussagen funktionieren am besten.',
            collectionPath: 'focusSlides',
            items: draft.focusSlides || [],
            addLabel: 'Fokus hinzufügen',
            nameForItem: item => item.title,
            detailForItem: item => item.text,
            editorForItem: (item, index) => `
                <div class="admin-field-grid">
                    ${field({ label: 'Titel', path: `focusSlides.${index}.title`, value: item.title, wide: true })}
                    ${textareaField({ label: 'Text', path: `focusSlides.${index}.text`, value: item.text, rows: 3 })}
                    ${field({ label: 'Lucide-Icon', path: `focusSlides.${index}.icon`, value: item.icon, help: 'Zum Beispiel: cpu, workflow, brain' })}
                </div>
            `
        });

        const facts = renderCollectionManager({
            title: 'Kurz & wichtig',
            description: 'Fakten können frei sortiert, ergänzt und mit einer Aktion verbunden werden.',
            collectionPath: 'facts',
            items: draft.facts || [],
            addLabel: 'Fakt hinzufügen',
            nameForItem: item => item.label,
            detailForItem: item => item.value,
            editorForItem: (item, index) => `
                <div class="admin-field-grid">
                    ${field({ label: 'Bezeichnung', path: `facts.${index}.label`, value: item.label })}
                    ${field({ label: 'Wert', path: `facts.${index}.value`, value: item.value, wide: true })}
                    ${field({ label: 'Lucide-Icon', path: `facts.${index}.icon`, value: item.icon })}
                    ${selectField({
                        label: 'Aktion beim Anklicken',
                        path: `facts.${index}.action`,
                        value: item.action || '',
                        options: [
                            { value: '', label: 'Keine Aktion' },
                            { value: 'location', label: 'Standort öffnen' },
                            { value: 'contact', label: 'Kontakte öffnen' }
                        ]
                    })}
                </div>
            `
        });

        const moreSections = renderCollectionManager({
            title: 'Inhalt im „Mehr“-Drawer',
            description: 'Jeder Abschnitt besitzt eine Navigation, Überschrift und einen eigenen Text.',
            collectionPath: 'moreSections',
            items: draft.moreSections || [],
            addLabel: 'Abschnitt hinzufügen',
            nameForItem: item => item.navLabel || item.title,
            detailForItem: item => item.title,
            editorForItem: (item, index) => `
                <div class="admin-field-grid">
                    ${field({ label: 'Navigation', path: `moreSections.${index}.navLabel`, value: item.navLabel })}
                    ${field({ label: 'Überschrift', path: `moreSections.${index}.title`, value: item.title })}
                    ${field({ label: 'Lucide-Icon', path: `moreSections.${index}.icon`, value: item.icon })}
                    ${checkboxField({ label: 'Texte aus dem Kurzprofil verwenden', path: `moreSections.${index}.useIntro`, checked: item.useIntro === true })}
                    ${item.useIntro ? '' : textareaField({ label: 'Text', path: `moreSections.${index}.body`, value: item.body, rows: 5 })}
                </div>
            `
        });

        return `
            ${sectionBlock('Überschriften & Buttons', 'Alle sichtbaren Bezeichnungen dieses Bereichs sind hier zentral editierbar.', `<div class="admin-field-grid">${labels}</div>`)}
            ${intro}
            ${focusSlides}
            ${facts}
            ${moreSections}
        `;
    }

    function renderPrinciplesTab(draft) {
        return renderCollectionManager({
            title: 'Werte & Prinzipien',
            description: 'Alle Einträge bleiben in deiner Hand. Das Auge bestimmt nur, was zusätzlich in der kompakten Übersicht erscheint.',
            collectionPath: 'principles',
            items: draft.principles || [],
            addLabel: 'Prinzip hinzufügen',
            nameForItem: item => item.title,
            detailForItem: item => item.desc,
            homepageIdsKey: 'homepagePrincipleIds',
            filterable: true,
            editorForItem: (item, index) => `
                <div class="admin-field-grid">
                    ${field({ label: 'Titel', path: `principles.${index}.title`, value: item.title })}
                    ${field({ label: 'Lucide-Icon', path: `principles.${index}.icon`, value: item.icon, help: 'Nur der Icon-Name, zum Beispiel shield-check.' })}
                    ${textareaField({ label: 'Persönliche Beschreibung', path: `principles.${index}.desc`, value: item.desc, rows: 4 })}
                </div>
            `
        });
    }

    function renderEvidenceEditor(skill, skillIndex) {
        const evidence = Array.isArray(skill.evidence) ? skill.evidence : [];
        const entries = evidence.map((item, index) => `
            <div class="admin-nested-card">
                <div class="admin-nested-head">
                    <strong>Nachweis ${index + 1}</strong>
                    <div class="admin-row-actions">
                        <button type="button" data-admin-action="move-evidence" data-skill-id="${esc(skill.id)}" data-evidence-index="${index}" data-direction="-1" ${index === 0 ? 'disabled' : ''}><i data-lucide="chevron-up"></i></button>
                        <button type="button" data-admin-action="move-evidence" data-skill-id="${esc(skill.id)}" data-evidence-index="${index}" data-direction="1" ${index === evidence.length - 1 ? 'disabled' : ''}><i data-lucide="chevron-down"></i></button>
                        <button type="button" class="is-danger" data-admin-action="delete-evidence" data-skill-id="${esc(skill.id)}" data-evidence-index="${index}"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
                <div class="admin-field-grid">
                    ${selectField({ label: 'Typ', path: `skills.${skillIndex}.evidence.${index}.type`, value: item.type, options: [
                        { value: 'link', label: 'Link' }, { value: 'image', label: 'Bild' }, { value: 'placeholder', label: 'Platzhalter' }
                    ] })}
                    ${field({ label: 'Titel', path: `skills.${skillIndex}.evidence.${index}.title`, value: item.title })}
                    ${field({ label: 'URL / Bildpfad', path: `skills.${skillIndex}.evidence.${index}.url`, value: item.url || '', wide: true })}
                    ${textareaField({ label: 'Notiz', path: `skills.${skillIndex}.evidence.${index}.note`, value: item.note || '', rows: 2 })}
                </div>
            </div>
        `).join('');
        return `
            <div class="admin-subsection-head"><strong>Nachweise, Bilder & Links</strong><button type="button" class="admin-inline-add" data-admin-action="add-evidence" data-skill-id="${esc(skill.id)}"><i data-lucide="plus"></i>Nachweis</button></div>
            <div class="admin-nested-list">${entries || '<p class="admin-empty-state">Noch keine Nachweise.</p>'}</div>
        `;
    }

    function renderSkillsTab(draft) {
        return renderCollectionManager({
            title: 'Kernfähigkeiten',
            description: 'Kurztext, Detailtext, Niveau und Nachweise werden als ein zusammenhängender Eintrag gepflegt.',
            collectionPath: 'skills',
            items: draft.skills || [],
            addLabel: 'Fähigkeit hinzufügen',
            nameForItem: item => item.title,
            detailForItem: item => item.desc,
            homepageIdsKey: 'homepageSkillIds',
            filterable: true,
            editorForItem: (item, index) => `
                <div class="admin-field-grid">
                    ${field({ label: 'Titel', path: `skills.${index}.title`, value: item.title })}
                    ${field({ label: 'Lucide-Icon', path: `skills.${index}.icon`, value: item.icon })}
                    ${textareaField({ label: 'Kurzbeschreibung', path: `skills.${index}.desc`, value: item.desc, rows: 3 })}
                    ${textareaField({ label: 'Ausführliche Beschreibung', path: `skills.${index}.fullText`, value: item.fullText, rows: 5 })}
                    ${textareaField({ label: 'Anwendung', path: `skills.${index}.application`, value: item.application, rows: 3 })}
                    ${textareaField({ label: 'Entwicklung', path: `skills.${index}.development`, value: item.development, rows: 3 })}
                    ${field({ label: 'Niveau 1–6', path: `skills.${index}.level`, value: item.level, type: 'number', min: 1, max: 6 })}
                    ${field({ label: 'Text für Niveau', path: `skills.${index}.levelLabel`, value: item.levelLabel })}
                    ${field({ label: 'Tags, mit Komma', path: `skills.${index}.tags`, value: Array.isArray(item.tags) ? item.tags.join(', ') : '', valueType: 'tags', wide: true })}
                </div>
                ${renderEvidenceEditor(item, index)}
            `
        });
    }

    function renderContactsTab(draft) {
        const content = draft.content || {};
        const contact = draft.contact || { direct: [], socials: [] };
        const modalLabels = sectionBlock('Kontaktfenster', 'Hier änderst du die kurzen Texte und Links im kompakten Kontaktfenster.', `
            <div class="admin-field-grid">
                ${field({ label: 'Fenstertitel', path: 'content.availabilityTitle', value: content.availabilityTitle })}
                ${field({ label: 'Kontakt-Überschrift', path: 'content.directContactTitle', value: content.directContactTitle })}
                ${field({ label: 'Hinweis-Überschrift', path: 'content.contactNoteTitle', value: content.contactNoteTitle })}
                ${field({ label: 'Text bei fehlendem QR-Code', path: 'content.qrPlaceholderHint', value: content.qrPlaceholderHint })}
                ${textareaField({ label: 'Kurzer Hinweis zur Erreichbarkeit', path: 'contact.note', value: contact.note, rows: 3 })}
                ${field({ label: 'Google-Maps-Link', path: 'contact.mapUrl', value: contact.mapUrl, wide: true })}
                ${field({ label: 'Standort-Fenstertitel', path: 'content.locationTitle', value: content.locationTitle })}
                ${field({ label: 'Maps-Button', path: 'content.locationActionLabel', value: content.locationActionLabel })}
            </div>
        `);

        const direct = renderCollectionManager({
            title: 'Direkte Kontakte',
            description: 'Telefon, E-Mail oder andere direkte Wege. Reihenfolge und Anzahl sind frei.',
            collectionPath: 'contact.direct',
            items: contact.direct || [],
            addLabel: 'Kontakt hinzufügen',
            nameForItem: item => item.label,
            detailForItem: item => item.value,
            editorForItem: (item, index) => `
                <div class="admin-field-grid">
                    ${field({ label: 'Bezeichnung', path: `contact.direct.${index}.label`, value: item.label })}
                    ${field({ label: 'Angezeigter Wert', path: `contact.direct.${index}.value`, value: item.value })}
                    ${field({ label: 'Link', path: `contact.direct.${index}.url`, value: item.url, placeholder: 'mailto:, tel: oder https://', wide: true })}
                    ${field({ label: 'Lucide-Icon', path: `contact.direct.${index}.icon`, value: item.icon })}
                </div>
            `
        });

        const socials = renderCollectionManager({
            title: 'Plattformen & Messenger',
            description: 'Links und rechts passen jeweils zwei QR-Karten. Ohne QR-Position erscheint die Plattform als kleiner Link bei den Kontaktdaten.',
            collectionPath: 'contact.socials',
            items: contact.socials || [],
            addLabel: 'Plattform hinzufügen',
            nameForItem: item => item.platform,
            detailForItem: item => item.value,
            editorForItem: (item, index) => {
                const qrImage = typeof getSafeImageUrl === 'function' ? getSafeImageUrl(item.qrImage) : item.qrImage;
                return `
                    <div class="admin-field-grid">
                        ${field({ label: 'Plattform', path: `contact.socials.${index}.platform`, value: item.platform })}
                        ${field({ label: 'Name / Handle', path: `contact.socials.${index}.value`, value: item.value })}
                        ${field({ label: 'Link', path: `contact.socials.${index}.url`, value: item.url, placeholder: 'https://…', wide: true })}
                        ${field({ label: 'Lucide-Icon', path: `contact.socials.${index}.icon`, value: item.icon })}
                        ${selectField({
                            label: 'QR-Position',
                            path: `contact.socials.${index}.qrSide`,
                            value: item.qrSide || 'none',
                            options: [
                                { value: 'none', label: 'Bei den Kontaktdaten' },
                                { value: 'left', label: 'Links als QR-Karte' },
                                { value: 'right', label: 'Rechts als QR-Karte' }
                            ]
                        })}
                        ${field({ label: 'QR-Bildpfad oder URL', path: `contact.socials.${index}.qrImage`, value: item.qrImage || '', wide: true })}
                    </div>
                    ${checkboxField({
                        label: 'Als Platzhalter anzeigen',
                        path: `contact.socials.${index}.isPlaceholder`,
                        checked: item.isPlaceholder === true,
                        help: 'Für den leeren QR-Platz. Wenn du später einen Dienst einträgst, schaltest du das wieder aus.'
                    })}
                    <div class="admin-upload-row">
                        <div class="admin-qr-preview">${qrImage ? `<img src="${esc(qrImage)}" alt="QR-Vorschau">` : '<i data-lucide="qr-code"></i><span>Kein QR-Bild</span>'}</div>
                        <label class="admin-file-button">QR-Bild auswählen<input type="file" accept="image/*" data-admin-social-qr="${index}"></label>
                    </div>
                `;
            }
        });

        return `${modalLabels}${direct}${socials}`;
    }

    function renderLayoutTab(draft) {
        const layout = draft.layout || getDefaultAboutData().layout;
        return sectionBlock('Sichere Größensteuerung', 'Nur Größen mit echtem Layout-Nutzen sind freigegeben. Mobile Breakpoints bleiben geschützt.', `
            <div class="admin-layout-note"><i data-lucide="gauge"></i><p>Die Vorschau wird höchstens einmal pro Browser-Frame aktualisiert. In der normalen Ansicht laufen dafür keine Slider, Observer oder Speichervorgänge.</p></div>
            <div class="admin-range-grid">
                ${rangeField({ label: 'Außenabstand der Sektion', path: 'layout.sectionPadding', value: layout.sectionPadding, min: 24, max: 112, unit: 'px' })}
                ${rangeField({ label: 'Breite im Fenster', path: 'layout.shellWidth', value: layout.shellWidth, min: 78, max: 100, unit: 'vw' })}
                ${rangeField({ label: 'Maximale Breite', path: 'layout.shellMaxWidth', value: layout.shellMaxWidth, min: 1180, max: 2100, step: 20, unit: 'px' })}
                ${rangeField({ label: 'Innenabstand des Rahmens', path: 'layout.framePadding', value: layout.framePadding, min: 10, max: 40, unit: 'px' })}
                ${rangeField({ label: 'Linker Inhaltsversatz', path: 'layout.contentInset', value: layout.contentInset, min: 0, max: 64, unit: 'px' })}
                ${rangeField({ label: 'Breite des Kurzprofils', path: 'layout.profileWidth', value: layout.profileWidth, min: 27, max: 44, unit: '%' })}
                ${rangeField({ label: 'Abstand der Hauptspalten', path: 'layout.mainGap', value: layout.mainGap, min: 8, max: 36, unit: 'px' })}
                ${rangeField({ label: 'Innenabstand der Panels', path: 'layout.panelPadding', value: layout.panelPadding, min: 10, max: 30, unit: 'px' })}
                ${rangeField({ label: 'Mindesthöhe der Prinzipien', path: 'layout.principleMinHeight', value: layout.principleMinHeight, min: 38, max: 72, unit: 'px' })}
                ${rangeField({ label: 'Mindesthöhe der Fähigkeiten', path: 'layout.skillMinHeight', value: layout.skillMinHeight, min: 88, max: 160, unit: 'px' })}
            </div>
            <button type="button" class="admin-reset-layout" data-admin-action="reset-layout"><i data-lucide="rotate-ccw"></i>Empfohlene Größen wiederherstellen</button>
        `);
    }

    function renderAboutTab(tabId, draft) {
        if (tabId === 'principles') return renderPrinciplesTab(draft);
        if (tabId === 'skills') return renderSkillsTab(draft);
        if (tabId === 'contacts') return renderContactsTab(draft);
        if (tabId === 'layout') return renderLayoutTab(draft);
        return renderContentTab(draft);
    }

    function addRemovedItem(draft, collectionPath, itemId) {
        const supported = ['facts', 'principles', 'skills', 'moreSections'];
        if (!supported.includes(collectionPath) || !itemId) return;
        if (!draft.removedItems || typeof draft.removedItems !== 'object') draft.removedItems = {};
        if (!Array.isArray(draft.removedItems[collectionPath])) draft.removedItems[collectionPath] = [];
        if (!draft.removedItems[collectionPath].includes(itemId)) draft.removedItems[collectionPath].push(itemId);
    }

    function getCollectionTemplate(collectionPath) {
        const templates = {
            focusSlides: { id: createId('focus'), icon: 'circle', title: 'Neuer Fokus', text: '' },
            facts: { id: createId('fact'), icon: 'info', label: 'Neuer Fakt', value: '', action: '' },
            moreSections: { id: createId('about-more'), navLabel: 'Neuer Abschnitt', icon: 'info', title: 'Neuer Abschnitt', useIntro: false, body: '' },
            principles: { id: createId('principle'), title: 'Neues Prinzip', desc: '', icon: 'sparkles', pinned: false },
            skills: { id: createId('skill'), title: 'Neue Fähigkeit', desc: '', fullText: '', application: '', development: '', icon: 'code', tags: [], levelLabel: 'Mittelstufe', level: 3, evidence: [], pinned: false },
            'contact.direct': { id: createId('contact'), label: 'Neuer Kontakt', value: '', url: '#', icon: 'contact' },
            'contact.socials': { id: createId('social'), platform: 'Neue Plattform', value: '', url: '#', icon: 'link', qrImage: '', qrSide: 'none', isPlaceholder: false }
        };
        return templates[collectionPath] ? clone(templates[collectionPath]) : null;
    }

    function findCollectionIndex(collection, itemId) {
        return collection.findIndex(item => String(item?.id || '') === String(itemId || ''));
    }

    function handleAboutAction(action, button, draft, studioState) {
        const collectionPath = button.dataset.collection || '';
        const collection = collectionPath ? getAtPath(draft, collectionPath) : null;
        const itemId = button.dataset.itemId || '';

        if (action === 'edit-collection') {
            const current = studioState.selectedItems.get(collectionPath);
            if (current === itemId) studioState.selectedItems.delete(collectionPath);
            else studioState.selectedItems.set(collectionPath, itemId);
            return { dirty: false, preserveScroll: true };
        }

        if (action === 'add-collection') {
            const template = getCollectionTemplate(collectionPath);
            if (!template) return null;
            if (!Array.isArray(collection)) setAtPath(draft, collectionPath, []);
            getAtPath(draft, collectionPath).push(template);
            studioState.selectedItems.set(collectionPath, template.id);
            return { message: 'Eintrag hinzugefügt – noch nicht gespeichert.' };
        }

        if (action === 'delete-collection' && Array.isArray(collection)) {
            if (collectionPath === 'focusSlides' && collection.length <= 1) {
                showToast('Mindestens ein Fokus-Eintrag muss erhalten bleiben.', 'error');
                return null;
            }
            const index = findCollectionIndex(collection, itemId);
            if (index < 0) return null;
            const itemName = collection[index].title || collection[index].label || collection[index].platform || 'Eintrag';
            if (!window.confirm(`„${itemName}“ wirklich löschen?`)) return null;
            collection.splice(index, 1);
            addRemovedItem(draft, collectionPath, itemId);
            if (collectionPath === 'principles') draft.homepagePrincipleIds = (draft.homepagePrincipleIds || []).filter(id => String(id) !== itemId);
            if (collectionPath === 'skills') draft.homepageSkillIds = (draft.homepageSkillIds || []).filter(id => String(id) !== itemId);
            studioState.selectedItems.delete(collectionPath);
            return { message: 'Eintrag entfernt – noch nicht gespeichert.' };
        }

        if (action === 'move-collection' && Array.isArray(collection)) {
            const index = findCollectionIndex(collection, itemId);
            const direction = Number(button.dataset.direction);
            const targetIndex = index + direction;
            if (index < 0 || targetIndex < 0 || targetIndex >= collection.length) return null;
            [collection[index], collection[targetIndex]] = [collection[targetIndex], collection[index]];
            return { message: 'Reihenfolge geändert – noch nicht gespeichert.' };
        }

        if (action === 'toggle-home') {
            const key = button.dataset.homeKey;
            if (!key || !Array.isArray(draft[key])) draft[key] = [];
            const ids = draft[key].map(String);
            const exists = ids.includes(itemId);
            const limit = key === 'homepagePrincipleIds' ? 12 : 8;
            if (!exists && ids.length >= limit) {
                showToast(`In dieser Übersicht sind maximal ${limit} Einträge vorgesehen.`, 'error');
                return null;
            }
            draft[key] = exists ? ids.filter(id => id !== itemId) : [...ids, itemId];
            return { message: exists ? 'Aus der Übersicht entfernt.' : 'Zur Übersicht hinzugefügt.' };
        }

        if (action === 'reset-layout') {
            draft.layout = clone(getDefaultAboutData().layout);
            return { message: 'Empfohlene Größen als Vorschau geladen.' };
        }

        if (['add-evidence', 'delete-evidence', 'move-evidence'].includes(action)) {
            const skills = Array.isArray(draft.skills) ? draft.skills : [];
            const skillIndex = findCollectionIndex(skills, button.dataset.skillId);
            if (skillIndex < 0) return null;
            const skill = skills[skillIndex];
            if (!Array.isArray(skill.evidence)) skill.evidence = [];
            if (action === 'add-evidence') {
                skill.evidence.push({ type: 'link', title: 'Neuer Nachweis', url: '', note: '' });
            } else {
                const evidenceIndex = Number(button.dataset.evidenceIndex);
                if (!Number.isInteger(evidenceIndex) || !skill.evidence[evidenceIndex]) return null;
                if (action === 'delete-evidence') skill.evidence.splice(evidenceIndex, 1);
                if (action === 'move-evidence') {
                    const targetIndex = evidenceIndex + Number(button.dataset.direction);
                    if (targetIndex < 0 || targetIndex >= skill.evidence.length) return null;
                    [skill.evidence[evidenceIndex], skill.evidence[targetIndex]] = [skill.evidence[targetIndex], skill.evidence[evidenceIndex]];
                }
            }
            return { message: 'Nachweise aktualisiert – noch nicht gespeichert.' };
        }

        return null;
    }

    function normalizeAboutForStudio(value) {
        return migrateAboutData(clone(value));
    }

    function previewAbout(value) {
        state.data.about = normalizeAboutForStudio(value);
        renderProfileAndAbout({ skipProfile: true });
        refreshIcons();
    }

    registerSection({
        id: 'about',
        label: 'Über mich',
        icon: 'user-round',
        tabs: [
            { id: 'content', label: 'Inhalt', icon: 'type' },
            { id: 'principles', label: 'Prinzipien', icon: 'heart' },
            { id: 'skills', label: 'Fähigkeiten', icon: 'zap' },
            { id: 'contacts', label: 'Kontakte', icon: 'at-sign' },
            { id: 'layout', label: 'Größen', icon: 'ruler' }
        ],
        getData: () => state.data.about,
        normalize: normalizeAboutForStudio,
        preview: previewAbout,
        commit(value) {
            state.data.about = normalizeAboutForStudio(value);
            const saved = saveData();
            if (saved) renderProfileAndAbout({ skipProfile: true });
            return saved;
        },
        renderTab: renderAboutTab,
        handleAction: handleAboutAction
    });

    function getEducationStudioData() {
        return {
            content: state.data.educationContent,
            items: state.data.educationItems,
            goal: state.data.educationGoal,
            layout: state.data.educationLayout,
            removedItems: state.data.educationRemovedItems,
            revision: state.data.educationTimelineRevision
        };
    }

    function normalizeEducationForStudio(value) {
        const source = value && typeof value === 'object' ? value : {};
        const migrated = migrateEducationData({
            educationContent: source.content,
            educationItems: source.items,
            educationGoal: source.goal,
            educationLayout: source.layout,
            educationRemovedItems: source.removedItems,
            educationTimelineRevision: source.revision
        });
        return {
            content: migrated.educationContent,
            items: migrated.educationItems,
            goal: migrated.educationGoal,
            layout: migrated.educationLayout,
            removedItems: migrated.educationRemovedItems,
            revision: migrated.educationTimelineRevision
        };
    }

    function renderEducationEvidenceEditor(item, itemIndex) {
        const evidence = Array.isArray(item.evidence) ? item.evidence : [];
        const entries = evidence.map((entry, evidenceIndex) => {
            const previewUrl = typeof getSafeImageUrl === 'function' && entry.type === 'image'
                ? getSafeImageUrl(entry.url)
                : '';
            return `
                <div class="admin-nested-card">
                    <div class="admin-nested-head">
                        <strong>Nachweis ${evidenceIndex + 1}</strong>
                        <div class="admin-row-actions">
                            <button type="button" data-admin-action="move-education-evidence" data-item-id="${esc(item.id)}" data-evidence-index="${evidenceIndex}" data-direction="-1" aria-label="Nachweis nach oben" ${evidenceIndex === 0 ? 'disabled' : ''}><i data-lucide="chevron-up"></i></button>
                            <button type="button" data-admin-action="move-education-evidence" data-item-id="${esc(item.id)}" data-evidence-index="${evidenceIndex}" data-direction="1" aria-label="Nachweis nach unten" ${evidenceIndex === evidence.length - 1 ? 'disabled' : ''}><i data-lucide="chevron-down"></i></button>
                            <button type="button" class="is-danger" data-admin-action="delete-education-evidence" data-item-id="${esc(item.id)}" data-evidence-index="${evidenceIndex}" aria-label="Nachweis löschen"><i data-lucide="trash-2"></i></button>
                        </div>
                    </div>
                    <div class="admin-field-grid">
                        ${selectField({
                            label: 'Typ',
                            path: `items.${itemIndex}.evidence.${evidenceIndex}.type`,
                            value: entry.type || 'placeholder',
                            options: [
                                { value: 'placeholder', label: 'Platzhalter' },
                                { value: 'image', label: 'Bild' },
                                { value: 'document', label: 'Dokument / Link' }
                            ]
                        })}
                        ${field({ label: 'Titel', path: `items.${itemIndex}.evidence.${evidenceIndex}.title`, value: entry.title || '' })}
                        ${field({ label: 'Lucide-Icon', path: `items.${itemIndex}.evidence.${evidenceIndex}.icon`, value: entry.icon || 'file-text' })}
                        ${field({ label: 'URL / Dateipfad', path: `items.${itemIndex}.evidence.${evidenceIndex}.url`, value: entry.url || '', wide: true, placeholder: 'assets/... oder https://…' })}
                        ${textareaField({ label: 'Kurze Notiz', path: `items.${itemIndex}.evidence.${evidenceIndex}.note`, value: entry.note || '', rows: 2 })}
                    </div>
                    <div class="admin-upload-row">
                        <div class="admin-qr-preview">${previewUrl ? `<img src="${esc(previewUrl)}" alt="Bildvorschau">` : '<i data-lucide="image"></i><span>Kein Bild</span>'}</div>
                        <label class="admin-file-button">Bild auswählen<input type="file" accept="image/*" data-admin-education-image="${itemIndex}" data-evidence-index="${evidenceIndex}"></label>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="admin-subsection-head">
                <strong>Nachweise, Bilder & Dokumente</strong>
                <button type="button" class="admin-inline-add" data-admin-action="add-education-evidence" data-item-id="${esc(item.id)}"><i data-lucide="plus"></i>Nachweis</button>
            </div>
            <div class="admin-nested-list">${entries || '<p class="admin-empty-state">Noch keine Nachweise hinterlegt.</p>'}</div>
        `;
    }

    function renderEducationStationsTab(draft) {
        const content = draft.content || getDefaultEducationContent();
        const heading = sectionBlock('Überschrift', 'Titel und Untertitel der Bildung-Sektion.', `
            <div class="admin-field-grid">
                ${field({ label: 'Titel', path: 'content.sectionTitle', value: content.sectionTitle })}
                ${field({ label: 'Untertitel', path: 'content.sectionSubtitle', value: content.sectionSubtitle, wide: true })}
            </div>
        `);

        const stations = renderCollectionManager({
            title: 'Stationen',
            description: 'Alle Stationen lassen sich öffnen, sortieren, ergänzen oder entfernen. Die LVL-Nummern werden beim Sortieren automatisch angepasst.',
            collectionPath: 'items',
            items: draft.items || [],
            addLabel: 'Station hinzufügen',
            nameForItem: item => item.title,
            detailForItem: item => `${item.years || 'Ohne Zeitraum'} · ${item.status || 'Ohne Status'}`,
            filterable: true,
            editorForItem: (item, index) => `
                <div class="admin-field-grid">
                    ${field({ label: 'Titel', path: `items.${index}.title`, value: item.title })}
                    ${field({ label: 'Untertitel', path: `items.${index}.subtitle`, value: item.subtitle || '' })}
                    ${field({ label: 'Zeitraum', path: `items.${index}.years`, value: item.years || '', placeholder: '09/2025–02/2026' })}
                    ${field({ label: 'Ort', path: `items.${index}.place`, value: item.place || '' })}
                    ${field({ label: 'Format', path: `items.${index}.format`, value: item.format || '' })}
                    ${field({ label: 'Themen', path: `items.${index}.topics`, value: item.topics || '' })}
                    ${field({ label: 'Angezeigter Status', path: `items.${index}.status`, value: item.status || '' })}
                    ${selectField({
                        label: 'Darstellung',
                        path: `items.${index}.statusType`,
                        value: item.statusType || 'completed',
                        options: [
                            { value: 'completed', label: 'Abgeschlossen' },
                            { value: 'current', label: 'Aktuell' },
                            { value: 'partial', label: 'Nicht ganz abgeschlossen' },
                            { value: 'planned', label: 'Geplant / neutral' }
                        ]
                    })}
                    ${field({ label: 'Lucide-Icon', path: `items.${index}.icon`, value: item.icon || 'book-open' })}
                    ${field({ label: 'LVL', path: `items.${index}.level`, value: item.level || String(index + 1).padStart(2, '0') })}
                    ${field({ label: 'Fortschritt in %', path: `items.${index}.progress`, value: item.progress ?? 0, type: 'number', min: 0, max: 100 })}
                    ${checkboxField({ label: 'Detailansicht öffnen', path: `items.${index}.clickable`, checked: item.clickable !== false, help: 'Wenn ausgeschaltet, bleibt die Karte sichtbar, lässt sich aber nicht öffnen.' })}
                    ${textareaField({ label: 'Persönlicher Beschreibungstext', path: `items.${index}.text`, value: item.text || '', rows: 6 })}
                </div>
                ${renderEducationEvidenceEditor(item, index)}
            `
        });
        return `${heading}${stations}`;
    }

    function renderEducationPathsTab(draft) {
        const branches = Array.isArray(draft.goal?.branches) ? draft.goal.branches : [];
        const content = branches.map((branch, index) => sectionBlock(
            branch.title || `Weg ${index + 1}`,
            'Diese Karte steht nach der letzten Station und zeigt einen möglichen nächsten Weg.',
            `<div class="admin-field-grid">
                ${field({ label: 'Titel', path: `goal.branches.${index}.title`, value: branch.title || '' })}
                ${field({ label: 'Kleine Überschrift', path: `goal.branches.${index}.subtitle`, value: branch.subtitle || '' })}
                ${field({ label: 'Status', path: `goal.branches.${index}.status`, value: branch.status || '' })}
                ${field({ label: 'Lucide-Icon', path: `goal.branches.${index}.icon`, value: branch.icon || 'route' })}
            </div>`
        )).join('');

        return content || sectionBlock('Mögliche Wege', '', '<p class="admin-empty-state">Keine Wege vorhanden.</p>');
    }

    function renderEducationLayoutTab(draft) {
        const layout = draft.layout || getDefaultEducationLayout();
        return sectionBlock('Größen der Timeline', 'Die Regler wirken nur auf die Desktop-Ansicht. Tablet und Smartphone behalten ihr geschütztes, vertikales Layout.', `
            <div class="admin-layout-note"><i data-lucide="gauge"></i><p>Die Vorschau wird nur im Admin Mode berechnet und höchstens einmal pro Browser-Frame aktualisiert. Außerhalb des Admin Mode entsteht dadurch keine zusätzliche laufende Belastung.</p></div>
            <div class="admin-range-grid">
                ${rangeField({ label: 'Breite der Karten', path: 'layout.cardWidth', value: layout.cardWidth, min: 132, max: 176, unit: 'px' })}
                ${rangeField({ label: 'Mindesthöhe der Karten', path: 'layout.cardHeight', value: layout.cardHeight, min: 160, max: 210, unit: 'px' })}
                ${rangeField({ label: 'Höhe der Timeline', path: 'layout.timelineHeight', value: layout.timelineHeight, min: 420, max: 520, step: 4, unit: 'px' })}
                ${rangeField({ label: 'Position der Mittellinie', path: 'layout.linePosition', value: layout.linePosition, min: 200, max: 250, step: 2, unit: 'px' })}
                ${rangeField({ label: 'Breite der Zielkarten', path: 'layout.goalWidth', value: layout.goalWidth, min: 144, max: 180, unit: 'px' })}
            </div>
            <button type="button" class="admin-reset-layout" data-admin-action="reset-education-layout"><i data-lucide="rotate-ccw"></i>Empfohlene Größen wiederherstellen</button>
        `);
    }

    function renderEducationTab(tabId, draft) {
        if (tabId === 'paths') return renderEducationPathsTab(draft);
        if (tabId === 'layout') return renderEducationLayoutTab(draft);
        return renderEducationStationsTab(draft);
    }

    function renumberEducationItems(items) {
        if (!Array.isArray(items)) return;
        items.forEach((item, index) => {
            item.level = String(index + 1).padStart(2, '0');
        });
    }

    function handleEducationAction(action, button, draft, studioState) {
        const items = Array.isArray(draft.items) ? draft.items : [];
        const itemId = button.dataset.itemId || '';

        if (action === 'edit-collection' && button.dataset.collection === 'items') {
            const current = studioState.selectedItems.get('items');
            if (current === itemId) studioState.selectedItems.delete('items');
            else studioState.selectedItems.set('items', itemId);
            return { dirty: false, preserveScroll: true };
        }

        if (action === 'add-collection' && button.dataset.collection === 'items') {
            if (items.length >= 20) {
                showToast('Für diese Timeline sind maximal 20 Stationen vorgesehen.', 'error');
                return null;
            }
            const item = {
                id: createId('edu'),
                level: String(items.length + 1).padStart(2, '0'),
                title: 'Neue Station',
                subtitle: '',
                icon: 'book-open',
                status: 'Geplant',
                statusType: 'planned',
                years: '',
                place: '',
                format: '',
                topics: '',
                progress: 0,
                clickable: true,
                text: '',
                evidence: []
            };
            items.push(item);
            studioState.selectedItems.set('items', item.id);
            return { message: 'Neue Bildungsstation hinzugefügt – noch nicht gespeichert.' };
        }

        if (action === 'delete-collection' && button.dataset.collection === 'items') {
            if (items.length <= 1) {
                showToast('Mindestens eine Bildungsstation muss erhalten bleiben.', 'error');
                return null;
            }
            const index = findCollectionIndex(items, itemId);
            if (index < 0) return null;
            if (!window.confirm(`„${items[index].title || 'Station'}“ wirklich löschen?`)) return null;
            items.splice(index, 1);
            if (!Array.isArray(draft.removedItems)) draft.removedItems = [];
            if (itemId && !draft.removedItems.includes(itemId)) draft.removedItems.push(itemId);
            studioState.selectedItems.delete('items');
            renumberEducationItems(items);
            return { message: 'Bildungsstation entfernt – noch nicht gespeichert.' };
        }

        if (action === 'move-collection' && button.dataset.collection === 'items') {
            const index = findCollectionIndex(items, itemId);
            const targetIndex = index + Number(button.dataset.direction);
            if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return null;
            [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
            renumberEducationItems(items);
            return { message: 'Reihenfolge der Bildungsstationen geändert.' };
        }

        if (['add-education-evidence', 'delete-education-evidence', 'move-education-evidence'].includes(action)) {
            const itemIndex = findCollectionIndex(items, itemId);
            if (itemIndex < 0) return null;
            const item = items[itemIndex];
            if (!Array.isArray(item.evidence)) item.evidence = [];
            if (action === 'add-education-evidence') {
                item.evidence.push({ type: 'placeholder', title: 'Neuer Nachweis', note: 'Später hinzufügen', icon: 'file-text', url: '' });
            } else {
                const evidenceIndex = Number(button.dataset.evidenceIndex);
                if (!Number.isInteger(evidenceIndex) || !item.evidence[evidenceIndex]) return null;
                if (action === 'delete-education-evidence') item.evidence.splice(evidenceIndex, 1);
                if (action === 'move-education-evidence') {
                    const targetIndex = evidenceIndex + Number(button.dataset.direction);
                    if (targetIndex < 0 || targetIndex >= item.evidence.length) return null;
                    [item.evidence[evidenceIndex], item.evidence[targetIndex]] = [item.evidence[targetIndex], item.evidence[evidenceIndex]];
                }
            }
            return { message: 'Nachweise aktualisiert – noch nicht gespeichert.' };
        }

        if (action === 'reset-education-layout') {
            draft.layout = clone(getDefaultEducationLayout());
            return { message: 'Empfohlene Timeline-Größen als Vorschau geladen.' };
        }

        return null;
    }

    function applyEducationStudioData(value) {
        const normalized = normalizeEducationForStudio(value);
        state.data.educationContent = normalized.content;
        state.data.educationItems = normalized.items;
        state.data.educationGoal = normalized.goal;
        state.data.educationLayout = normalized.layout;
        state.data.educationRemovedItems = normalized.removedItems;
        state.data.educationTimelineRevision = normalized.revision;
        renderEducation();
        refreshIcons();
        return normalized;
    }

    registerSection({
        id: 'education',
        label: 'Bildung',
        icon: 'graduation-cap',
        tabs: [
            { id: 'stations', label: 'Stationen', icon: 'route' },
            { id: 'paths', label: 'Wege', icon: 'git-branch' },
            { id: 'layout', label: 'Größen', icon: 'ruler' }
        ],
        getData: getEducationStudioData,
        normalize: normalizeEducationForStudio,
        preview: applyEducationStudioData,
        commit(value) {
            applyEducationStudioData(value);
            return saveData();
        },
        renderTab: renderEducationTab,
        handleAction: handleEducationAction
    });

    function getProjectsStudioData() {
        return {
            content: state.data.projectsContent,
            items: state.data.projects,
            layout: state.data.projectsLayout,
            revision: state.data.projectsRevision
        };
    }

    function normalizeProjectsForStudio(value) {
        const source = value && typeof value === 'object' ? value : {};
        const fallbackLayout = typeof getDefaultProjectsLayout === 'function' ? getDefaultProjectsLayout() : {};
        return {
            content: normalizeProjectsContent(source.content),
            items: migrateProjectShowcaseData(source.items, source.revision),
            layout: normalizeProjectsLayout(source.layout, fallbackLayout),
            revision: PROJECT_SHOWCASE_REVISION
        };
    }

    function getScopedProject(draft) {
        const items = Array.isArray(draft.items) ? draft.items : [];
        let selectedId = uiState.selectedItems.get('project-scope');
        let index = items.findIndex(item => String(item.id) === String(selectedId));
        if (index < 0 && items.length) {
            index = 0;
            selectedId = String(items[0].id);
            uiState.selectedItems.set('project-scope', selectedId);
        }
        return { project: items[index] || null, index, selectedId: selectedId || '' };
    }

    function renderProjectScopeSelector(draft, description) {
        const { selectedId } = getScopedProject(draft);
        const items = Array.isArray(draft.items) ? draft.items : [];
        return `
            <div class="admin-project-scope">
                <label>
                    <span>Projekt auswählen</span>
                    <select data-admin-project-scope>
                        ${items.map(item => `<option value="${esc(item.id)}" ${String(item.id) === String(selectedId) ? 'selected' : ''}>${esc(item.title || 'Projekt')}</option>`).join('')}
                    </select>
                </label>
                <p>${esc(description)}</p>
            </div>
        `;
    }

    function renderProjectImageUpload(path, value, label = 'Bild auswählen') {
        const safeImage = typeof getSafeImageUrl === 'function' ? getSafeImageUrl(value) : value;
        return `
            <div class="admin-upload-row admin-project-upload">
                <div class="admin-qr-preview">${safeImage
                    ? `<img src="${esc(safeImage)}" alt="Projektbild-Vorschau">`
                    : '<i data-lucide="image"></i><span>Kein Bild</span>'}</div>
                <label class="admin-file-button">${esc(label)}<input type="file" accept="image/*" data-admin-project-image="${esc(path)}"></label>
            </div>
        `;
    }

    function renderProjectsOverviewTab(draft) {
        const content = draft.content || getDefaultProjectsContent();
        const labels = sectionBlock('Texte der Sektion', 'Überschrift, Archiv und wiederkehrende Bezeichnungen.', `
            <div class="admin-field-grid">
                ${field({ label: 'Überschrift', path: 'content.sectionTitle', value: content.sectionTitle })}
                ${field({ label: 'Archiv-Button', path: 'content.allProjectsLabel', value: content.allProjectsLabel })}
                ${field({ label: 'Kleine Archiv-Kennzeichnung', path: 'content.archiveKicker', value: content.archiveKicker })}
                ${field({ label: 'Suchfeld-Platzhalter', path: 'content.searchPlaceholder', value: content.searchPlaceholder })}
                ${field({ label: 'Button zur Detailansicht', path: 'content.moreButtonLabel', value: content.moreButtonLabel })}
                ${field({ label: 'Überschrift: eigener Beitrag', path: 'content.roleLabel', value: content.roleLabel })}
                ${field({ label: 'Überschrift: Status', path: 'content.statusLabel', value: content.statusLabel })}
                ${field({ label: 'Überschrift: Technologien', path: 'content.technologiesLabel', value: content.technologiesLabel })}
                ${field({ label: 'Bezeichnung für weitere Technologien', path: 'content.extraTechnologiesLabel', value: content.extraTechnologiesLabel })}
            </div>
        `);

        const projects = renderCollectionManager({
            title: 'Projekte',
            description: 'Die Reihenfolge gilt auch für die linke Projektauswahl. Ein Klick auf einen Eintrag öffnet seine Bearbeitung.',
            collectionPath: 'items',
            items: draft.items || [],
            addLabel: 'Projekt hinzufügen',
            nameForItem: item => item.title,
            detailForItem: item => `${item.category || 'Projekt'} · ${item.status || 'Ohne Status'}`,
            filterable: true,
            editorForItem: (item, index) => `
                <div class="admin-layout-note"><i data-lucide="layout-template"></i><p>Darstellung: <strong>${esc(item.showcaseKey || 'generic')}</strong>. Die drei bestehenden Projekte behalten ihre eigene Medienansicht; neue Projekte verwenden eine neutrale Vorlage.</p></div>
                <div class="admin-field-grid">
                    ${field({ label: 'Name', path: `items.${index}.title`, value: item.title })}
                    ${field({ label: 'Kategorie', path: `items.${index}.category`, value: item.category || '' })}
                    ${textareaField({ label: 'Kurze Erklärung', path: `items.${index}.desc`, value: item.desc || '', rows: 4, help: 'In zwei bis drei einfachen Sätzen: Was ist das und warum gibt es das?' })}
                    ${textareaField({ label: 'Mein Beitrag', path: `items.${index}.role`, value: item.role || '', rows: 3 })}
                    ${field({ label: 'Status', path: `items.${index}.status`, value: item.status || '', placeholder: 'Prototyp · in Arbeit' })}
                    ${field({ label: 'Zeitraum', path: `items.${index}.period`, value: item.period || '', placeholder: 'Seit 2026' })}
                    ${field({ label: 'Technologien, mit Komma getrennt', path: `items.${index}.tech`, value: item.tech || '', wide: true })}
                    ${field({ label: 'Lucide-Icon', path: `items.${index}.icon`, value: item.icon || 'folder' })}
                    ${field({ label: 'Vorschaubild-Pfad', path: `items.${index}.img`, value: item.img || '', wide: true, placeholder: 'assets/projects/…' })}
                    ${textareaField({ label: 'Was ich dabei gelernt habe', path: `items.${index}.learned`, value: item.learned || '', rows: 3 })}
                    ${field({ label: 'Kurze Punkte, mit Komma getrennt', path: `items.${index}.highlights`, value: (item.highlights || []).join(', '), valueType: 'tags', wide: true })}
                </div>
                ${renderProjectImageUpload(`items.${index}.img`, item.img, 'Vorschaubild auswählen')}
            `
        });

        return `${labels}${projects}`;
    }

    function renderProjectsScreensTab(draft) {
        const scope = getScopedProject(draft);
        if (!scope.project) return sectionBlock('Ansichten', '', '<p class="admin-empty-state">Lege zuerst ein Projekt an.</p>');
        const collectionPath = `items.${scope.index}.features`;
        const features = Array.isArray(scope.project.features) ? scope.project.features : [];
        return `${renderProjectScopeSelector(draft, 'Hier bearbeitest du die großen Screens, Videos und die Navigation darunter.')}${renderCollectionManager({
            title: 'Projektansichten',
            description: 'Kurze Namen und klare Beschreibungen funktionieren besser als technische Erklärungen.',
            collectionPath,
            items: features,
            addLabel: 'Ansicht hinzufügen',
            nameForItem: item => item.navLabel || item.title,
            detailForItem: item => item.eyebrow || item.kind || 'Ansicht',
            editorForItem: (item, index) => {
                const base = `${collectionPath}.${index}`;
                const isNivora = scope.project.showcaseKey === 'nivora';
                const mediaFields = isNivora
                    ? `
                        ${field({ label: 'Video-Vorschaubild', path: `${base}.poster`, value: item.poster || '', wide: true })}
                        ${field({ label: 'Videopfad', path: `${base}.video`, value: item.video || '', wide: true })}
                        ${field({ label: 'Zusatzpunkte, mit Komma getrennt', path: `${base}.points`, value: (item.points || []).join(', '), valueType: 'tags', wide: true })}
                    `
                    : `
                        ${field({ label: 'Bildpfad', path: `${base}.image`, value: item.image || '', wide: true })}
                        ${field({ label: 'Optionaler Videopfad', path: `${base}.video`, value: item.video || '', wide: true })}
                    `;
                return `
                    <div class="admin-field-grid">
                        ${field({ label: 'Kurzer Navigationsname', path: `${base}.navLabel`, value: item.navLabel || '' })}
                        ${field({ label: 'Kleine Überschrift', path: `${base}.eyebrow`, value: item.eyebrow || '' })}
                        ${field({ label: 'Titel', path: `${base}.title`, value: item.title || '' })}
                        ${textareaField({ label: 'Beschreibung', path: `${base}.description`, value: item.description || '', rows: 4 })}
                        ${field({ label: 'Lucide-Icon', path: `${base}.icon`, value: item.icon || 'circle' })}
                        ${mediaFields}
                    </div>
                    ${renderProjectImageUpload(`${base}.${scope.project.showcaseKey === 'nivora' ? 'poster' : 'image'}`, scope.project.showcaseKey === 'nivora' ? item.poster : item.image, 'Bild für diese Ansicht')}
                `;
            }
        })}`;
    }

    function renderProjectsDetailsTab(draft) {
        const scope = getScopedProject(draft);
        if (!scope.project) return sectionBlock('Mehr-Ansicht', '', '<p class="admin-empty-state">Lege zuerst ein Projekt an.</p>');
        const project = scope.project;
        const collectionPath = `items.${scope.index}.details`;
        const details = Array.isArray(project.details) ? project.details : [];
        const heading = sectionBlock('Kopf der Detailansicht', 'Dieser Text steht oberhalb der kompakten Zusatzkarten.', `
            <div class="admin-field-grid">
                ${field({ label: 'Titel', path: `items.${scope.index}.detailsTitle`, value: project.detailsTitle || '', wide: true })}
                ${textareaField({ label: 'Kurze Einleitung', path: `items.${scope.index}.detailsIntro`, value: project.detailsIntro || '', rows: 3 })}
            </div>
        `);
        const cards = renderCollectionManager({
            title: 'Zusatzkarten',
            description: 'Nur Informationen, die beim ersten Blick nicht nötig sind. Die Karten bleiben bewusst kompakt.',
            collectionPath,
            items: details,
            addLabel: 'Karte hinzufügen',
            nameForItem: item => item.title || item.folder || item.label,
            detailForItem: item => item.label || item.folder || 'Zusatzinformation',
            editorForItem: (item, index) => {
                const base = `${collectionPath}.${index}`;
                const contentFields = project.showcaseKey === 'resume'
                    ? `
                        ${field({ label: 'Ordnername', path: `${base}.folder`, value: item.folder || '' })}
                        ${field({ label: 'Lucide-Icon', path: `${base}.icon`, value: item.icon || 'folder' })}
                        ${textareaField({ label: 'Beschreibung', path: `${base}.description`, value: item.description || '', rows: 4 })}
                        ${field({ label: 'Bildpfad', path: `${base}.preview`, value: item.preview || '', wide: true })}
                        ${field({ label: 'Dateinamen, mit Komma getrennt', path: `${base}.files`, value: (item.files || []).join(', '), valueType: 'tags', wide: true })}
                    `
                    : `
                        ${field({ label: 'Kleine Kennzeichnung', path: `${base}.label`, value: item.label || '' })}
                        ${field({ label: 'Titel', path: `${base}.title`, value: item.title || '' })}
                        ${field({ label: 'Lucide-Icon', path: `${base}.icon`, value: item.icon || 'info' })}
                        ${textareaField({ label: 'Beschreibung', path: `${base}.description`, value: item.description || '', rows: 4 })}
                        ${project.showcaseKey === 'idea-capture' ? field({ label: 'Bildpfad', path: `${base}.preview`, value: item.preview || '', wide: true }) : ''}
                    `;
                return `
                    <div class="admin-field-grid">
                        ${contentFields}
                    </div>
                    ${['resume', 'idea-capture'].includes(project.showcaseKey) ? renderProjectImageUpload(`${base}.preview`, item.preview, 'Bild für diese Karte') : ''}
                `;
            }
        });
        return `${renderProjectScopeSelector(draft, 'Diese Inhalte öffnen sich über die Pfeile oder über „Mehr zum Projekt“.')}${heading}${cards}`;
    }

    function renderProjectsLayoutTab(draft) {
        const layout = draft.layout || getDefaultProjectsLayout();
        return sectionBlock('Größen der Projektansicht', 'Nur sinnvolle Grenzen sind freigegeben; Tablet und Smartphone behalten ihre geschützte Anordnung.', `
            <div class="admin-layout-note"><i data-lucide="gauge"></i><p>Die Regler aktualisieren nur die Admin-Vorschau. Wenn der Admin Mode aus ist, laufen keine zusätzlichen Berechnungen.</p></div>
            <div class="admin-range-grid">
                ${rangeField({ label: 'Breite der Projektauswahl', path: 'layout.sidebarWidth', value: layout.sidebarWidth, min: 288, max: 400, unit: 'px' })}
                ${rangeField({ label: 'Mindesthöhe der Projektzeilen', path: 'layout.pickerMinHeight', value: layout.pickerMinHeight, min: 84, max: 132, unit: 'px' })}
                ${rangeField({ label: 'Mindesthöhe der Zusatzkarten', path: 'layout.insightCardMinHeight', value: layout.insightCardMinHeight, min: 104, max: 190, unit: 'px' })}
                ${rangeField({ label: 'Abstand zwischen Zusatzkarten', path: 'layout.insightGap', value: layout.insightGap, min: 8, max: 24, unit: 'px' })}
            </div>
            <button type="button" class="admin-reset-layout" data-admin-action="reset-projects-layout"><i data-lucide="rotate-ccw"></i>Empfohlene Größen wiederherstellen</button>
        `);
    }

    function renderProjectsTab(tabId, draft) {
        if (tabId === 'screens') return renderProjectsScreensTab(draft);
        if (tabId === 'details') return renderProjectsDetailsTab(draft);
        if (tabId === 'layout') return renderProjectsLayoutTab(draft);
        return renderProjectsOverviewTab(draft);
    }

    function createProjectFeature(project) {
        const videoFirst = ['nivora', 'idea-capture'].includes(project?.showcaseKey);
        return {
            id: createId('view'),
            navLabel: 'Neue Ansicht',
            eyebrow: 'Neue Ansicht',
            title: 'Was man hier sehen kann',
            description: '',
            points: [],
            kind: videoFirst ? 'video' : 'image',
            image: '',
            poster: '',
            video: '',
            icon: 'circle'
        };
    }

    function createProjectDetail(project) {
        if (project?.showcaseKey === 'resume') {
            return { id: createId('detail'), folder: 'neuer-bereich', preview: '', icon: 'folder', description: '', files: [] };
        }
        return { id: createId('detail'), label: 'Mehr dazu', title: 'Neue Information', icon: 'info', description: '', preview: '', files: [] };
    }

    function handleProjectsAction(action, button, draft, studioState) {
        const collectionPath = button.dataset.collection || '';
        const collection = collectionPath ? getAtPath(draft, collectionPath) : null;
        const itemId = button.dataset.itemId || '';

        if (action === 'edit-collection' && Array.isArray(collection)) {
            const current = studioState.selectedItems.get(collectionPath);
            if (current === itemId) studioState.selectedItems.delete(collectionPath);
            else studioState.selectedItems.set(collectionPath, itemId);
            if (collectionPath === 'items') studioState.selectedItems.set('project-scope', itemId);
            return { dirty: false, preserveScroll: true };
        }

        if (action === 'add-collection') {
            if (!Array.isArray(collection)) return null;
            let item = null;
            if (collectionPath === 'items') {
                item = normalizeProjectShowcaseItem({
                    id: createId('project'),
                    showcaseKey: 'generic',
                    title: 'Neues Projekt',
                    category: 'Projekt',
                    desc: '',
                    role: 'Idee und Umsetzung',
                    period: '',
                    status: 'In Arbeit',
                    tech: '',
                    icon: 'folder',
                    img: '',
                    learned: '',
                    highlights: [],
                    features: [],
                    details: []
                });
            } else {
                const scope = getScopedProject(draft);
                if (collectionPath.endsWith('.features')) item = createProjectFeature(scope.project);
                if (collectionPath.endsWith('.details')) item = createProjectDetail(scope.project);
            }
            if (!item) return null;
            collection.push(item);
            studioState.selectedItems.set(collectionPath, item.id || item.title || item.folder);
            if (collectionPath === 'items') studioState.selectedItems.set('project-scope', item.id);
            return { message: 'Eintrag hinzugefügt – noch nicht gespeichert.' };
        }

        if (action === 'delete-collection' && Array.isArray(collection)) {
            if (collectionPath === 'items' && collection.length <= 1) {
                showToast('Mindestens ein Projekt muss erhalten bleiben.', 'error');
                return null;
            }
            const index = findCollectionIndex(collection, itemId);
            if (index < 0) return null;
            const itemName = collection[index].title || collection[index].folder || collection[index].navLabel || 'Eintrag';
            if (!window.confirm(`„${itemName}“ wirklich löschen?`)) return null;
            collection.splice(index, 1);
            studioState.selectedItems.delete(collectionPath);
            if (collectionPath === 'items') {
                const nextId = String(collection[Math.min(index, collection.length - 1)]?.id || '');
                studioState.selectedItems.set('project-scope', nextId);
            }
            return { message: 'Eintrag entfernt – noch nicht gespeichert.' };
        }

        if (action === 'move-collection' && Array.isArray(collection)) {
            const index = findCollectionIndex(collection, itemId);
            const targetIndex = index + Number(button.dataset.direction);
            if (index < 0 || targetIndex < 0 || targetIndex >= collection.length) return null;
            [collection[index], collection[targetIndex]] = [collection[targetIndex], collection[index]];
            return { message: 'Reihenfolge geändert – noch nicht gespeichert.' };
        }

        if (action === 'reset-projects-layout') {
            draft.layout = clone(getDefaultProjectsLayout());
            return { message: 'Empfohlene Projektgrößen als Vorschau geladen.' };
        }

        return null;
    }

    function applyProjectsStudioData(value) {
        const normalized = normalizeProjectsForStudio(value);
        state.data.projectsContent = normalized.content;
        state.data.projects = normalized.items;
        state.data.projectsLayout = normalized.layout;
        state.data.projectsRevision = normalized.revision;
        renderProjects();
        refreshIcons();
        return normalized;
    }

    registerSection({
        id: 'projects',
        label: 'Projekte',
        icon: 'folder-kanban',
        tabs: [
            { id: 'overview', label: 'Projekte', icon: 'layout-list' },
            { id: 'screens', label: 'Ansichten', icon: 'gallery-horizontal-end' },
            { id: 'details', label: 'Mehr-Ansicht', icon: 'panel-right-open' },
            { id: 'layout', label: 'Größen', icon: 'ruler' }
        ],
        getData: getProjectsStudioData,
        normalize: normalizeProjectsForStudio,
        preview: applyProjectsStudioData,
        commit(value) {
            applyProjectsStudioData(value);
            return saveData();
        },
        renderTab: renderProjectsTab,
        handleAction: handleProjectsAction
    });

    // Library uses the same draft/save lifecycle; no second editor or data store.
    function normalizeLibraryForStudio(value) {
        const source = value && typeof value === 'object' ? value : {};
        return {
            content: normalizeLibraryContent(source.content),
            items: normalizeLibraryBooks(source.items, state.data.schemaVersion, LIBRARY_REVISION)
                .filter(book => !isLibraryPlaceholder(book))
        };
    }

    function libraryStudioBookSummary(book) {
        return [book.author, book.readYear, book.topPosition ? `Top ${book.topPosition}` : ''].filter(Boolean).join(' · ');
    }

    function renderLibraryCoverPreview(book) {
        const src = getSafeImageUrl(book.img);
        return src ? `<img src="${esc(src)}" alt="Cover-Vorschau" decoding="async">` : '<i data-lucide="book-open"></i><span>Ohne Cover</span>';
    }

    function renderLibraryBookEditor(book, index) {
        const base = `items.${index}`;
        const embedded = String(book.img || '').startsWith('data:');
        return `
            <div class="admin-library-cover-row">
                <div class="admin-library-cover-preview" data-admin-library-cover-preview>${renderLibraryCoverPreview(book)}</div>
                <div class="admin-library-cover-actions">
                    <label class="admin-file-button">Cover auswählen<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-admin-library-cover="${esc(book.id)}"></label>
                    <button type="button" class="admin-reset-layout" data-admin-action="remove-library-cover" data-item-id="${esc(book.id)}" ${book.img ? '' : 'disabled'}>Cover entfernen</button>
                    <small>Optional. Bilder werden auf höchstens 640 px verkleinert. Ohne Bild bleibt die leere Buchhülle.</small>
                </div>
            </div>
            <div class="admin-field-grid">
                ${field({ label: 'Titel', path: `${base}.title`, value: book.title, wide: true })}
                ${field({ label: 'Autor', path: `${base}.author`, value: book.author, wide: true })}
                ${selectField({ label: 'Format', path: `${base}.medium`, value: book.medium, options: [
                    { value: 'book', label: 'Buch' }, { value: 'ebook', label: 'E-Book' }, { value: 'audiobook', label: 'Hörbuch' }
                ] })}
                <label class="admin-field"><span class="admin-field-label">Platz in den Top 5</span>
                    <select data-admin-library-position="${esc(book.id)}">
                        <option value="">Nicht in den Top 5</option>
                        ${[1, 2, 3, 4, 5].map(position => `<option value="${position}" ${position === book.topPosition ? 'selected' : ''}>Platz ${position}</option>`).join('')}
                    </select>
                </label>
                ${field({ label: 'Gelesen im Jahr (optional)', path: `${base}.readYear`, value: book.readYear ?? '', type: 'number', valueType: 'nullable-number', min: 1900, max: 2100, step: 1, help: 'Bücher aus dem aktuellen Jahr erscheinen in der bewegten Reihe.' })}
                ${field({ label: 'Fertig gelesen am (optional)', path: `${base}.dateFinished`, value: book.dateFinished || '', type: 'date', help: 'Wenn du das Datum weißt, wird das Jahr automatisch übernommen.' })}
                ${field({ label: 'Thema / Kategorie', path: `${base}.category`, value: book.category })}
                ${field({ label: 'Sprache', path: `${base}.language`, value: book.language })}
                ${field({ label: 'Originaltitel (optional)', path: `${base}.originalTitle`, value: book.originalTitle, wide: true })}
                ${textareaField({ label: 'Was ich mitgenommen habe', path: `${base}.takeaway`, value: book.takeaway, rows: 5 })}
                ${textareaField({ label: 'Wie ich es nutze', path: `${base}.application`, value: book.application, rows: 4 })}
                ${field({ label: 'Cover-Pfad oder Bildadresse', path: `${base}.img`, value: embedded ? '' : book.img, wide: true, placeholder: embedded ? 'Hochgeladenes Cover ist hinterlegt' : 'assets/books/mein-buch.webp', help: 'Ein neuer Pfad ersetzt das bisherige Cover. Lokale Bilddateien eignen sich besonders für eine große Bibliothek.' })}
                ${field({ label: 'Bildbeschreibung (optional)', path: `${base}.coverAlt`, value: book.coverAlt || '', wide: true, help: 'Ohne eigenen Text wird der Buchtitel verwendet.' })}
            </div>
        `;
    }

    function renderLibraryBooksTab(draft) {
        return renderCollectionManager({
            title: `Bücher (${draft.items.length})`,
            description: 'Buch auswählen, bearbeiten und erst danach speichern. Die Pfeile ändern die Reihenfolge im Katalog, nicht die Plätze in den Top 5.',
            collectionPath: 'items', items: draft.items,
            addLabel: 'Buch hinzufügen', filterable: true,
            emptyLabel: 'Noch keine Bücher. Die fünf freien Plätze auf der Seite bleiben erhalten.',
            nameForItem: book => book.title,
            detailForItem: libraryStudioBookSummary,
            editorForItem: renderLibraryBookEditor
        });
    }

    function renderLibraryFavoritesTab(draft) {
        return sectionBlock('Fünf, die bleiben', 'Jedes Buch kann nur einmal vorkommen. Ist es schon in den Top 5, werden die beiden Plätze getauscht. Entfernte Favoriten bleiben im Katalog.', `
            <div class="admin-library-favorites">
                ${[1, 2, 3, 4, 5].map(position => {
                    const current = draft.items.find(book => book.topPosition === position);
                    return `<div class="admin-library-favorite">
                        <div class="admin-library-cover-preview is-small">${renderLibraryCoverPreview(current || {})}</div>
                        <label class="admin-field"><span class="admin-field-label">Platz ${position}</span>
                            <select data-admin-library-slot="${position}">
                                <option value="">Freier Platz</option>
                                ${draft.items.map(book => `<option value="${esc(book.id)}" ${book === current ? 'selected' : ''}>${esc(book.title || 'Buch ohne Titel')}${book.author ? ` — ${esc(book.author)}` : ''}</option>`).join('')}
                            </select>
                        </label>
                        ${current ? `<button type="button" class="admin-studio-icon-btn" data-admin-action="edit-library-favorite" data-item-id="${esc(current.id)}" aria-label="${esc(current.title)} bearbeiten"><i data-lucide="pencil"></i></button>` : ''}
                    </div>`;
                }).join('')}
            </div>
        `);
    }

    function renderLibraryTextsTab(draft) {
        const labels = [
            ['Überschrift', 'sectionTitle'], ['Unter der Überschrift', 'favoritesTitle'],
            ['Überschrift der bewegten Reihe', 'streamTitle'], ['Button zum Katalog', 'allBooksLabel'],
            ['Titel im Katalog', 'archiveTitle'], ['Suchfeld-Platzhalter', 'searchPlaceholder'],
            ['Wenn die Suche nichts findet', 'emptySearch'], ['Wenn im aktuellen Jahr kein Buch eingetragen ist', 'emptyStream'],
            ['Überschrift der Notizen', 'takeawayLabel'], ['Überschrift der Anwendung', 'applicationLabel'],
            ['Wenn persönliche Notizen noch fehlen', 'emptyNotes']
        ];
        return sectionBlock('Texte der Bibliothek', 'Die Gestaltung bleibt gleich. Hier kannst du Überschriften, Beschriftungen und Hinweistexte ändern. Leere Felder verwenden den bisherigen Standardtext.', `
            <div class="admin-field-grid">${labels.map(([label, key]) => field({ label, path: `content.${key}`, value: draft.content[key], wide: true })).join('')}</div>
            <div class="admin-layout-note admin-library-save-note"><i data-lucide="hard-drive-download"></i><p>Speichern gilt für diesen Browser. Exportiere danach oben <strong>data.json</strong> als Sicherung. Das veröffentlicht die Änderungen noch nicht auf anderen Geräten.</p></div>
        `);
    }

    function assignLibraryStudioFavorite(draft, itemId, position) {
        const selected = draft.items.find(book => String(book.id) === String(itemId));
        const oldPosition = selected?.topPosition || null;
        const occupant = position ? draft.items.find(book => book.topPosition === position && book !== selected) : null;
        if (occupant) {
            occupant.topPosition = oldPosition;
            occupant.top = Boolean(oldPosition);
        }
        if (selected) {
            selected.topPosition = position;
            selected.top = Boolean(position);
        }
    }

    function addLibraryStudioBook(draft) {
        const book = {
            ...createEmptyLibraryBook(null), id: createId('book'), title: 'Neues Buch',
            isPlaceholder: false, top: false, readYear: new Date().getFullYear(),
            dateAdded: new Date().toISOString().slice(0, 10), originalTitle: '', coverAlt: ''
        };
        draft.items.push(book);
        uiState.activeTabId = 'books';
        uiState.selectedItems.set('items', book.id);
        uiState.filters.delete('library:items');
        return book;
    }

    function handleLibraryAction(action, button, draft) {
        const itemId = button.dataset.itemId;
        const index = draft.items.findIndex(book => String(book.id) === String(itemId));
        if (action === 'add-collection') {
            addLibraryStudioBook(draft);
            return { message: 'Neues Buch angelegt – noch nicht gespeichert.' };
        }
        if (action === 'edit-collection') {
            if (uiState.selectedItems.get('items') === itemId) uiState.selectedItems.delete('items');
            else uiState.selectedItems.set('items', itemId);
            return { dirty: false };
        }
        if (index < 0) return null;
        if (action === 'edit-library-favorite') {
            uiState.activeTabId = 'books';
            uiState.selectedItems.set('items', itemId);
            uiState.filters.delete('library:items');
            renderTabs(getActiveSection());
            return { dirty: false, preserveScroll: false };
        }
        if (action === 'delete-collection') {
            if (!window.confirm(`„${draft.items[index].title || 'Dieses Buch'}“ löschen? Bis zum Speichern kannst du die Änderung verwerfen.`)) return null;
            draft.items.splice(index, 1);
            uiState.selectedItems.delete('items');
            return { message: 'Buch entfernt. Ein freier Top-5-Platz bleibt als leere Buchhülle sichtbar.' };
        }
        if (action === 'move-collection') {
            const target = index + Number(button.dataset.direction);
            if (target < 0 || target >= draft.items.length) return null;
            [draft.items[index], draft.items[target]] = [draft.items[target], draft.items[index]];
            return { message: 'Katalog-Reihenfolge geändert – noch nicht gespeichert.' };
        }
        if (action === 'remove-library-cover') {
            uiState.uploadToken += 1;
            uiState.pendingImage = false;
            draft.items[index].img = '';
            return { message: 'Cover entfernt – noch nicht gespeichert.' };
        }
        return null;
    }

    async function uploadLibraryCover(input, draft) {
        const file = input.files?.[0];
        const book = draft.items.find(item => String(item.id) === input.dataset.adminLibraryCover);
        if (!file || !book) return;
        const token = ++uiState.uploadToken;
        uiState.pendingImage = true;
        input.disabled = true;
        updateDirtyState();
        setStudioStatus('Cover wird verkleinert …', 'info');
        try {
            const image = await optimizeImageFile(file, 640, 0.75);
            // A late upload must never write into another book, section or closed session.
            if (token !== uiState.uploadToken || uiState.draft !== draft || !draft.items.includes(book)
                || uiState.activeSectionId !== 'library' || !document.body.classList.contains('admin-studio-open')) return;
            book.img = image;
            markDirty('Cover vorbereitet – noch nicht gespeichert.');
            renderActiveTab({ preserveScroll: true });
            uiState.body.querySelector('[data-admin-library-cover]')?.focus({ preventScroll: true });
        } catch (error) {
            if (token === uiState.uploadToken) setStudioStatus(error.message || 'Cover konnte nicht geladen werden.', 'error');
        } finally {
            if (token === uiState.uploadToken) {
                uiState.pendingImage = false;
                updateDirtyState();
            }
            input.disabled = false;
            input.value = '';
        }
    }

    function handleLibraryChange(event, draft) {
        const slot = event.target.closest('[data-admin-library-slot]');
        const bookPosition = event.target.closest('[data-admin-library-position]');
        if (slot || bookPosition) {
            assignLibraryStudioFavorite(draft, slot ? slot.value : bookPosition.dataset.adminLibraryPosition,
                normalizeLibraryTopPosition(slot ? slot.dataset.adminLibrarySlot : bookPosition.value));
            markDirty('Top 5 aktualisiert – noch nicht gespeichert.');
            renderActiveTab({ preserveScroll: true });
            const attribute = slot ? 'data-admin-library-slot' : 'data-admin-library-position';
            const key = (slot || bookPosition).getAttribute(attribute);
            [...uiState.body.querySelectorAll(`[${attribute}]`)].find(input => input.getAttribute(attribute) === key)?.focus({ preventScroll: true });
            return true;
        }
        const upload = event.target.closest('[data-admin-library-cover]');
        if (!upload) return false;
        uploadLibraryCover(upload, draft);
        return true;
    }

    function afterLibraryInput(input, draft) {
        const match = input.dataset.adminPath.match(/^items\.(\d+)\.(.+)$/);
        if (!match) return;
        const book = draft.items[Number(match[1])];
        const key = match[2];
        if (!book) return;
        if (key === 'dateFinished' && /^\d{4}-\d{2}-\d{2}$/.test(book.dateFinished || '')) {
            book.readYear = Number(book.dateFinished.slice(0, 4));
            const yearInput = uiState.body.querySelector(`[data-admin-path="items.${match[1]}.readYear"]`);
            if (yearInput) yearInput.value = book.readYear;
        }
        const row = input.closest('.admin-collection-entry');
        if (row && ['title', 'author', 'readYear', 'dateFinished'].includes(key)) {
            row.querySelector('.admin-collection-main strong').textContent = book.title || 'Buch ohne Titel';
            const detail = row.querySelector('.admin-collection-main small');
            if (detail) detail.textContent = libraryStudioBookSummary(book);
            row.dataset.searchText = `${book.title} ${libraryStudioBookSummary(book)}`.toLocaleLowerCase('de-DE');
        }
        if (key === 'img') {
            uiState.uploadToken += 1;
            uiState.pendingImage = false;
            const preview = uiState.body.querySelector('[data-admin-library-cover-preview]');
            if (preview) preview.innerHTML = renderLibraryCoverPreview(book);
            const remove = uiState.body.querySelector('[data-admin-action="remove-library-cover"]');
            if (remove) remove.disabled = !book.img;
        }
    }

    function validateLibraryStudio(draft) {
        for (const [index, book] of draft.items.entries()) {
            let key = '', message = '';
            if (!String(book.title || '').trim()) {
                key = 'title'; message = 'Bitte gib jedem Buch einen Titel.';
            } else if (book.readYear != null && !normalizeLibraryReadYear(book.readYear)) {
                key = 'readYear'; message = 'Bitte trage ein ganzes Jahr zwischen 1900 und 2100 ein oder lass das Feld leer.';
            } else if (book.dateFinished) {
                const date = new Date(`${book.dateFinished}T12:00:00Z`);
                if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== book.dateFinished) {
                    key = 'dateFinished'; message = 'Bitte prüfe das Lesedatum.';
                } else if (Number(book.dateFinished.slice(0, 4)) !== Number(book.readYear)) {
                    key = 'readYear'; message = 'Das Jahr und das genaue Lesedatum passen nicht zusammen.';
                }
            }
            if (!message && book.img && (!getSafeImageUrl(book.img) || /^blob:/i.test(book.img.trim()))) {
                key = 'img'; message = 'Bitte wähle ein Cover aus oder nutze einen dauerhaften Bildpfad bzw. eine https-Adresse.';
            }
            if (message) return { message, tabId: 'books', itemId: book.id, path: `items.${index}.${key}` };
        }
        return null;
    }

    function applyLibraryStudioData(value) {
        const books = normalizeLibraryBooks(value.items, state.data.schemaVersion, LIBRARY_REVISION);
        const previous = getLibraryBooks();
        const visualKeys = ['id', 'title', 'author', 'img', 'coverAlt', 'top', 'topPosition', 'readYear', 'dateFinished', 'isPlaceholder'];
        const visualsChanged = books.length !== previous.length || books.some((book, index) =>
            visualKeys.some(key => book[key] !== previous[index]?.[key]));
        state.data.books = books;
        state.data.libraryContent = normalizeLibraryContent(value.content);
        // Notes and labels do not restart the moving shelf on every keystroke.
        if (visualsChanged) renderBooks();
        else renderLibraryContent();
    }

    registerSection({
        id: 'library', label: 'Bibliothek', icon: 'library-big', itemCollection: 'items',
        tabs: [
            { id: 'books', label: 'Bücher', icon: 'book-open' },
            { id: 'favorites', label: 'Top 5', icon: 'star' },
            { id: 'texts', label: 'Texte', icon: 'type' }
        ],
        getData: () => ({ content: state.data.libraryContent, items: state.data.books }),
        normalize: normalizeLibraryForStudio,
        onOpen(draft, options) {
            const modal = document.getElementById('global-modal');
            const modalOpen = modal && !modal.classList.contains('hidden');
            if (libraryDrawerOpen || modalOpen) uiState.returnFocus = document.querySelector('#books .library-admin-add');
            if (modalOpen && typeof closeModal === 'function') closeModal({ immediate: true, restoreFocus: false });
            setLibraryDrawerOpen(false, { immediate: true });
            if (options.itemId) uiState.filters.delete('library:items');
            if (options.newBook) {
                addLibraryStudioBook(draft);
                return { dirty: true, message: 'Neues Buch angelegt – noch nicht gespeichert.' };
            }
        },
        preview: applyLibraryStudioData,
        commit(value) { applyLibraryStudioData(value); return saveData(); },
        validate: validateLibraryStudio,
        renderTab(tabId, draft) {
            if (tabId === 'favorites') return renderLibraryFavoritesTab(draft);
            if (tabId === 'texts') return renderLibraryTextsTab(draft);
            return renderLibraryBooksTab(draft);
        },
        handleAction: handleLibraryAction,
        handleChange: handleLibraryChange,
        afterInput: afterLibraryInput
    });

    // Documents share the same draft, preview and save lifecycle as every other Studio section.
    function normalizeDocumentsForStudio(value) {
        const source = value && typeof value === 'object' ? value : {};
        return {
            content: normalizeDocumentsContent(source.content),
            items: normalizeDocuments(source.items, DOCUMENTS_REVISION)
        };
    }

    function documentStudioSummary(documentItem) {
        const position = normalizeDocumentFeaturedPosition(documentItem.featuredPosition);
        return [
            documentItem.code,
            documentItem.category,
            documentItem.year,
            position ? `Startplatz ${position}` : ''
        ].filter(Boolean).join(' · ');
    }

    function renderDocumentStudioPreview(documentItem, { small = false } = {}) {
        const src = getSafeImageUrl(documentItem?.img);
        const icon = normalizeIconName(documentItem?.icon, 'file-text');
        return `
            <div class="admin-document-preview${small ? ' is-small' : ''}" data-admin-document-preview>
                ${src
                    ? `<img src="${esc(src)}" alt="Vorschau von ${esc(documentItem?.title || 'Dokument')}" decoding="async">`
                    : `<i data-lucide="${esc(icon)}"></i><span>Ohne Vorschau</span>`}
            </div>
        `;
    }

    function renderDocumentEditor(documentItem, index) {
        const base = `items.${index}`;
        const embeddedPreview = String(documentItem.img || '').startsWith('data:');
        const primaryPath = documentItem.fileUrl === '#' ? '' : documentItem.fileUrl;
        const originalPath = documentItem.originalFileUrl === '#' ? '' : documentItem.originalFileUrl;
        return `
            <div class="admin-document-preview-row">
                ${renderDocumentStudioPreview(documentItem)}
                <div class="admin-document-preview-actions">
                    <label class="admin-file-button">Vorschaubild auswählen<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-admin-document-image="${esc(documentItem.id)}"></label>
                    <button type="button" class="admin-reset-layout" data-admin-action="remove-document-image" data-item-id="${esc(documentItem.id)}" ${documentItem.img ? '' : 'disabled'}>Vorschau entfernen</button>
                    <small>Optional. Das Bild wird verkleinert und nur als Vorschau verwendet – die PDF-Datei bleibt separat.</small>
                </div>
            </div>
            <div class="admin-field-grid">
                ${field({ label: 'Titel', path: `${base}.title`, value: documentItem.title, wide: true })}
                ${field({ label: 'Dokument-Code', path: `${base}.code`, value: documentItem.code, placeholder: 'DOC-01' })}
                ${field({ label: 'Kategorie', path: `${base}.category`, value: documentItem.category, placeholder: 'Bildung' })}
                ${field({ label: 'Jahr (optional)', path: `${base}.year`, value: documentItem.year, type: 'number', min: 1900, max: 2100, step: 1 })}
                ${field({ label: 'Dateigröße (optional)', path: `${base}.size`, value: documentItem.size, placeholder: '1,2 MB' })}
                ${field({ label: 'Dateityp', path: `${base}.ext`, value: documentItem.ext, placeholder: 'PDF' })}
                ${field({ label: 'Lucide-Icon', path: `${base}.icon`, value: documentItem.icon, placeholder: 'file-text', help: 'Zum Beispiel: file-text, file-badge, graduation-cap.' })}
                ${field({ label: 'Dateipfad oder URL', path: `${base}.fileUrl`, value: primaryPath, wide: true, placeholder: 'assets/documents/dokument.pdf', help: 'Wird für Ansehen und Herunterladen verwendet. Relative Pfade bleiben auch nach dem Kopieren des Projekts funktionsfähig.' })}
                ${checkboxField({ label: 'Button „Original“ anzeigen', path: `${base}.hasOriginal`, checked: documentItem.hasOriginal === true, help: 'Sinnvoll, wenn zusätzlich eine nicht übersetzte Originaldatei vorhanden ist oder später ergänzt wird.' })}
                ${field({ label: 'Pfad zum Original (optional)', path: `${base}.originalFileUrl`, value: originalPath, wide: true, placeholder: 'assets/documents/dokument-original.pdf' })}
                ${field({ label: 'Pfad zum Vorschaubild (optional)', path: `${base}.img`, value: embeddedPreview ? '' : documentItem.img, wide: true, placeholder: embeddedPreview ? 'Hochgeladenes Vorschaubild ist hinterlegt' : 'assets/documents/vorschau.webp', help: 'Ein neuer Pfad ersetzt ein hochgeladenes Vorschaubild.' })}
            </div>
        `;
    }

    function renderDocumentsListTab(draft) {
        return `${renderCollectionManager({
            title: `Dokumente (${draft.items.length})`,
            description: 'Dokument auswählen, bearbeiten und erst danach speichern. Die Pfeile ändern nur die Reihenfolge im vollständigen Archiv.',
            collectionPath: 'items', items: draft.items,
            addLabel: 'Dokument hinzufügen', filterable: true,
            emptyLabel: 'Noch keine Dokumente vorhanden.',
            nameForItem: documentItem => documentItem.title,
            detailForItem: documentStudioSummary,
            editorForItem: renderDocumentEditor
        })}
        <div class="admin-layout-note admin-library-save-note"><i data-lucide="folder-open"></i><p>PDF-Dateien werden nicht in <strong>data.json</strong> eingebettet. Lege sie im Projekt ab und trage hier einen relativen Pfad ein, zum Beispiel <strong>assets/documents/zeugnis.pdf</strong>.</p></div>`;
    }

    function renderDocumentsFeaturedTab(draft) {
        return sectionBlock('Vier Hauptdokumente', 'Diese vier Plätze erscheinen direkt in der kompakten Dokumentenansicht. Ein Dokument kann nur einen Platz belegen.', `
            <div class="admin-document-slots">
                ${[1, 2, 3, 4].map(position => {
                    const current = draft.items.find(documentItem => normalizeDocumentFeaturedPosition(documentItem.featuredPosition) === position);
                    return `<div class="admin-document-slot">
                        ${renderDocumentStudioPreview(current || {}, { small: true })}
                        <label class="admin-field"><span class="admin-field-label">Platz ${position}</span>
                            <select data-admin-document-slot="${position}">
                                <option value="">Freier Platz</option>
                                ${draft.items.map(documentItem => `<option value="${esc(documentItem.id)}" ${documentItem === current ? 'selected' : ''}>${esc(documentItem.title || 'Dokument ohne Titel')}${documentItem.code ? ` — ${esc(documentItem.code)}` : ''}</option>`).join('')}
                            </select>
                        </label>
                        ${current ? `<button type="button" class="admin-studio-icon-btn" data-admin-action="edit-document-featured" data-item-id="${esc(current.id)}" aria-label="${esc(current.title)} bearbeiten"><i data-lucide="pencil"></i></button>` : ''}
                    </div>`;
                }).join('')}
            </div>
        `);
    }

    function renderDocumentsTextsTab(draft) {
        const labels = [
            ['Überschrift', 'sectionTitle'], ['Unter der Überschrift', 'subtitle'],
            ['Button zum Archiv', 'allDocumentsLabel'], ['Kennzeichnung im Archiv', 'archiveKicker'],
            ['Titel im Archiv', 'archiveTitle'], ['Metadaten: Kategorie', 'categoryLabel'],
            ['Metadaten: Jahr', 'yearLabel'], ['Metadaten: Dateityp', 'fileTypeLabel'],
            ['Button: Ansehen', 'viewLabel'], ['Button: Herunterladen', 'downloadLabel'],
            ['Button: Original', 'originalLabel'], ['Button: Übersetzung', 'translationLabel'],
            ['Text bei leerem Archiv', 'emptyLabel']
        ];
        return sectionBlock('Texte der Dokumente', 'Hier lassen sich alle sichtbaren Überschriften und Beschriftungen ändern. Das Layout bleibt dabei unverändert.', `
            <div class="admin-field-grid">${labels.map(([label, key]) => field({ label, path: `content.${key}`, value: draft.content[key], wide: true })).join('')}</div>
            <div class="admin-layout-note admin-library-save-note"><i data-lucide="hard-drive-download"></i><p>Speichern gilt für diesen Browser. Exportiere danach oben <strong>data.json</strong> als Sicherung.</p></div>
        `);
    }

    function assignDocumentStudioSlot(draft, itemId, position) {
        const selected = draft.items.find(documentItem => String(documentItem.id) === String(itemId));
        const oldPosition = normalizeDocumentFeaturedPosition(selected?.featuredPosition);
        const occupant = position
            ? draft.items.find(documentItem => normalizeDocumentFeaturedPosition(documentItem.featuredPosition) === position && documentItem !== selected)
            : null;
        if (occupant) {
            occupant.featuredPosition = oldPosition;
            occupant.featured = Boolean(oldPosition);
        }
        if (selected) {
            selected.featuredPosition = position;
            selected.featured = Boolean(position);
        }
    }

    function getNextDocumentCode(items) {
        const highest = items.reduce((current, documentItem) => {
            const match = String(documentItem.code || '').match(/^DOC-(\d+)$/i);
            return match ? Math.max(current, Number(match[1])) : current;
        }, 0);
        return `DOC-${String(highest + 1).padStart(2, '0')}`;
    }

    function addDocumentsStudioItem(draft) {
        const documentItem = {
            id: createId('document'), code: getNextDocumentCode(draft.items), title: 'Neues Dokument',
            category: '', year: String(new Date().getFullYear()), size: '', ext: 'PDF', icon: 'file-text',
            img: '', fileUrl: '#', originalFileUrl: '', hasOriginal: false,
            featured: false, featuredPosition: null
        };
        draft.items.push(documentItem);
        uiState.activeTabId = 'documents';
        uiState.selectedItems.set('items', documentItem.id);
        uiState.filters.delete('documents:items');
        return documentItem;
    }

    function handleDocumentsAction(action, button, draft) {
        const itemId = button.dataset.itemId;
        const index = draft.items.findIndex(documentItem => String(documentItem.id) === String(itemId));
        if (action === 'add-collection') {
            addDocumentsStudioItem(draft);
            return { message: 'Neues Dokument angelegt – noch nicht gespeichert.' };
        }
        if (action === 'edit-collection') {
            if (uiState.selectedItems.get('items') === itemId) uiState.selectedItems.delete('items');
            else uiState.selectedItems.set('items', itemId);
            return { dirty: false };
        }
        if (index < 0) return null;
        if (action === 'edit-document-featured') {
            uiState.activeTabId = 'documents';
            uiState.selectedItems.set('items', itemId);
            uiState.filters.delete('documents:items');
            renderTabs(getActiveSection());
            return { dirty: false, preserveScroll: false };
        }
        if (action === 'delete-collection') {
            if (!window.confirm(`„${draft.items[index].title || 'Dieses Dokument'}“ löschen? Bis zum Speichern kannst du die Änderung verwerfen.`)) return null;
            draft.items.splice(index, 1);
            uiState.selectedItems.delete('items');
            return { message: 'Dokument entfernt – noch nicht gespeichert.' };
        }
        if (action === 'move-collection') {
            const target = index + Number(button.dataset.direction);
            if (target < 0 || target >= draft.items.length) return null;
            [draft.items[index], draft.items[target]] = [draft.items[target], draft.items[index]];
            return { message: 'Archiv-Reihenfolge geändert – noch nicht gespeichert.' };
        }
        if (action === 'remove-document-image') {
            uiState.uploadToken += 1;
            uiState.pendingImage = false;
            draft.items[index].img = '';
            return { message: 'Vorschaubild entfernt – noch nicht gespeichert.' };
        }
        return null;
    }

    async function uploadDocumentStudioImage(input, draft) {
        const file = input.files?.[0];
        const documentItem = draft.items.find(item => String(item.id) === input.dataset.adminDocumentImage);
        if (!file || !documentItem) return;
        const token = ++uiState.uploadToken;
        uiState.pendingImage = true;
        input.disabled = true;
        updateDirtyState();
        setStudioStatus('Vorschaubild wird verkleinert …', 'info');
        try {
            const image = await optimizeImageFile(file, 1200, 0.8);
            if (token !== uiState.uploadToken || uiState.draft !== draft || !draft.items.includes(documentItem)
                || uiState.activeSectionId !== 'documents' || !document.body.classList.contains('admin-studio-open')) return;
            documentItem.img = image;
            markDirty('Vorschaubild vorbereitet – noch nicht gespeichert.');
            renderActiveTab({ preserveScroll: true });
            uiState.body.querySelector('[data-admin-document-image]')?.focus({ preventScroll: true });
        } catch (error) {
            if (token === uiState.uploadToken) setStudioStatus(error.message || 'Vorschaubild konnte nicht geladen werden.', 'error');
        } finally {
            if (token === uiState.uploadToken) {
                uiState.pendingImage = false;
                updateDirtyState();
            }
            input.disabled = false;
            input.value = '';
        }
    }

    function handleDocumentsChange(event, draft) {
        const slot = event.target.closest('[data-admin-document-slot]');
        if (slot) {
            assignDocumentStudioSlot(draft, slot.value, normalizeDocumentFeaturedPosition(slot.dataset.adminDocumentSlot));
            markDirty('Hauptdokumente aktualisiert – noch nicht gespeichert.');
            renderActiveTab({ preserveScroll: true });
            uiState.body.querySelector(`[data-admin-document-slot="${slot.dataset.adminDocumentSlot}"]`)?.focus({ preventScroll: true });
            return true;
        }
        const upload = event.target.closest('[data-admin-document-image]');
        if (!upload) return false;
        uploadDocumentStudioImage(upload, draft);
        return true;
    }

    function afterDocumentsInput(input, draft) {
        const match = input.dataset.adminPath.match(/^items\.(\d+)\.(.+)$/);
        if (!match) return;
        const documentItem = draft.items[Number(match[1])];
        const key = match[2];
        if (!documentItem) return;
        const row = input.closest('.admin-collection-entry');
        if (row && ['title', 'code', 'category', 'year'].includes(key)) {
            row.querySelector('.admin-collection-main strong').textContent = documentItem.title || 'Dokument ohne Titel';
            const detail = row.querySelector('.admin-collection-main small');
            if (detail) detail.textContent = documentStudioSummary(documentItem);
            row.dataset.searchText = `${documentItem.title} ${documentStudioSummary(documentItem)}`.toLocaleLowerCase('de-DE');
        }
        if (key === 'img') {
            uiState.uploadToken += 1;
            uiState.pendingImage = false;
            const preview = uiState.body.querySelector('[data-admin-document-preview]');
            if (preview) preview.outerHTML = renderDocumentStudioPreview(documentItem);
            const remove = uiState.body.querySelector('[data-admin-action="remove-document-image"]');
            if (remove) remove.disabled = !documentItem.img;
        }
    }

    function isPersistentDocumentPath(value, { image = false } = {}) {
        const raw = String(value || '').trim();
        if (!raw || raw === '#') return true;
        if (/^blob:/i.test(raw)) return false;
        return image ? Boolean(getSafeImageUrl(raw)) : getSafeLinkUrl(raw) !== '#';
    }

    function validateDocumentsStudio(draft) {
        for (const [index, documentItem] of draft.items.entries()) {
            let key = '';
            let message = '';
            const year = String(documentItem.year || '').trim();
            if (!String(documentItem.title || '').trim()) {
                key = 'title';
                message = 'Bitte gib jedem Dokument einen Titel.';
            } else if (year && (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2100)) {
                key = 'year';
                message = 'Bitte trage ein ganzes Jahr zwischen 1900 und 2100 ein oder lass das Feld leer.';
            } else if (!isPersistentDocumentPath(documentItem.fileUrl)) {
                key = 'fileUrl';
                message = 'Bitte nutze einen dauerhaften Dateipfad oder eine https-Adresse.';
            } else if (!isPersistentDocumentPath(documentItem.originalFileUrl)) {
                key = 'originalFileUrl';
                message = 'Bitte prüfe den Pfad zur Originaldatei.';
            } else if (!isPersistentDocumentPath(documentItem.img, { image: true })) {
                key = 'img';
                message = 'Bitte wähle ein Vorschaubild aus oder nutze einen dauerhaften Bildpfad bzw. eine https-Adresse.';
            }
            if (message) return { message, tabId: 'documents', itemId: documentItem.id, path: `items.${index}.${key}` };
        }
        return null;
    }

    function applyDocumentsStudioData(value) {
        state.data.documentsContent = normalizeDocumentsContent(value.content);
        state.data.documents = normalizeDocuments(value.items, DOCUMENTS_REVISION);
        renderDocuments();
    }

    registerSection({
        id: 'documents', label: 'Dokumente', icon: 'files', itemCollection: 'items',
        tabs: [
            { id: 'documents', label: 'Dokumente', icon: 'files' },
            { id: 'featured', label: 'Startseite', icon: 'layout-grid' },
            { id: 'texts', label: 'Texte', icon: 'type' }
        ],
        getData: () => ({ content: state.data.documentsContent, items: state.data.documents }),
        normalize: normalizeDocumentsForStudio,
        onOpen(draft, options) {
            const modal = document.getElementById('global-modal');
            const modalOpen = modal && !modal.classList.contains('hidden');
            if (documentsDrawerOpen || modalOpen) uiState.returnFocus = document.querySelector('#documents .documents-admin-add');
            if (modalOpen && typeof closeModal === 'function') closeModal({ immediate: true, restoreFocus: false });
            setDocumentsDrawerOpen(false, { immediate: true });
            if (options.itemId) uiState.filters.delete('documents:items');
            if (options.newDocument) {
                addDocumentsStudioItem(draft);
                return { dirty: true, message: 'Neues Dokument angelegt – noch nicht gespeichert.' };
            }
        },
        preview: applyDocumentsStudioData,
        commit(value) { applyDocumentsStudioData(value); return saveData(); },
        validate: validateDocumentsStudio,
        renderTab(tabId, draft) {
            if (tabId === 'featured') return renderDocumentsFeaturedTab(draft);
            if (tabId === 'texts') return renderDocumentsTextsTab(draft);
            return renderDocumentsListTab(draft);
        },
        handleAction: handleDocumentsAction,
        handleChange: handleDocumentsChange,
        afterInput: afterDocumentsInput
    });

    // Blog editing keeps unpublished work inside the shared draft/save lifecycle.
    function normalizeBlogForStudio(value) {
        const source = value && typeof value === 'object' ? value : {};
        return {
            content: normalizeBlogContent(source.content),
            items: normalizeBlogs(source.items, BLOG_REVISION)
        };
    }

    function getBlogStudioWordCount(post) {
        const text = `${post?.excerpt || ''} ${post?.contentMarkdown || ''}`
            .replace(/[#>*_`[\]()]/g, ' ')
            .trim();
        return text ? text.split(/\s+/u).filter(Boolean).length : 0;
    }

    function getBlogStudioReadingMinutes(post) {
        return Math.max(1, Math.ceil(getBlogStudioWordCount(post) / 200));
    }

    function blogStudioSummary(post, draft) {
        const category = draft.content.categories.find(item => item.key === post.category)?.label || post.category;
        const status = post.status === 'draft' ? 'Entwurf' : 'Veröffentlicht';
        return [status, post.publishedAt || 'Ohne Datum', category, post.featured ? 'Hauptbeitrag' : ''].filter(Boolean).join(' · ');
    }

    function renderBlogStudioCoverPreview(post) {
        const src = getSafeImageUrl(post?.cover);
        return `
            <div class="admin-blog-cover-preview" data-admin-blog-cover-preview>
                ${src
                    ? `<img src="${esc(src)}" alt="Titelbild von ${esc(post?.title || 'Beitrag')}" decoding="async">`
                    : `<i data-lucide="image"></i><span>Typografisches Motiv</span>`}
            </div>
        `;
    }

    function renderBlogPostEditor(post, index, draft) {
        const base = `items.${index}`;
        const embeddedCover = String(post.cover || '').startsWith('data:');
        const words = getBlogStudioWordCount(post);
        return `
            <div class="admin-blog-post-status">
                <span class="admin-blog-state" data-state="${post.status === 'draft' ? 'draft' : 'published'}">${post.status === 'draft' ? 'Entwurf' : 'Veröffentlicht'}</span>
                <span data-admin-blog-stats>${words} Wörter · etwa ${getBlogStudioReadingMinutes(post)} Min.</span>
            </div>
            <div class="admin-field-grid">
                ${field({ label: 'Titel', path: `${base}.title`, value: post.title, wide: true })}
                ${field({ label: 'Adresse', path: `${base}.slug`, value: post.slug, wide: true, placeholder: 'mein-beitrag', help: 'Nur der Teil nach #blog/. Bestehende Links bleiben stabil, solange du diese Adresse nicht änderst.' })}
                <div class="admin-blog-slug-action"><button type="button" class="admin-reset-layout" data-admin-action="blog-slug-from-title" data-item-id="${esc(post.id)}"><i data-lucide="wand-sparkles"></i>Aus Titel erzeugen</button></div>
                ${field({ label: 'Datum', path: `${base}.publishedAt`, value: post.publishedAt, type: 'date' })}
                ${selectField({ label: 'Status', path: `${base}.status`, value: post.status, options: [
                    { value: 'draft', label: 'Entwurf – nur im Admin Mode' },
                    { value: 'published', label: 'Veröffentlicht' }
                ] })}
                ${selectField({ label: 'Thema', path: `${base}.category`, value: post.category, options: draft.content.categories.map(item => ({ value: item.key, label: item.label })) })}
                ${selectField({ label: 'Format', path: `${base}.type`, value: post.type, options: draft.content.types.map(item => ({ value: item.key, label: item.label })) })}
                ${field({ label: 'Tags', path: `${base}.tags`, value: (post.tags || []).join(', '), valueType: 'tags', wide: true, placeholder: 'Website, Design, JSON', help: 'Maximal drei kurze Tags, mit Komma getrennt.' })}
                ${textareaField({ label: 'Kurze Vorschau', path: `${base}.excerpt`, value: post.excerpt, rows: 3, help: 'Ein bis zwei klare Sätze für die Startseite und das Archiv.' })}
                ${textareaField({ label: 'Beitragstext', path: `${base}.contentMarkdown`, value: post.contentMarkdown, rows: 14, help: 'Absätze mit einer Leerzeile trennen. Möglich sind ## Überschrift, ### Untertitel, - Liste, 1. Liste, > Zitat, **fett** und `Code`.' })}
                ${textareaField({ label: 'Was sich geändert hat (optional)', path: `${base}.result`, value: post.result, rows: 3 })}
                ${textareaField({ label: 'Nächster Schritt (optional)', path: `${base}.nextStep`, value: post.nextStep, rows: 3 })}
            </div>
            <div class="admin-blog-cover-row">
                ${renderBlogStudioCoverPreview(post)}
                <div class="admin-blog-cover-actions">
                    <label class="admin-file-button">Titelbild auswählen<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-admin-blog-cover="${esc(post.id)}"></label>
                    <button type="button" class="admin-reset-layout" data-admin-action="remove-blog-cover" data-item-id="${esc(post.id)}" ${post.cover ? '' : 'disabled'}>Titelbild entfernen</button>
                    <small>Ohne Bild verwendet der Blog weiter sein typografisches Motiv. Hochgeladene Bilder werden automatisch verkleinert.</small>
                </div>
            </div>
            <div class="admin-field-grid">
                ${field({ label: 'Bildpfad oder URL (optional)', path: `${base}.cover`, value: embeddedCover ? '' : post.cover, wide: true, placeholder: embeddedCover ? 'Hochgeladenes Titelbild ist hinterlegt' : 'assets/blog/beitrag.webp', help: 'Ein neuer Pfad ersetzt ein hochgeladenes Bild.' })}
                ${field({ label: 'Bildbeschreibung (optional)', path: `${base}.coverAlt`, value: post.coverAlt, wide: true, placeholder: 'Was ist auf dem Bild zu sehen?' })}
            </div>
        `;
    }

    function renderBlogPostsTab(draft) {
        const published = draft.items.filter(post => post.status !== 'draft').length;
        const drafts = draft.items.length - published;
        return `
            <div class="admin-blog-summary-strip" aria-label="Blogübersicht">
                <span><strong>${draft.items.length}</strong>Gesamt</span>
                <span><strong>${published}</strong>Online</span>
                <span><strong>${drafts}</strong>Entwürfe</span>
            </div>
            ${renderCollectionManager({
                title: `Beiträge (${draft.items.length})`,
                description: 'Die öffentliche Reihenfolge entsteht automatisch aus dem Datum. Entwürfe sind nur im Admin Mode sichtbar.',
                collectionPath: 'items', items: draft.items,
                addLabel: 'Beitrag erstellen', filterable: true, reorderable: false,
                emptyLabel: 'Noch keine Beiträge vorhanden.',
                nameForItem: post => post.title,
                detailForItem: post => blogStudioSummary(post, draft),
                editorForItem: (post, index) => renderBlogPostEditor(post, index, draft)
            })}
        `;
    }

    function renderBlogOverviewTab(draft) {
        const published = draft.items.filter(post => post.status !== 'draft');
        const current = published.find(post => post.featured) || published[0] || null;
        return `
            ${sectionBlock('Hauptbeitrag', 'Der ausgewählte veröffentlichte Beitrag steht groß auf der Blog-Startseite. Es kann immer nur einen geben.', published.length ? `
                <div class="admin-blog-featured-row">
                    ${renderBlogStudioCoverPreview(current || {})}
                    <label class="admin-field"><span class="admin-field-label">Aktueller Hauptbeitrag</span>
                        <select data-admin-blog-featured>
                            ${published.map(post => `<option value="${esc(post.id)}" ${post === current ? 'selected' : ''}>${esc(post.title || 'Beitrag ohne Titel')}</option>`).join('')}
                        </select>
                    </label>
                    ${current ? `<button type="button" class="admin-studio-icon-btn" data-admin-action="edit-blog-featured" data-item-id="${esc(current.id)}" aria-label="${esc(current.title)} bearbeiten"><i data-lucide="pencil"></i></button>` : ''}
                </div>
            ` : '<p class="admin-empty-state">Veröffentliche zuerst einen Beitrag. Entwürfe können nicht als Hauptbeitrag erscheinen.</p>')}
            ${sectionBlock('Kurze Einordnung', 'Dieser Satz steht direkt unter der Überschrift und erklärt ohne Umwege, worum es im Blog geht.', `
                <div class="admin-field-grid">
                    ${textareaField({ label: 'Einleitung', path: 'content.purposeText', value: draft.content.purposeText, rows: 3 })}
                </div>
            `)}
            ${sectionBlock('Leerer Zustand', 'Diese Texte werden nur angezeigt, solange noch kein Beitrag veröffentlicht ist.', `
                <div class="admin-field-grid">
                    ${field({ label: 'Kleine Überschrift', path: 'content.emptyKicker', value: draft.content.emptyKicker, wide: true })}
                    ${field({ label: 'Haupttext', path: 'content.emptyTitle', value: draft.content.emptyTitle, wide: true })}
                    ${textareaField({ label: 'Beschreibung', path: 'content.emptyText', value: draft.content.emptyText, rows: 3 })}
                </div>
            `)}
        `;
    }

    function renderBlogTopicsTab(draft) {
        const categories = sectionBlock('Drei Themenbereiche', 'Die drei Bereiche bleiben fest, damit die Startseite ruhig und ausgewogen bleibt. Namen und Beschreibungen kannst du frei ändern.', `
            <div class="admin-blog-topic-list">
                ${draft.content.categories.map((category, index) => `
                    <div class="admin-nested-card">
                        <div class="admin-blog-topic-key"><span>${String(index + 1).padStart(2, '0')}</span><code>${esc(category.key)}</code></div>
                        <div class="admin-field-grid">
                            ${field({ label: 'Name', path: `content.categories.${index}.label`, value: category.label, wide: true })}
                            ${textareaField({ label: 'Kurze Beschreibung', path: `content.categories.${index}.description`, value: category.description, rows: 3 })}
                        </div>
                    </div>
                `).join('')}
            </div>
        `);
        const types = sectionBlock('Beitragsformate', 'Formate helfen später im großen Archiv. Die technischen Schlüssel bleiben stabil, nur die sichtbaren Namen werden geändert.', `
            <div class="admin-field-grid">
                ${draft.content.types.map((type, index) => field({ label: type.key, path: `content.types.${index}.label`, value: type.label })).join('')}
            </div>
        `);
        return `${categories}${types}`;
    }

    function renderBlogTextsTab(draft) {
        const heading = sectionBlock('Sektion und Übersicht', 'Alle Texte der Hauptansicht, ohne das Layout zu verändern.', `
            <div class="admin-field-grid">
                ${field({ label: 'Überschrift', path: 'content.sectionTitle', value: draft.content.sectionTitle, wide: true })}
                ${field({ label: 'Button zum Archiv', path: 'content.allPostsLabel', value: draft.content.allPostsLabel })}
                ${field({ label: 'Button für neuen Beitrag', path: 'content.addPostLabel', value: draft.content.addPostLabel })}
                ${field({ label: 'Kennzeichnung des Hauptbeitrags', path: 'content.currentPostLabel', value: draft.content.currentPostLabel })}
                ${field({ label: 'Button zum Lesen', path: 'content.readPostLabel', value: draft.content.readPostLabel })}
                ${field({ label: 'Kennzeichnung über den Themen', path: 'content.orientationLabel', value: draft.content.orientationLabel })}
                ${field({ label: 'Überschrift der Themen', path: 'content.themesTitle', value: draft.content.themesTitle })}
                ${field({ label: 'Kennzeichnung der Archivzahl', path: 'content.archiveSummaryLabel', value: draft.content.archiveSummaryLabel })}
                ${field({ label: 'Kennzeichnung der letzten Beiträge', path: 'content.latestKicker', value: draft.content.latestKicker })}
                ${field({ label: 'Überschrift der letzten Beiträge', path: 'content.latestTitle', value: draft.content.latestTitle })}
                ${field({ label: 'Code auf dem typografischen Motiv', path: 'content.posterLabel', value: draft.content.posterLabel, help: 'Kurz halten, zum Beispiel BLOG.' })}
            </div>
        `);
        const archive = sectionBlock('Archiv', 'Beschriftungen für Suche, Filter und leere Ergebnisse.', `
            <div class="admin-field-grid">
                ${field({ label: 'Kennzeichnung bei leerem Archiv', path: 'content.archiveKicker', value: draft.content.archiveKicker })}
                ${field({ label: 'Archiv-Titel', path: 'content.archiveTitle', value: draft.content.archiveTitle })}
                ${field({ label: 'Suchfeld', path: 'content.searchPlaceholder', value: draft.content.searchPlaceholder, wide: true })}
                ${field({ label: 'Keine Treffer', path: 'content.emptyArchive', value: draft.content.emptyArchive, wide: true })}
                ${field({ label: 'Weitere laden', path: 'content.loadMoreLabel', value: draft.content.loadMoreLabel, wide: true })}
                ${field({ label: 'Filter: alles', path: 'content.allFilterLabel', value: draft.content.allFilterLabel })}
                ${field({ label: 'Filter: alle Jahre', path: 'content.allYearsLabel', value: draft.content.allYearsLabel })}
                ${field({ label: 'Filter: alle Formate', path: 'content.allFormatsLabel', value: draft.content.allFormatsLabel })}
                ${field({ label: 'Ohne Datum', path: 'content.noDateLabel', value: draft.content.noDateLabel })}
                ${field({ label: 'Gruppe ohne Jahr', path: 'content.archiveYearLabel', value: draft.content.archiveYearLabel })}
                ${field({ label: 'Entwurf', path: 'content.draftLabel', value: draft.content.draftLabel })}
                ${field({ label: 'Abkürzung für Minuten', path: 'content.minutesLabel', value: draft.content.minutesLabel })}
                ${field({ label: 'Ein Beitrag', path: 'content.archiveSingular', value: draft.content.archiveSingular })}
                ${field({ label: 'Mehrere Beiträge', path: 'content.archivePlural', value: draft.content.archivePlural })}
            </div>
        `);
        const reader = sectionBlock('Lesemodus', 'Überschriften innerhalb eines geöffneten Beitrags.', `
            <div class="admin-field-grid">
                ${field({ label: 'Ergebnis', path: 'content.resultLabel', value: draft.content.resultLabel })}
                ${field({ label: 'Nächster Schritt', path: 'content.nextStepLabel', value: draft.content.nextStepLabel })}
                ${field({ label: 'Inhaltsverzeichnis', path: 'content.tocTitle', value: draft.content.tocTitle })}
                ${field({ label: 'Ähnliches Thema', path: 'content.relatedKicker', value: draft.content.relatedKicker })}
                ${field({ label: 'Weitere Beiträge', path: 'content.relatedTitle', value: draft.content.relatedTitle })}
                ${field({ label: 'Leerer Beitrag', path: 'content.emptyPostText', value: draft.content.emptyPostText, wide: true })}
            </div>
            <div class="admin-layout-note admin-library-save-note"><i data-lucide="hard-drive-download"></i><p>Speichern gilt für diesen Browser. Exportiere danach oben <strong>data.json</strong> als Sicherung.</p></div>
        `);
        return `${heading}${archive}${reader}`;
    }

    function assignBlogStudioFeatured(draft, itemId) {
        const selected = draft.items.find(post => String(post.id) === String(itemId) && post.status !== 'draft');
        draft.items.forEach(post => { post.featured = post === selected; });
    }

    function createUniqueBlogSlug(items, title, currentId = null) {
        const base = normalizeBlogSlug('', title || 'beitrag');
        const used = new Set(items
            .filter(post => currentId === null || String(post.id) !== String(currentId))
            .map(post => normalizeBlogSlug(post.slug, post.title)));
        let slug = base;
        let suffix = 2;
        while (used.has(slug)) {
            slug = `${base}-${suffix}`;
            suffix += 1;
        }
        return slug;
    }

    function addBlogStudioPost(draft) {
        const post = {
            id: createId('blog'),
            slug: createUniqueBlogSlug(draft.items, 'Neuer Beitrag'),
            title: 'Neuer Beitrag',
            publishedAt: new Date().toISOString().slice(0, 10),
            updatedAt: new Date().toISOString(),
            status: 'draft',
            category: 'projekte',
            type: 'update',
            tags: [], excerpt: '', contentMarkdown: '', cover: '', coverAlt: '', result: '', nextStep: '', featured: false
        };
        draft.items.push(post);
        uiState.activeTabId = 'posts';
        uiState.selectedItems.set('items', post.id);
        uiState.filters.delete('blog:items');
        return post;
    }

    function handleBlogAction(action, button, draft) {
        const itemId = button.dataset.itemId;
        const index = draft.items.findIndex(post => String(post.id) === String(itemId));
        if (action === 'add-collection') {
            addBlogStudioPost(draft);
            return { message: 'Neuer Entwurf angelegt – noch nicht gespeichert.' };
        }
        if (action === 'edit-collection') {
            if (uiState.selectedItems.get('items') === itemId) uiState.selectedItems.delete('items');
            else uiState.selectedItems.set('items', itemId);
            return { dirty: false };
        }
        if (index < 0) return null;
        if (action === 'edit-blog-featured') {
            uiState.activeTabId = 'posts';
            uiState.selectedItems.set('items', itemId);
            uiState.filters.delete('blog:items');
            renderTabs(getActiveSection());
            return { dirty: false, preserveScroll: false };
        }
        if (action === 'delete-collection') {
            if (!window.confirm(`„${draft.items[index].title || 'Diesen Beitrag'}“ löschen? Bis zum Speichern kannst du die Änderung verwerfen.`)) return null;
            const wasFeatured = draft.items[index].featured;
            draft.items.splice(index, 1);
            if (wasFeatured) {
                const next = draft.items.find(post => post.status !== 'draft');
                if (next) next.featured = true;
            }
            uiState.selectedItems.delete('items');
            return { message: 'Beitrag entfernt – noch nicht gespeichert.' };
        }
        if (action === 'remove-blog-cover') {
            uiState.uploadToken += 1;
            uiState.pendingImage = false;
            draft.items[index].cover = '';
            draft.items[index].updatedAt = new Date().toISOString();
            return { message: 'Titelbild entfernt – noch nicht gespeichert.' };
        }
        if (action === 'blog-slug-from-title') {
            draft.items[index].slug = createUniqueBlogSlug(draft.items, draft.items[index].title, draft.items[index].id);
            draft.items[index].updatedAt = new Date().toISOString();
            return { message: 'Adresse aus dem Titel erzeugt – noch nicht gespeichert.' };
        }
        return null;
    }

    async function uploadBlogStudioCover(input, draft) {
        const file = input.files?.[0];
        const post = draft.items.find(item => String(item.id) === input.dataset.adminBlogCover);
        if (!file || !post) return;
        const token = ++uiState.uploadToken;
        uiState.pendingImage = true;
        input.disabled = true;
        updateDirtyState();
        setStudioStatus('Titelbild wird verkleinert …', 'info');
        try {
            const image = await optimizeImageFile(file, 1600, 0.82);
            if (token !== uiState.uploadToken || uiState.draft !== draft || !draft.items.includes(post)
                || uiState.activeSectionId !== 'blog' || !document.body.classList.contains('admin-studio-open')) return;
            post.cover = image;
            post.updatedAt = new Date().toISOString();
            markDirty('Titelbild vorbereitet – noch nicht gespeichert.');
            renderActiveTab({ preserveScroll: true });
            uiState.body.querySelector('[data-admin-blog-cover]')?.focus({ preventScroll: true });
        } catch (error) {
            if (token === uiState.uploadToken) setStudioStatus(error.message || 'Titelbild konnte nicht geladen werden.', 'error');
        } finally {
            if (token === uiState.uploadToken) {
                uiState.pendingImage = false;
                updateDirtyState();
            }
            input.disabled = false;
            input.value = '';
        }
    }

    function handleBlogChange(event, draft) {
        const featured = event.target.closest('[data-admin-blog-featured]');
        if (featured) {
            assignBlogStudioFeatured(draft, featured.value);
            markDirty('Hauptbeitrag aktualisiert – noch nicht gespeichert.');
            renderActiveTab({ preserveScroll: true });
            uiState.body.querySelector('[data-admin-blog-featured]')?.focus({ preventScroll: true });
            return true;
        }
        const upload = event.target.closest('[data-admin-blog-cover]');
        if (!upload) return false;
        uploadBlogStudioCover(upload, draft);
        return true;
    }

    function afterBlogInput(input, draft) {
        const match = input.dataset.adminPath.match(/^items\.(\d+)\.(.+)$/);
        if (!match) return;
        const post = draft.items[Number(match[1])];
        const key = match[2];
        if (!post) return;
        if (key === 'tags') post.tags = normalizeBlogTags(post.tags);
        if (key === 'status' && post.status === 'draft' && post.featured) {
            post.featured = false;
            const replacement = draft.items.find(item => item !== post && item.status !== 'draft');
            if (replacement) replacement.featured = true;
        }
        post.updatedAt = new Date().toISOString();
        const row = input.closest('.admin-collection-entry');
        if (row && ['title', 'publishedAt', 'status', 'category'].includes(key)) {
            row.querySelector('.admin-collection-main strong').textContent = post.title || 'Beitrag ohne Titel';
            const detail = row.querySelector('.admin-collection-main small');
            if (detail) detail.textContent = blogStudioSummary(post, draft);
            row.dataset.searchText = `${post.title} ${blogStudioSummary(post, draft)}`.toLocaleLowerCase('de-DE');
            const stateLabel = row.querySelector('.admin-blog-state');
            if (stateLabel) {
                stateLabel.dataset.state = post.status === 'draft' ? 'draft' : 'published';
                stateLabel.textContent = post.status === 'draft' ? 'Entwurf' : 'Veröffentlicht';
            }
        }
        if (['contentMarkdown', 'excerpt'].includes(key)) {
            const stats = row?.querySelector('[data-admin-blog-stats]');
            if (stats) stats.textContent = `${getBlogStudioWordCount(post)} Wörter · etwa ${getBlogStudioReadingMinutes(post)} Min.`;
        }
        if (key === 'cover') {
            uiState.uploadToken += 1;
            uiState.pendingImage = false;
            const preview = uiState.body.querySelector('[data-admin-blog-cover-preview]');
            if (preview) preview.outerHTML = renderBlogStudioCoverPreview(post);
            const remove = uiState.body.querySelector('[data-admin-action="remove-blog-cover"]');
            if (remove) remove.disabled = !post.cover;
        }
    }

    function isPersistentBlogImage(value) {
        const raw = String(value || '').trim();
        if (!raw) return true;
        return !/^blob:/i.test(raw) && Boolean(getSafeImageUrl(raw));
    }

    function validateBlogStudio(draft) {
        const usedSlugs = new Map();
        const categoryKeys = new Set(draft.content.categories.map(item => item.key));
        const typeKeys = new Set(draft.content.types.map(item => item.key));
        for (const [index, post] of draft.items.entries()) {
            let key = '';
            let message = '';
            const normalizedSlug = normalizeBlogSlug(post.slug, post.title);
            if (!String(post.title || '').trim()) {
                key = 'title';
                message = 'Bitte gib jedem Beitrag einen Titel.';
            } else if (post.status !== 'draft' && !normalizeBlogPublishedAt(post.publishedAt)) {
                key = 'publishedAt';
                message = 'Ein veröffentlichter Beitrag braucht ein gültiges Datum.';
            } else if (post.publishedAt && !normalizeBlogPublishedAt(post.publishedAt)) {
                key = 'publishedAt';
                message = 'Bitte prüfe das Datum.';
            } else if (post.status !== 'draft' && !String(post.contentMarkdown || '').trim()) {
                key = 'contentMarkdown';
                message = 'Ein veröffentlichter Beitrag braucht einen Text.';
            } else if (!categoryKeys.has(post.category)) {
                key = 'category';
                message = 'Bitte wähle ein gültiges Thema.';
            } else if (!typeKeys.has(post.type)) {
                key = 'type';
                message = 'Bitte wähle ein gültiges Format.';
            } else if (!isPersistentBlogImage(post.cover)) {
                key = 'cover';
                message = 'Bitte wähle ein Titelbild aus oder nutze einen dauerhaften Bildpfad bzw. eine https-Adresse.';
            } else if (usedSlugs.has(normalizedSlug)) {
                key = 'slug';
                message = `Diese Adresse wird bereits von „${usedSlugs.get(normalizedSlug)}“ verwendet.`;
            }
            if (message) return { message, tabId: 'posts', itemId: post.id, path: `items.${index}.${key}` };
            usedSlugs.set(normalizedSlug, post.title || 'Beitrag');
        }
        return null;
    }

    function applyBlogStudioData(value) {
        state.data.blogContent = normalizeBlogContent(value.content);
        state.data.blogs = normalizeBlogs(value.items, BLOG_REVISION);
        renderBlog();
    }

    registerSection({
        id: 'blog', label: 'Blog', icon: 'notebook-pen', itemCollection: 'items',
        tabs: [
            { id: 'posts', label: 'Beiträge', icon: 'files' },
            { id: 'overview', label: 'Startseite', icon: 'layout-template' },
            { id: 'topics', label: 'Themen', icon: 'tags' },
            { id: 'texts', label: 'Texte', icon: 'type' }
        ],
        getData: () => ({ content: state.data.blogContent, items: state.data.blogs }),
        normalize: normalizeBlogForStudio,
        onOpen(draft, options) {
            const modal = document.getElementById('global-modal');
            const modalOpen = modal && !modal.classList.contains('hidden');
            if (blogArchiveOpen || blogPostOpen || modalOpen) uiState.returnFocus = document.querySelector('#blog .blog-admin-add');
            if (modalOpen && typeof closeModal === 'function') closeModal({ immediate: true, restoreFocus: false });
            if (blogPostOpen) setBlogPostOpen(false, { immediate: true });
            if (blogArchiveOpen) setBlogArchiveOpen(false, { immediate: true });
            if (options.itemId) uiState.filters.delete('blog:items');
            if (options.newPost) {
                addBlogStudioPost(draft);
                return { dirty: true, message: 'Neuer Entwurf angelegt – noch nicht gespeichert.' };
            }
        },
        preview: applyBlogStudioData,
        commit(value) { applyBlogStudioData(value); return saveData(); },
        validate: validateBlogStudio,
        renderTab(tabId, draft) {
            if (tabId === 'overview') return renderBlogOverviewTab(draft);
            if (tabId === 'topics') return renderBlogTopicsTab(draft);
            if (tabId === 'texts') return renderBlogTextsTab(draft);
            return renderBlogPostsTab(draft);
        },
        handleAction: handleBlogAction,
        handleChange: handleBlogChange,
        afterInput: afterBlogInput
    });
}());
