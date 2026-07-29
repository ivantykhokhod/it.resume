/* Modern project showcase, scalable project drawer and lazy Nivora video playback. */

let selectedProjectShowcaseId = 'project-nivora';
let nivoraVideoShowcaseController = null;
let projectPickerQuery = '';
let projectsDrawerQuery = '';
let projectsAllDrawerOpen = false;
let projectsDrawerCloseTimer = null;
let projectsKeyboardBound = false;

function getProjectShowcaseItems() {
    return Array.isArray(state?.data?.projects) ? state.data.projects : [];
}

function getProjectShowcaseItem(projectId) {
    return getProjectShowcaseItems().find(project => String(project.id) === String(projectId)) || null;
}

function getProjectHighlights(project) {
    if (!Array.isArray(project?.highlights)) return [];
    return project.highlights
        .map(item => String(item || '').trim())
        .filter(Boolean)
        .slice(0, 6);
}

function normalizeProjectSearch(value) {
    return String(value || '').trim().toLocaleLowerCase('de');
}

function projectMatchesQuery(project, query) {
    const normalizedQuery = normalizeProjectSearch(query);
    if (!normalizedQuery) return true;
    return [
        project?.title,
        project?.category,
        project?.desc,
        project?.status,
        project?.tech
    ].some(value => normalizeProjectSearch(value).includes(normalizedQuery));
}

function renderProjectPickerCard(project, context = 'compact') {
    const id = encodeInlineId(project.id);
    const title = escapeHtml(project.title || 'Projekt');
    const category = escapeHtml(project.category || 'Projekt');
    const desc = escapeHtml(project.desc || '');
    const status = escapeHtml(project.status || '');
    const showcaseIcons = {
        nivora: 'activity',
        resume: 'globe-2'
    };
    const icon = showcaseIcons[project.showcaseKey] || normalizeIconName(project.icon, 'folder');
    const selected = String(project.id) === String(selectedProjectShowcaseId);
    const showStatus = context === 'drawer' && status;

    return `
        <article class="project-picker-card project-picker-card-${context} ${selected ? 'is-selected' : ''}" data-project-picker-card="${id}">
            <button
                type="button"
                class="project-picker-button"
                data-project-select="${id}"
                aria-pressed="${selected}"
                aria-controls="project-showcase-detail">
                <span class="project-picker-icon" aria-hidden="true"><i data-lucide="${icon}"></i></span>
                <span class="project-picker-copy">
                    <strong>${title}</strong>
                    <span>${category}</span>
                    <small>${desc}</small>
                    ${showStatus ? `<em><span aria-hidden="true"></span>${status}</em>` : ''}
                </span>
                <i data-lucide="arrow-right" class="project-picker-arrow" aria-hidden="true"></i>
            </button>
            <div class="project-picker-admin admin-only">
                <button type="button" onclick="openFormModal('project', decodeURIComponent('${id}')); playClickSound();" aria-label="${title} bearbeiten">
                    <i data-lucide="pencil"></i>
                </button>
                <button type="button" onclick="requestDelete('project', decodeURIComponent('${id}')); playClickSound();" aria-label="${title} löschen">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </article>
    `;
}

function renderProjectMeta(project) {
    const techItems = String(project.tech || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 8);
    const status = project.period || project.status || 'In Entwicklung';

    return `
        <div class="project-detail-meta">
            <div class="project-meta-role">
                <span>Rolle</span>
                <strong>${escapeHtml(project.role || 'Konzept und Umsetzung')}</strong>
            </div>
            <div class="project-meta-status">
                <span>Status</span>
                <strong><i aria-hidden="true"></i>${escapeHtml(status)}</strong>
            </div>
            <div class="project-detail-technologies">
                <span>Technologien</span>
                <div>${techItems.map(item => `<b>${escapeHtml(item)}</b>`).join('')}</div>
            </div>
        </div>
    `;
}

function renderGenericProjectPreview(project) {
    const icon = normalizeIconName(project.icon, 'folder');
    const imageUrl = getSafeImageUrl(project.img);
    const highlights = getProjectHighlights(project);

    return `
        <section class="project-generic-layout" aria-label="${escapeHtml(project.title || 'Projekt')}">
            <div class="project-generic-visual">
                ${imageUrl
                    ? `<img src="${escapeHtml(imageUrl)}" alt="Vorschau: ${escapeHtml(project.title || 'Projekt')}" loading="lazy" decoding="async">`
                    : `<div class="project-generic-icon" aria-hidden="true"><i data-lucide="${icon}"></i></div>`}
            </div>
            ${renderProjectMeta(project)}
            <div class="project-generic-content">
                <p class="project-generic-label">${escapeHtml(project.category || 'Projekt')}</p>
                <h3>${escapeHtml(project.title || 'Projekt')}</h3>
                <p>${escapeHtml(project.desc || 'Weitere Informationen werden ergänzt.')}</p>
                ${highlights.length ? `
                    <ul>
                        ${highlights.map(item => `<li><i data-lucide="check"></i><span>${escapeHtml(item)}</span></li>`).join('')}
                    </ul>
                ` : ''}
                <button type="button" onclick="openViewModal('project', decodeURIComponent('${encodeInlineId(project.id)}')); playClickSound();" class="project-detail-button">
                    Details öffnen <i data-lucide="arrow-up-right"></i>
                </button>
            </div>
        </section>
    `;
}

function renderNivoraVideoShowcase(project) {
    const first = NIVORA_VIDEO_FEATURES[0];

    return `
        <section class="nivora-showcase" data-nivora-showcase aria-labelledby="nivora-showcase-title">
            <div class="nivora-phone-stage" data-nivora-visibility-target>
                <div class="nivora-phone">
                    <div class="nivora-phone-speaker" aria-hidden="true"></div>
                    <div class="nivora-video-panel" id="nivora-video-panel" role="tabpanel" aria-labelledby="nivora-tab-${escapeHtml(first.id)}">
                        <video
                            data-nivora-video
                            muted
                            playsinline
                            preload="none"
                            poster="${escapeHtml(first.poster)}"
                            aria-label="${escapeHtml(first.navLabel)}: kurze Produktdemo"></video>
                        <div class="nivora-video-loader" data-nivora-loader hidden aria-hidden="true"></div>
                        <div class="nivora-video-progress" role="progressbar" aria-label="Videofortschritt" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-nivora-progress></div>
                    </div>
                </div>
            </div>

            ${renderProjectMeta(project)}

            <div class="nivora-feature-copy">
                <p>Nivora</p>
                <h4 id="nivora-showcase-title">Fünf Kernbereiche.<br>Eine kurze Tour.</h4>
                <div class="nivora-active-feature" aria-live="polite">
                    <span data-nivora-eyebrow>${escapeHtml(first.eyebrow)}</span>
                    <strong data-nivora-title>${escapeHtml(first.title)}</strong>
                    <p data-nivora-description>${escapeHtml(first.description)}</p>
                </div>
            </div>

            <div class="nivora-showcase-tabs" role="tablist" aria-label="Nivora-Funktionen" data-nivora-tabs></div>
        </section>
    `;
}

function renderProjectDetail(project) {
    if (project.showcaseKey === 'nivora') {
        return renderNivoraVideoShowcase(project);
    }
    return renderGenericProjectPreview(project);
}

function getCompactProjects(projects) {
    if (projectPickerQuery) {
        return projects.filter(project => projectMatchesQuery(project, projectPickerQuery)).slice(0, 6);
    }

    const visible = projects.slice(0, 3);
    const selected = projects.find(project => String(project.id) === String(selectedProjectShowcaseId));
    if (selected && !visible.includes(selected)) {
        return [selected, ...visible.filter(project => project !== selected)].slice(0, 3);
    }
    return visible;
}

function renderCompactProjectList() {
    const container = document.getElementById('projects-container');
    if (!container) return;
    const projects = getCompactProjects(getProjectShowcaseItems());

    container.innerHTML = projects.length
        ? projects.map(project => renderProjectPickerCard(project, 'compact')).join('')
        : '<p class="project-empty">Kein Projekt gefunden.</p>';

    bindProjectSelection(container);
    refreshIcons();
}

function renderAllProjectList() {
    const container = document.getElementById('projects-all-container');
    if (!container) return;
    const projects = getProjectShowcaseItems()
        .filter(project => projectMatchesQuery(project, projectsDrawerQuery));

    container.innerHTML = projects.length
        ? projects.map(project => renderProjectPickerCard(project, 'drawer')).join('')
        : '<p class="project-empty">Kein Projekt gefunden.</p>';

    bindProjectSelection(container);
    refreshIcons();
}

function bindProjectSelection(root) {
    root.querySelectorAll('[data-project-select]').forEach(button => {
        button.addEventListener('click', () => {
            const projectId = decodeURIComponent(button.dataset.projectSelect || '');
            selectProjectShowcase(projectId, true);
            playClickSound();
        });
    });
}

function setProjectsDrawerOpen(open, { immediate = false } = {}) {
    const drawer = document.getElementById('projects-all-drawer');
    const toggle = document.getElementById('projects-all-toggle');
    if (!drawer || !toggle) return;

    clearTimeout(projectsDrawerCloseTimer);
    projectsAllDrawerOpen = Boolean(open);
    toggle.setAttribute('aria-expanded', String(projectsAllDrawerOpen));
    drawer.setAttribute('aria-hidden', String(!projectsAllDrawerOpen));
    document.body.classList.toggle('projects-drawer-open', projectsAllDrawerOpen);

    if (projectsAllDrawerOpen) {
        drawer.hidden = false;
        renderAllProjectList();
        requestAnimationFrame(() => {
            drawer.classList.add('is-open');
            drawer.querySelector('.projects-all-close')?.focus({ preventScroll: true });
        });
        return;
    }

    drawer.classList.remove('is-open');
    const finishClose = () => {
        if (!projectsAllDrawerOpen) drawer.hidden = true;
    };
    if (immediate) finishClose();
    else projectsDrawerCloseTimer = setTimeout(finishClose, 240);
}

function bindProjectsUi() {
    const search = document.getElementById('projects-search');
    const drawerSearch = document.getElementById('projects-all-search');
    const allToggle = document.getElementById('projects-all-toggle');
    const drawer = document.getElementById('projects-all-drawer');

    if (search && !search.dataset.projectsBound) {
        search.dataset.projectsBound = 'true';
        search.addEventListener('input', () => {
            projectPickerQuery = search.value;
            renderCompactProjectList();
        });
    }

    if (drawerSearch && !drawerSearch.dataset.projectsBound) {
        drawerSearch.dataset.projectsBound = 'true';
        drawerSearch.addEventListener('input', () => {
            projectsDrawerQuery = drawerSearch.value;
            renderAllProjectList();
        });
    }

    if (allToggle && !allToggle.dataset.projectsBound) {
        allToggle.dataset.projectsBound = 'true';
        allToggle.addEventListener('click', () => {
            setProjectsDrawerOpen(true);
            playClickSound();
        });
    }

    if (drawer && !drawer.dataset.projectsBound) {
        drawer.dataset.projectsBound = 'true';
        drawer.querySelectorAll('[data-projects-all-close]').forEach(button => {
            button.addEventListener('click', () => setProjectsDrawerOpen(false));
        });
    }

    if (!projectsKeyboardBound) {
        projectsKeyboardBound = true;
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && projectsAllDrawerOpen) {
                setProjectsDrawerOpen(false);
                document.getElementById('projects-all-toggle')?.focus({ preventScroll: true });
                return;
            }

            const target = event.target;
            const isTyping = target instanceof HTMLInputElement
                || target instanceof HTMLTextAreaElement
                || target?.isContentEditable;
            if (event.key !== '/' || isTyping || projectsAllDrawerOpen) return;

            const section = document.getElementById('projects');
            const rect = section?.getBoundingClientRect();
            const sectionIsNear = rect && rect.bottom > 0 && rect.top < window.innerHeight;
            if (!sectionIsNear) return;

            event.preventDefault();
            document.getElementById('projects-search')?.focus({ preventScroll: true });
        });
    }
}

function selectProjectShowcase(projectId, restoreFocus = false) {
    if (!getProjectShowcaseItem(projectId)) return;
    const selectedFromDrawer = projectsAllDrawerOpen;
    selectedProjectShowcaseId = String(projectId);
    setProjectsDrawerOpen(false);
    renderProjects();
    refreshIcons();

    if (!restoreFocus) return;
    requestAnimationFrame(() => {
        if (selectedFromDrawer) {
            document.getElementById('projects-all-toggle')?.focus({ preventScroll: true });
            return;
        }
        const encodedId = encodeInlineId(selectedProjectShowcaseId);
        const buttons = [...document.querySelectorAll(`[data-project-select="${encodedId}"]`)];
        buttons.find(button => button.offsetParent !== null)?.focus({ preventScroll: true });
    });
}

function renderProjects() {
    const compactContainer = document.getElementById('projects-container');
    const detail = document.getElementById('project-showcase-detail');
    const allToggle = document.getElementById('projects-all-toggle');
    if (!compactContainer || !detail) return;

    nivoraVideoShowcaseController?.destroy();
    nivoraVideoShowcaseController = null;

    const projects = getProjectShowcaseItems();
    if (!projects.length) {
        compactContainer.innerHTML = '<p class="project-empty">Noch keine Projekte vorhanden.</p>';
        detail.innerHTML = '';
        if (allToggle) allToggle.hidden = true;
        renderAllProjectList();
        setProjectsDrawerOpen(false, { immediate: true });
        return;
    }

    if (!getProjectShowcaseItem(selectedProjectShowcaseId)) {
        selectedProjectShowcaseId = String(projects[0].id);
    }

    if (allToggle) {
        allToggle.hidden = false;
        allToggle.setAttribute('aria-label', `Alle ${projects.length} Projekte anzeigen`);
    }

    renderCompactProjectList();
    renderAllProjectList();
    detail.innerHTML = renderProjectDetail(getProjectShowcaseItem(selectedProjectShowcaseId));
    bindProjectsUi();

    const nivoraRoot = detail.querySelector('[data-nivora-showcase]');
    if (nivoraRoot) {
        nivoraVideoShowcaseController = new NivoraVideoShowcase(nivoraRoot);
    }
}

class NivoraVideoShowcase {
    constructor(root) {
        this.root = root;
        this.features = Array.isArray(NIVORA_VIDEO_FEATURES) ? NIVORA_VIDEO_FEATURES : [];
        this.index = 0;
        this.loadedSource = '';
        this.isVisible = false;
        this.unloadTimer = null;
        this.viewportFrame = null;
        this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.saveData = Boolean(navigator.connection?.saveData);
        this.shouldAutoplay = !this.reduceMotion && !this.saveData;
        this.video = root.querySelector('[data-nivora-video]');
        this.visibilityTarget = root.querySelector('[data-nivora-visibility-target]') || root;
        this.tabs = root.querySelector('[data-nivora-tabs]');
        this.eyebrow = root.querySelector('[data-nivora-eyebrow]');
        this.title = root.querySelector('[data-nivora-title]');
        this.description = root.querySelector('[data-nivora-description]');
        this.progress = root.querySelector('[data-nivora-progress]');
        this.loader = root.querySelector('[data-nivora-loader]');
        this.boundVisibilityHandler = () => this.handleDocumentVisibility();
        this.boundViewportHandler = () => this.scheduleViewportCheck();

        if (!this.video || !this.tabs || !this.features.length) return;
        this.video.muted = true;
        this.video.defaultMuted = true;
        this.renderTabs();
        this.bindEvents();
        this.selectFeature(0, { load: false });
        this.observeVisibility();
    }

    renderTabs() {
        this.tabs.innerHTML = this.features.map((feature, index) => `
            <button
                type="button"
                id="nivora-tab-${escapeHtml(feature.id)}"
                role="tab"
                aria-selected="${index === 0}"
                aria-controls="nivora-video-panel"
                tabindex="${index === 0 ? '0' : '-1'}"
                data-nivora-tab="${index}">
                <i data-lucide="${normalizeIconName(feature.icon, 'circle')}" aria-hidden="true"></i>
                <strong>${escapeHtml(feature.navLabel)}</strong>
                <span aria-hidden="true"></span>
            </button>
        `).join('');
    }

    bindEvents() {
        this.tabs.addEventListener('click', event => {
            const button = event.target.closest('[data-nivora-tab]');
            if (!button) return;
            this.selectFeature(Number(button.dataset.nivoraTab), { load: true });
        });

        this.tabs.addEventListener('keydown', event => {
            const current = event.target.closest('[data-nivora-tab]');
            if (!current) return;
            const currentIndex = Number(current.dataset.nivoraTab);
            const offset = ['ArrowRight', 'ArrowDown'].includes(event.key)
                ? 1
                : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
            let nextIndex = null;

            if (event.key === 'Home') nextIndex = 0;
            else if (event.key === 'End') nextIndex = this.features.length - 1;
            else if (offset) nextIndex = (currentIndex + offset + this.features.length) % this.features.length;
            if (nextIndex === null) return;

            event.preventDefault();
            this.selectFeature(nextIndex, { load: true, focus: true });
        });

        this.video.addEventListener('loadstart', () => this.setLoading(true));
        this.video.addEventListener('waiting', () => this.setLoading(true));
        this.video.addEventListener('canplay', () => this.setLoading(false));
        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.video.addEventListener('ended', () => this.playNextFeature());
        this.video.addEventListener('error', () => this.showError());
        document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }

    playNextFeature() {
        if (!this.features.length || !this.isVisible || document.hidden) return;
        const nextIndex = (this.index + 1) % this.features.length;
        this.selectFeature(nextIndex, { load: true });
    }

    observeVisibility() {
        if (!('IntersectionObserver' in window)) {
            window.addEventListener('scroll', this.boundViewportHandler, { passive: true });
            window.addEventListener('resize', this.boundViewportHandler, { passive: true });
            this.scheduleViewportCheck();
            return;
        }

        this.observer = new IntersectionObserver(entries => {
            const entry = entries[0];
            const visibleEnough = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.55);
            this.setViewportVisibility(visibleEnough);
        }, {
            threshold: [0, 0.25, 0.55, 0.85],
            rootMargin: '-8% 0px -8% 0px'
        });

        this.observer.observe(this.visibilityTarget);
        this.scheduleViewportCheck();
    }

    scheduleViewportCheck() {
        if (this.viewportFrame !== null) return;
        this.viewportFrame = requestAnimationFrame(() => {
            this.viewportFrame = null;
            const rect = this.visibilityTarget.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
            const visibleRatio = rect.height > 0 ? visibleHeight / rect.height : 0;
            this.setViewportVisibility(visibleRatio >= 0.55);
        });
    }

    setViewportVisibility(visibleEnough) {
        const changed = this.isVisible !== visibleEnough;
        this.isVisible = visibleEnough;

        if (visibleEnough) {
            clearTimeout(this.unloadTimer);
            this.unloadTimer = null;
            if (changed || !this.loadedSource) {
                this.loadCurrentFeature({ autoplay: this.shouldAutoplay });
            }
        } else if (changed || (this.loadedSource && this.unloadTimer === null)) {
            this.pauseAndReset({ unloadAfterDelay: true });
        }
    }

    selectFeature(index, { load = false, focus = false } = {}) {
        if (!Number.isInteger(index) || index < 0 || index >= this.features.length) return;
        this.index = index;
        const feature = this.features[index];

        this.eyebrow.textContent = feature.eyebrow;
        this.title.textContent = feature.title;
        this.description.textContent = index === 0
            ? 'Nivora strukturiert Ziele, Fähigkeiten und Fortschritt in klaren Bereichen. So bleibt der Fokus erhalten und Entwicklung wird messbar.'
            : feature.description;
        this.video.poster = feature.poster;
        this.video.setAttribute('aria-label', `${feature.navLabel}: kurze Produktdemo`);
        this.video.parentElement?.setAttribute('aria-labelledby', `nivora-tab-${feature.id}`);
        this.root.style.setProperty('--nivora-progress', '0%');
        this.root.classList.remove('has-media-error');

        this.tabs.querySelectorAll('[data-nivora-tab]').forEach((button, buttonIndex) => {
            const selected = buttonIndex === index;
            button.setAttribute('aria-selected', String(selected));
            button.tabIndex = selected ? 0 : -1;
            if (selected && focus) button.focus();
        });

        if (this.loadedSource && this.loadedSource !== feature.video) {
            this.unloadCurrentMedia();
        }

        if (load || this.isVisible) {
            this.loadCurrentFeature({ autoplay: this.isVisible && this.shouldAutoplay });
        }
        refreshIcons();
    }

    loadCurrentFeature({ autoplay = false } = {}) {
        const feature = this.features[this.index];
        if (!feature) return;
        clearTimeout(this.unloadTimer);

        if (this.loadedSource !== feature.video) {
            this.setLoading(true);
            this.video.src = feature.video;
            this.video.load();
            this.loadedSource = feature.video;
        }

        if (autoplay) this.safePlay();
    }

    async safePlay() {
        if (!this.shouldAutoplay || !this.isVisible || document.hidden) return;
        try {
            await this.video.play();
        } catch (error) {
            // Autoplay can be blocked by a browser policy. The poster remains visible.
        }
    }

    pauseAndReset({ unloadAfterDelay = false } = {}) {
        this.video.pause();
        try {
            if (Number.isFinite(this.video.duration)) this.video.currentTime = 0;
        } catch (error) {
            // The media metadata may not be available yet.
        }
        this.root.style.setProperty('--nivora-progress', '0%');
        this.progress?.setAttribute('aria-valuenow', '0');

        clearTimeout(this.unloadTimer);
        if (unloadAfterDelay && this.loadedSource) {
            this.unloadTimer = setTimeout(() => {
                this.unloadTimer = null;
                if (!this.isVisible) this.unloadCurrentMedia();
            }, 1800);
        }
    }

    unloadCurrentMedia() {
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
        this.loadedSource = '';
        this.setLoading(false);
    }

    updateProgress() {
        const duration = Number(this.video.duration);
        const currentTime = Number(this.video.currentTime);
        const percent = Number.isFinite(duration) && duration > 0
            ? Math.min(100, Math.max(0, currentTime / duration * 100))
            : 0;
        this.root.style.setProperty('--nivora-progress', `${percent}%`);
        this.progress?.setAttribute('aria-valuenow', String(Math.round(percent)));
    }

    setLoading(isLoading) {
        this.root.classList.toggle('is-loading', Boolean(isLoading));
        if (this.loader) this.loader.hidden = !isLoading;
    }

    showError() {
        if (!this.loadedSource) return;
        this.setLoading(false);
        this.root.classList.add('has-media-error');
    }

    handleDocumentVisibility() {
        if (document.hidden) {
            this.pauseAndReset({ unloadAfterDelay: true });
        } else if (this.isVisible) {
            this.loadCurrentFeature({ autoplay: this.shouldAutoplay });
        }
    }

    destroy() {
        clearTimeout(this.unloadTimer);
        if (this.viewportFrame !== null) cancelAnimationFrame(this.viewportFrame);
        this.observer?.disconnect();
        document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
        window.removeEventListener('scroll', this.boundViewportHandler);
        window.removeEventListener('resize', this.boundViewportHandler);
        this.pauseAndReset();
        this.unloadCurrentMedia();
    }
}
