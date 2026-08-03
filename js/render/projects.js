/* Modern project showcase, scalable project drawer and lazy Nivora video playback. */

let selectedProjectShowcaseId = 'project-nivora';
let nivoraVideoShowcaseController = null;
let resumeWebsiteShowcaseController = null;
let ideaCaptureShowcaseController = null;
let nivoraDetailsController = null;
let projectsDrawerQuery = '';
let projectsAllDrawerOpen = false;
let projectsDrawerCloseTimer = null;
let projectsKeyboardBound = false;
let projectsDrawerResizeBound = false;
let projectDetailsReturnId = null;

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
        resume: 'globe-2',
        'idea-capture': 'notebook-pen'
    };
    const icon = showcaseIcons[project.showcaseKey] || normalizeIconName(project.icon, 'folder');
    const selected = String(project.id) === String(selectedProjectShowcaseId);
    const showStatus = context === 'drawer' && status;
    const detailsLayerIds = {
        nivora: 'nivora-details-layer',
        resume: 'resume-structure-layer',
        'idea-capture': 'idea-capture-details-layer'
    };
    const hasDetailsTrigger = Boolean(detailsLayerIds[project.showcaseKey]) && context === 'compact';
    const detailsLayerId = detailsLayerIds[project.showcaseKey] || '';

    return `
        <article class="project-picker-card project-picker-card-${context} project-picker-card-${escapeHtml(project.showcaseKey || 'generic')} ${selected ? 'is-selected' : ''}" data-project-picker-card="${id}">
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
                ${hasDetailsTrigger
                    ? '<span class="project-picker-arrow-slot" aria-hidden="true"></span>'
                    : '<i data-lucide="arrow-right" class="project-picker-arrow" aria-hidden="true"></i>'}
            </button>
            ${hasDetailsTrigger ? `
                <button
                    type="button"
                    class="project-picker-details-trigger"
                    data-project-details-trigger="${id}"
                    aria-label="Zusatzinformationen zu ${title} öffnen"
                    aria-controls="${escapeHtml(detailsLayerId)}"
                    aria-expanded="false">
                    <i data-lucide="arrow-right" aria-hidden="true"></i>
                </button>
            ` : ''}
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
                <h4 id="nivora-showcase-title">Alle Erfahrungen.<br>Ein gemeinsames System.</h4>
                <div class="nivora-active-feature" aria-live="polite">
                    <span data-nivora-eyebrow>${escapeHtml(first.eyebrow)}</span>
                    <strong data-nivora-title>${escapeHtml(first.title)}</strong>
                    <p data-nivora-description>${escapeHtml(first.description)}</p>
                </div>
            </div>

            <div class="nivora-showcase-tabs" role="tablist" aria-label="Nivora-Funktionen" data-nivora-tabs></div>

            <div id="nivora-details-layer" class="project-insights-layer" data-nivora-details hidden aria-hidden="true">
                <button type="button" class="project-insights-backdrop" data-project-insights-close aria-label="Nivora-Projektinformationen schließen"></button>
                <aside class="project-insights-drawer" role="dialog" aria-modal="true" aria-labelledby="nivora-details-title">
                    <div class="project-insights-head">
                        <button type="button" data-project-insights-close aria-label="Nivora-Projektinformationen schließen">
                            <i data-lucide="arrow-left" aria-hidden="true"></i>
                        </button>
                        <span id="nivora-details-title">Nivora · Projektsystem</span>
                    </div>
                    <p class="project-insights-intro">Nivora ist die Zusammenführung meiner bisherigen Produkt-, Web- und Android-Erfahrungen. Die Anwendung ist funktionsfähig, aber noch eine Rohversion.</p>
                    <div class="project-insights-grid nivora-insights-grid">
                        ${renderNivoraProjectDetails()}
                    </div>
                </aside>
            </div>
        </section>
    `;
}


function renderResumeStructureCards() {
    const groups = Array.isArray(RESUME_WEBSITE_STRUCTURE) ? RESUME_WEBSITE_STRUCTURE : [];
    return groups.map(group => `
        <article class="resume-structure-card">
            ${group.preview ? `<img class="resume-structure-preview" src="${escapeHtml(group.preview)}" alt="Dateistruktur im Ordner ${escapeHtml(group.folder)}" loading="lazy" decoding="async">` : ''}
            <div class="resume-structure-card-head">
                <span aria-hidden="true"><i data-lucide="${normalizeIconName(group.icon, 'folder')}"></i></span>
                <strong>${escapeHtml(group.folder)}</strong>
            </div>
            <p>${escapeHtml(group.description || '')}</p>
            <div class="resume-structure-files">
                ${(Array.isArray(group.files) ? group.files : []).map(file => `<code>${escapeHtml(file)}</code>`).join('')}
            </div>
        </article>
    `).join('');
}

function renderResumeWebsiteShowcase(project) {
    const first = Array.isArray(RESUME_WEBSITE_FEATURES) && RESUME_WEBSITE_FEATURES.length
        ? RESUME_WEBSITE_FEATURES[0]
        : null;
    if (!first) return renderGenericProjectPreview(project);

    return `
        <section class="resume-showcase" data-resume-showcase aria-labelledby="resume-showcase-title">
            <div class="resume-monitor-stage" data-resume-visibility-target>
                <div class="resume-monitor" aria-label="Desktop-Vorschau der Resume Website">
                    <div class="resume-monitor-frame">
                        <div class="resume-monitor-toolbar" aria-hidden="true">
                            <span></span><span></span><span></span>
                            <strong>IT LEBENSLAUF</strong>
                        </div>
                        <div class="resume-media-panel" id="resume-media-panel" role="tabpanel" aria-labelledby="resume-tab-${escapeHtml(first.id)}">
                            <img
                                data-resume-image
                                src="${escapeHtml(first.image)}"
                                alt="${escapeHtml(first.navLabel)} der Resume Website"
                                decoding="async">
                            <video
                                data-resume-video
                                muted
                                playsinline
                                preload="none"
                                hidden
                                aria-label="${escapeHtml(first.navLabel)}: kurze Website-Demo"></video>
                            <div class="resume-media-loader" data-resume-loader hidden aria-hidden="true"></div>
                            <div class="resume-media-progress" role="progressbar" aria-label="Videofortschritt" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-resume-progress></div>
                        </div>
                    </div>
                    <div class="resume-monitor-neck" aria-hidden="true"></div>
                    <div class="resume-monitor-base" aria-hidden="true"></div>
                </div>
            </div>

            ${renderProjectMeta(project)}

            <div class="resume-feature-copy">
                <p>Resume Website</p>
                <h4 id="resume-showcase-title">Sieben Bereiche.<br>Eine modulare Website.</h4>
                <div class="resume-active-feature" aria-live="polite">
                    <span data-resume-eyebrow>${escapeHtml(first.eyebrow)}</span>
                    <strong data-resume-title>${escapeHtml(first.title)}</strong>
                    <p data-resume-description>${escapeHtml(first.description)}</p>
                </div>
            </div>

            <div class="resume-showcase-tabs" role="tablist" aria-label="Bereiche der Resume Website" data-resume-tabs></div>

            <div id="resume-structure-layer" class="resume-structure-layer" data-resume-details hidden aria-hidden="true">
                <button type="button" class="resume-structure-backdrop" data-resume-details-close aria-label="Zusatzinformationen schließen"></button>
                <aside class="resume-structure-drawer" role="dialog" aria-modal="true" aria-labelledby="resume-structure-title">
                    <div class="resume-structure-head">
                        <div>
                            <span id="resume-structure-title">Projektstruktur</span>
                        </div>
                        <button type="button" data-resume-details-close aria-label="Zusatzinformationen schließen">
                            <i data-lucide="arrow-left" aria-hidden="true"></i>
                        </button>
                    </div>
                    <p class="resume-structure-intro">Damit habe ich gelernt, wie man eine Webanwendung strukturiert über mehrere HTML-, CSS- und JavaScript-Dateien aufbaut.</p>
                    <div class="resume-structure-grid">
                        ${renderResumeStructureCards()}
                    </div>
                </aside>
            </div>
        </section>
    `;
}


function renderNivoraProjectDetails() {
    const items = Array.isArray(NIVORA_PROJECT_DETAILS) ? NIVORA_PROJECT_DETAILS : [];
    return items.map(item => `
        <article class="project-insight-card">
            <span class="project-insight-icon" aria-hidden="true"><i data-lucide="${normalizeIconName(item.icon, 'folder')}"></i></span>
            <small>${escapeHtml(item.label || '')}</small>
            <h6>${escapeHtml(item.title || '')}</h6>
            <p>${escapeHtml(item.description || '')}</p>
        </article>
    `).join('');
}

function renderIdeaCaptureDetails() {
    const items = Array.isArray(IDEA_CAPTURE_DETAILS) ? IDEA_CAPTURE_DETAILS : [];
    return items.map((item, index) => `
        <article class="project-insight-card idea-insight-card ${index === items.length - 1 ? 'idea-insight-card-wide' : ''}">
            ${item.preview ? `<img src="${escapeHtml(item.preview)}" alt="${escapeHtml(item.title || '')}" loading="lazy" decoding="async">` : ''}
            <div class="project-insight-card-copy">
                <span class="project-insight-icon" aria-hidden="true"><i data-lucide="${normalizeIconName(item.icon, 'folder')}"></i></span>
                <small>${escapeHtml(item.label || '')}</small>
                <h6>${escapeHtml(item.title || '')}</h6>
                <p>${escapeHtml(item.description || '')}</p>
            </div>
        </article>
    `).join('');
}

function renderIdeaCaptureShowcase(project) {
    const first = Array.isArray(IDEA_CAPTURE_FEATURES) && IDEA_CAPTURE_FEATURES.length
        ? IDEA_CAPTURE_FEATURES[0]
        : null;
    if (!first) return renderGenericProjectPreview(project);

    return `
        <section class="resume-showcase idea-showcase" data-idea-showcase aria-labelledby="idea-showcase-title">
            <div
                class="nivora-phone-stage idea-stage"
                id="idea-stage-panel"
                role="tabpanel"
                aria-labelledby="idea-tab-${escapeHtml(first.id)}"
                data-idea-visibility-target>
                <div class="nivora-phone idea-phone" data-idea-phone aria-label="Telefonvorschau der Idea-Capture-Anwendung">
                    <div class="nivora-phone-speaker" aria-hidden="true"></div>
                    <div class="nivora-video-panel idea-phone-screen">
                        <img
                            data-idea-image
                            src="${escapeHtml(first.image || '')}"
                            alt="${escapeHtml(first.navLabel)} von Idea Capture"
                            decoding="async">
                        <video
                            data-idea-video
                            muted
                            playsinline
                            preload="none"
                            hidden
                            aria-label="${escapeHtml(first.navLabel)}: kurze Produktdemo"></video>
                        <div class="nivora-video-loader idea-media-loader" data-idea-loader hidden aria-hidden="true"></div>
                        <div
                            class="nivora-video-progress idea-media-progress"
                            role="progressbar"
                            aria-label="Videofortschritt"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-valuenow="0"
                            data-idea-progress></div>
                    </div>
                </div>

                <div class="idea-text-frame" data-idea-text-frame hidden>
                    <span data-idea-text-eyebrow></span>
                    <h5 data-idea-text-title></h5>
                    <p data-idea-text-description></p>
                    <ul data-idea-text-points></ul>
                </div>
            </div>

            ${renderProjectMeta(project)}

            <div class="resume-feature-copy idea-feature-copy">
                <p>Idea Capture</p>
                <h4 id="idea-showcase-title">Vier Einblicke.<br>Eine vernetzte App.</h4>
                <div class="resume-active-feature idea-active-feature">
                    <p>Die ersten beiden Bereiche zeigen die mobile Anwendung und ihre Synchronisation. Die letzten beiden erklären, was ich gelernt habe und warum das Projekt entstanden ist.</p>
                </div>
            </div>

            <div class="resume-showcase-tabs idea-showcase-tabs" role="tablist" aria-label="Bereiche von Idea Capture" data-idea-tabs></div>

            <div id="idea-capture-details-layer" class="project-insights-layer" data-idea-details hidden aria-hidden="true">
                <button type="button" class="project-insights-backdrop" data-project-insights-close aria-label="Idea-Capture-Projektinformationen schließen"></button>
                <aside class="project-insights-drawer" role="dialog" aria-modal="true" aria-labelledby="idea-details-title">
                    <div class="project-insights-head">
                        <button type="button" data-project-insights-close aria-label="Idea-Capture-Projektinformationen schließen">
                            <i data-lucide="arrow-left" aria-hidden="true"></i>
                        </button>
                        <span id="idea-details-title">Idea Capture · Technik & Motivation</span>
                    </div>
                    <p class="project-insights-intro">Die Zusatzansicht zeigt, wie Android Studio, Firebase und die persönliche Motivation hinter der Anwendung zusammengehören.</p>
                    <div class="project-insights-grid idea-insights-grid">
                        ${renderIdeaCaptureDetails()}
                    </div>
                </aside>
            </div>
        </section>
    `;
}

function renderProjectDetail(project) {
    if (project.showcaseKey === 'nivora') return renderNivoraVideoShowcase(project);
    if (project.showcaseKey === 'resume') return renderResumeWebsiteShowcase(project);
    if (project.showcaseKey === 'idea-capture') return renderIdeaCaptureShowcase(project);
    return renderGenericProjectPreview(project);
}

function getCompactProjects(projects) {
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

    root.querySelectorAll('[data-project-details-trigger]').forEach(button => {
        button.addEventListener('click', event => {
            event.stopPropagation();
            const projectId = decodeURIComponent(button.dataset.projectDetailsTrigger || '');
            openProjectDetails(projectId);
            playClickSound();
        });
    });
}

function openProjectDetails(projectId) {
    const project = getProjectShowcaseItem(projectId);
    if (!project || !['nivora', 'resume', 'idea-capture'].includes(project.showcaseKey)) return;

    projectDetailsReturnId = String(projectId);
    if (String(selectedProjectShowcaseId) !== String(projectId)) {
        selectedProjectShowcaseId = String(projectId);
        renderProjects();
        refreshIcons();
    }

    requestAnimationFrame(() => {
        if (project.showcaseKey === 'resume') resumeWebsiteShowcaseController?.setDetailsOpen(true);
        if (project.showcaseKey === 'idea-capture') ideaCaptureShowcaseController?.setDetailsOpen(true);
        if (project.showcaseKey === 'nivora') nivoraDetailsController?.setOpen(true);
    });
}

function getProjectsDrawer() {
    const drawer = document.getElementById('projects-all-drawer');
    if (drawer && drawer.parentElement !== document.body) document.body.appendChild(drawer);
    return drawer;
}

function updateProjectsDrawerBoundary() {
    const drawer = getProjectsDrawer();
    if (!drawer) return;

    const sidebar = document.querySelector('#projects .projects-sidebar');
    const nav = document.getElementById('main-nav');
    const sidebarRight = sidebar?.getBoundingClientRect().right;
    const navBottom = nav?.getBoundingClientRect().bottom;
    const fallbackLeft = Math.round(window.innerWidth * 0.32);
    const requestedLeft = Number.isFinite(sidebarRight) ? Math.round(sidebarRight + 14) : fallbackLeft;
    const minimumPanelWidth = Math.min(640, Math.max(420, window.innerWidth - 360));
    const maximumLeft = Math.max(360, window.innerWidth - minimumPanelWidth);
    const left = Math.max(360, Math.min(requestedLeft, maximumLeft));
    const top = Number.isFinite(navBottom) ? Math.max(0, Math.round(navBottom)) : 64;

    drawer.style.setProperty('--projects-all-left', `${left}px`);
    drawer.style.setProperty('--projects-all-top', `${top}px`);
}

function setProjectsDrawerOpen(open, { immediate = false } = {}) {
    const drawer = getProjectsDrawer();
    const toggle = document.getElementById('projects-all-toggle');
    if (!drawer || !toggle) return;

    clearTimeout(projectsDrawerCloseTimer);
    projectsAllDrawerOpen = Boolean(open);
    toggle.setAttribute('aria-expanded', String(projectsAllDrawerOpen));
    drawer.setAttribute('aria-hidden', String(!projectsAllDrawerOpen));
    document.body.classList.toggle('projects-drawer-open', projectsAllDrawerOpen);

    if (projectsAllDrawerOpen) {
        updateProjectsDrawerBoundary();
        drawer.hidden = false;
        renderAllProjectList();
        requestAnimationFrame(() => {
            updateProjectsDrawerBoundary();
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
    else projectsDrawerCloseTimer = setTimeout(finishClose, 320);
}

function bindProjectsUi() {
    const drawer = getProjectsDrawer();
    const drawerSearch = document.getElementById('projects-all-search');
    const allToggle = document.getElementById('projects-all-toggle');

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

    if (!projectsDrawerResizeBound) {
        projectsDrawerResizeBound = true;
        window.addEventListener('resize', () => {
            if (projectsAllDrawerOpen) updateProjectsDrawerBoundary();
        }, { passive: true });
    }

    if (!projectsKeyboardBound) {
        projectsKeyboardBound = true;
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && projectsAllDrawerOpen) {
                setProjectsDrawerOpen(false);
                document.getElementById('projects-all-toggle')?.focus({ preventScroll: true });
            }
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
    resumeWebsiteShowcaseController?.destroy();
    resumeWebsiteShowcaseController = null;
    ideaCaptureShowcaseController?.destroy();
    ideaCaptureShowcaseController = null;
    nivoraDetailsController?.destroy();
    nivoraDetailsController = null;

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
        nivoraDetailsController = new ProjectInsightsController(nivoraRoot, '[data-nivora-details]');
    }

    const resumeRoot = detail.querySelector('[data-resume-showcase]');
    if (resumeRoot) {
        resumeWebsiteShowcaseController = new ResumeWebsiteShowcase(resumeRoot);
    }

    const ideaRoot = detail.querySelector('[data-idea-showcase]');
    if (ideaRoot) {
        ideaCaptureShowcaseController = new IdeaCaptureShowcase(ideaRoot);
    }
}


class ProjectInsightsController {
    constructor(root, selector) {
        this.root = root;
        this.layer = root.querySelector(selector);
        this.closeTimer = null;
        this.closeButtons = this.layer ? [...this.layer.querySelectorAll('[data-project-insights-close]')] : [];
        this.boundKeydown = event => {
            if (event.key === 'Escape' && this.layer?.classList.contains('is-open')) this.setOpen(false, { restoreFocus: true });
        };
        this.boundResize = () => {
            if (this.layer?.classList.contains('is-open')) this.updateBoundary();
        };
        if (!this.layer) return;
        document.body.appendChild(this.layer);
        this.closeButtons.forEach(button => button.addEventListener('click', () => this.setOpen(false, { restoreFocus: true })));
        document.addEventListener('keydown', this.boundKeydown);
        window.addEventListener('resize', this.boundResize, { passive: true });
    }

    updateBoundary() {
        if (!this.layer) return;
        const sidebar = document.querySelector('#projects .projects-sidebar');
        const rightEdge = sidebar?.getBoundingClientRect().right;
        const fallback = Math.round(window.innerWidth * 0.32);
        const requestedLeft = Number.isFinite(rightEdge) ? Math.round(rightEdge + 14) : fallback;
        const left = Math.max(360, Math.min(requestedLeft, window.innerWidth - 640));
        this.layer.style.setProperty('--project-insights-left', `${left}px`);
    }

    setOpen(open, { restoreFocus = false, immediate = false } = {}) {
        if (!this.layer) return;
        const isOpen = Boolean(open);
        clearTimeout(this.closeTimer);
        document.querySelectorAll('[data-project-details-trigger]').forEach(button => {
            const buttonProjectId = decodeURIComponent(button.dataset.projectDetailsTrigger || '');
            button.setAttribute('aria-expanded', String(isOpen && String(buttonProjectId) === String(projectDetailsReturnId)));
        });
        if (isOpen) {
            this.updateBoundary();
            this.layer.hidden = false;
            this.layer.setAttribute('aria-hidden', 'false');
            document.body.classList.add('project-insights-open');
            requestAnimationFrame(() => {
                this.layer.classList.add('is-open');
                this.layer.querySelector('.project-insights-head [data-project-insights-close]')?.focus({ preventScroll: true });
            });
            return;
        }
        this.layer.classList.remove('is-open');
        this.layer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('project-insights-open');
        const finish = () => {
            if (!this.layer.classList.contains('is-open')) this.layer.hidden = true;
        };
        if (immediate) finish();
        else this.closeTimer = setTimeout(finish, 280);
        if (restoreFocus && projectDetailsReturnId) {
            requestAnimationFrame(() => {
                const encodedId = encodeInlineId(projectDetailsReturnId);
                const triggers = [...document.querySelectorAll(`[data-project-details-trigger="${encodedId}"]`)];
                triggers.find(button => button.offsetParent !== null)?.focus({ preventScroll: true });
            });
        }
    }

    destroy() {
        clearTimeout(this.closeTimer);
        document.removeEventListener('keydown', this.boundKeydown);
        window.removeEventListener('resize', this.boundResize);
        this.setOpen(false, { immediate: true });
        this.layer?.remove();
    }
}

class IdeaCaptureShowcase {
    constructor(root) {
        this.root = root;
        this.features = Array.isArray(IDEA_CAPTURE_FEATURES) ? IDEA_CAPTURE_FEATURES : [];
        this.index = 0;
        this.loadedVideo = '';
        this.isVisible = false;
        this.unloadTimer = null;
        this.viewportFrame = null;
        this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.saveData = Boolean(navigator.connection?.saveData);
        this.shouldAutoplay = !this.reduceMotion && !this.saveData;
        this.image = root.querySelector('[data-idea-image]');
        this.video = root.querySelector('[data-idea-video]');
        this.phone = root.querySelector('[data-idea-phone]');
        this.stage = root.querySelector('#idea-stage-panel');
        this.visibilityTarget = root.querySelector('[data-idea-visibility-target]') || root;
        this.textFrame = root.querySelector('[data-idea-text-frame]');
        this.tabs = root.querySelector('[data-idea-tabs]');
        this.progress = root.querySelector('[data-idea-progress]');
        this.loader = root.querySelector('[data-idea-loader]');
        this.textEyebrow = root.querySelector('[data-idea-text-eyebrow]');
        this.textTitle = root.querySelector('[data-idea-text-title]');
        this.textDescription = root.querySelector('[data-idea-text-description]');
        this.textPoints = root.querySelector('[data-idea-text-points]');
        this.detailsController = new ProjectInsightsController(root, '[data-idea-details]');
        this.boundVisibilityHandler = () => this.handleDocumentVisibility();
        this.boundViewportHandler = () => this.scheduleViewportCheck();

        if (!this.image || !this.video || !this.phone || !this.stage || !this.textFrame || !this.tabs || !this.features.length) return;
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
                id="idea-tab-${escapeHtml(feature.id)}"
                role="tab"
                aria-selected="${index === 0}"
                aria-controls="idea-stage-panel"
                tabindex="${index === 0 ? '0' : '-1'}"
                data-idea-tab="${index}">
                <i data-lucide="${normalizeIconName(feature.icon, 'circle')}" aria-hidden="true"></i>
                <strong>${escapeHtml(feature.navLabel)}</strong>
                <span aria-hidden="true"></span>
            </button>
        `).join('');
    }

    bindEvents() {
        this.tabs.addEventListener('click', event => {
            const button = event.target.closest('[data-idea-tab]');
            if (!button) return;
            const index = Number(button.dataset.ideaTab);
            const restart = index === this.index && this.features[index]?.kind === 'video';
            this.selectFeature(index, { load: true, restart });
        });

        this.tabs.addEventListener('keydown', event => {
            const current = event.target.closest('[data-idea-tab]');
            if (!current) return;
            const currentIndex = Number(current.dataset.ideaTab);
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
        this.video.addEventListener('playing', () => this.setLoading(false));
        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.video.addEventListener('ended', () => {
            this.setLoading(false);
            this.updateProgress();
        });
        this.video.addEventListener('error', () => this.fallbackToImage());
        document.addEventListener('visibilitychange', this.boundVisibilityHandler);
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
            this.setViewportVisibility(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.45));
        }, {
            threshold: [0, 0.2, 0.45, 0.75],
            rootMargin: '-6% 0px -6% 0px'
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
            this.setViewportVisibility(visibleRatio >= 0.45);
        });
    }

    setViewportVisibility(visible) {
        const changed = this.isVisible !== visible;
        this.isVisible = visible;
        const feature = this.features[this.index];

        if (visible) {
            clearTimeout(this.unloadTimer);
            this.unloadTimer = null;
            if (feature?.kind === 'video' && (changed || !this.loadedVideo)) {
                this.loadVideo(feature, { autoplay: this.shouldAutoplay });
            }
            return;
        }

        if (changed && this.loadedVideo) this.pauseAndScheduleUnload();
    }

    selectFeature(index, { load = false, focus = false, restart = false } = {}) {
        if (!Number.isInteger(index) || index < 0 || index >= this.features.length) return;
        this.index = index;
        const feature = this.features[index];
        this.stage.setAttribute('aria-labelledby', `idea-tab-${feature.id}`);
        this.root.style.setProperty('--idea-progress', '0%');
        this.progress?.setAttribute('aria-valuenow', '0');
        this.root.classList.remove('idea-has-media-error');

        this.tabs.querySelectorAll('[data-idea-tab]').forEach((button, buttonIndex) => {
            const selected = buttonIndex === index;
            button.setAttribute('aria-selected', String(selected));
            button.tabIndex = selected ? 0 : -1;
            if (selected && focus) button.focus();
        });

        if (feature.kind === 'text') {
            this.showText(feature);
        } else {
            this.showPhone(feature, { load, restart });
        }
        refreshIcons();
    }

    showText(feature) {
        this.unloadVideo();
        this.phone.hidden = true;
        this.textFrame.hidden = false;
        this.textEyebrow.textContent = feature.eyebrow;
        this.textTitle.textContent = feature.title;
        this.textDescription.textContent = feature.description;
        this.textPoints.innerHTML = (Array.isArray(feature.points) ? feature.points : [])
            .map(point => `<li><i data-lucide="check"></i><span>${escapeHtml(point)}</span></li>`)
            .join('');
        this.setLoading(false);
    }

    showPhone(feature, { load = false, restart = false } = {}) {
        this.phone.hidden = false;
        this.textFrame.hidden = true;
        this.image.src = feature.image || '';
        this.image.alt = `${feature.navLabel} von Idea Capture`;
        this.image.hidden = false;
        this.video.poster = feature.image || '';
        this.video.setAttribute('aria-label', `${feature.navLabel}: kurze Produktdemo`);

        if (restart && this.loadedVideo === feature.video) {
            try { this.video.currentTime = 0; } catch (error) { /* metadata not ready */ }
        }

        if (load || this.isVisible) {
            this.loadVideo(feature, { autoplay: this.isVisible && this.shouldAutoplay });
        } else {
            this.video.hidden = true;
            this.setLoading(false);
        }
    }

    loadVideo(feature, { autoplay = false } = {}) {
        if (!feature?.video) {
            this.fallbackToImage();
            return;
        }
        clearTimeout(this.unloadTimer);
        if (this.loadedVideo !== feature.video) {
            this.unloadVideo();
            this.setLoading(true);
            this.video.src = feature.video;
            this.video.load();
            this.loadedVideo = feature.video;
        }
        this.image.hidden = true;
        this.video.hidden = false;
        if (autoplay) this.safePlay();
    }

    async safePlay() {
        if (!this.shouldAutoplay || !this.isVisible || document.hidden) return;
        try {
            await this.video.play();
        } catch (error) {
            this.video.hidden = true;
            this.image.hidden = false;
            this.setLoading(false);
        }
    }

    fallbackToImage({ keepSource = false } = {}) {
        const feature = this.features[this.index];
        this.video.pause();
        this.video.hidden = true;
        this.image.src = feature?.image || '';
        this.image.alt = `${feature?.navLabel || 'App'} von Idea Capture`;
        this.image.hidden = false;
        this.root.classList.add('idea-has-media-error');
        this.setLoading(false);
        if (!keepSource) this.unloadVideo();
    }

    pauseAndScheduleUnload() {
        this.video.pause();
        clearTimeout(this.unloadTimer);
        this.unloadTimer = setTimeout(() => {
            this.unloadTimer = null;
            if (!this.isVisible) this.unloadVideo();
        }, 1500);
    }

    unloadVideo() {
        clearTimeout(this.unloadTimer);
        this.unloadTimer = null;
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
        this.video.hidden = true;
        this.loadedVideo = '';
        this.root.style.setProperty('--idea-progress', '0%');
        this.progress?.setAttribute('aria-valuenow', '0');
        this.setLoading(false);
    }

    updateProgress() {
        const duration = Number(this.video.duration);
        const currentTime = Number(this.video.currentTime);
        const percent = Number.isFinite(duration) && duration > 0
            ? Math.min(100, Math.max(0, currentTime / duration * 100))
            : 0;
        this.root.style.setProperty('--idea-progress', `${percent}%`);
        this.progress?.setAttribute('aria-valuenow', String(Math.round(percent)));
    }

    setLoading(value) {
        this.root.classList.toggle('idea-is-loading', Boolean(value));
        if (this.loader) this.loader.hidden = !value;
    }

    handleDocumentVisibility() {
        if (document.hidden) {
            if (this.loadedVideo) this.pauseAndScheduleUnload();
            return;
        }
        const feature = this.features[this.index];
        if (this.isVisible && feature?.kind === 'video') {
            this.loadVideo(feature, { autoplay: this.shouldAutoplay });
        }
    }

    setDetailsOpen(open, options = {}) {
        this.detailsController?.setOpen(open, options);
    }

    destroy() {
        clearTimeout(this.unloadTimer);
        if (this.viewportFrame !== null) cancelAnimationFrame(this.viewportFrame);
        this.observer?.disconnect();
        document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
        window.removeEventListener('scroll', this.boundViewportHandler);
        window.removeEventListener('resize', this.boundViewportHandler);
        this.detailsController?.destroy();
        this.unloadVideo();
    }
}

class ResumeWebsiteShowcase {
    constructor(root) {
        this.root = root;
        this.features = Array.isArray(RESUME_WEBSITE_FEATURES) ? RESUME_WEBSITE_FEATURES : [];
        this.index = 0;
        this.loadedVideo = '';
        this.detailsCloseTimer = null;
        this.image = root.querySelector('[data-resume-image]');
        this.video = root.querySelector('[data-resume-video]');
        this.tabs = root.querySelector('[data-resume-tabs]');
        this.eyebrow = root.querySelector('[data-resume-eyebrow]');
        this.title = root.querySelector('[data-resume-title]');
        this.description = root.querySelector('[data-resume-description]');
        this.panel = root.querySelector('.resume-media-panel');
        this.progress = root.querySelector('[data-resume-progress]');
        this.loader = root.querySelector('[data-resume-loader]');
        this.details = root.querySelector('[data-resume-details]');
        this.closeButtons = [...root.querySelectorAll('[data-resume-details-close]')];
        this.boundKeydown = event => this.handleDocumentKeydown(event);
        this.boundResize = () => {
            if (this.details?.classList.contains('is-open')) this.updateDetailsBoundary();
        };

        if (this.details) document.body.appendChild(this.details);
        if (!this.image || !this.video || !this.tabs || !this.features.length) return;
        this.video.muted = true;
        this.video.defaultMuted = true;
        this.renderTabs();
        this.bindEvents();
        this.selectFeature(0, { focus: false });
    }

    renderTabs() {
        this.tabs.innerHTML = this.features.map((feature, index) => `
            <button
                type="button"
                id="resume-tab-${escapeHtml(feature.id)}"
                role="tab"
                aria-selected="${index === 0}"
                aria-controls="resume-media-panel"
                tabindex="${index === 0 ? '0' : '-1'}"
                data-resume-tab="${index}">
                <i data-lucide="${normalizeIconName(feature.icon, 'circle')}" aria-hidden="true"></i>
                <strong>${escapeHtml(feature.navLabel)}</strong>
                <span aria-hidden="true"></span>
            </button>
        `).join('');
    }

    bindEvents() {
        this.tabs.addEventListener('click', event => {
            const button = event.target.closest('[data-resume-tab]');
            if (!button) return;
            this.selectFeature(Number(button.dataset.resumeTab));
        });

        this.tabs.addEventListener('keydown', event => {
            const current = event.target.closest('[data-resume-tab]');
            if (!current) return;
            const currentIndex = Number(current.dataset.resumeTab);
            const offset = ['ArrowRight', 'ArrowDown'].includes(event.key)
                ? 1
                : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
            let nextIndex = null;
            if (event.key === 'Home') nextIndex = 0;
            else if (event.key === 'End') nextIndex = this.features.length - 1;
            else if (offset) nextIndex = (currentIndex + offset + this.features.length) % this.features.length;
            if (nextIndex === null) return;
            event.preventDefault();
            this.selectFeature(nextIndex, { focus: true });
        });

        this.closeButtons.forEach(button => {
            button.addEventListener('click', () => this.setDetailsOpen(false, { restoreFocus: true }));
        });
        this.video.addEventListener('loadstart', () => this.setLoading(true));
        this.video.addEventListener('waiting', () => this.setLoading(true));
        this.video.addEventListener('canplay', () => this.setLoading(false));
        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.video.addEventListener('ended', () => this.video.play().catch(() => {}));
        this.video.addEventListener('error', () => this.fallbackToImage());
        document.addEventListener('keydown', this.boundKeydown);
        window.addEventListener('resize', this.boundResize, { passive: true });
    }

    selectFeature(index, { focus = false } = {}) {
        if (!Number.isInteger(index) || index < 0 || index >= this.features.length) return;
        this.index = index;
        const feature = this.features[index];
        this.eyebrow.textContent = feature.eyebrow;
        this.title.textContent = feature.title;
        this.description.textContent = feature.description;
        this.panel?.setAttribute('aria-labelledby', `resume-tab-${feature.id}`);
        this.root.style.setProperty('--resume-progress', '0%');

        this.tabs.querySelectorAll('[data-resume-tab]').forEach((button, buttonIndex) => {
            const selected = buttonIndex === index;
            button.setAttribute('aria-selected', String(selected));
            button.tabIndex = selected ? 0 : -1;
            if (selected && focus) button.focus();
        });

        if (feature.video) this.showVideo(feature);
        else this.showImage(feature);
        refreshIcons();
    }

    showImage(feature) {
        this.unloadVideo();
        this.image.src = feature.image;
        this.image.alt = `${feature.navLabel} der Resume Website`;
        this.image.hidden = false;
        this.video.hidden = true;
        this.progress?.setAttribute('aria-valuenow', '0');
        this.setLoading(false);
    }

    showVideo(feature) {
        this.image.src = feature.image;
        this.image.alt = `${feature.navLabel} der Resume Website`;
        this.image.hidden = true;
        this.video.hidden = false;
        this.video.poster = feature.image;
        this.video.setAttribute('aria-label', `${feature.navLabel}: kurze Website-Demo`);
        if (this.loadedVideo !== feature.video) {
            this.unloadVideo();
            this.setLoading(true);
            this.video.hidden = false;
            this.video.src = feature.video;
            this.video.load();
            this.loadedVideo = feature.video;
        }
        this.video.play().catch(() => {});
    }

    fallbackToImage() {
        const feature = this.features[this.index];
        if (feature) this.showImage(feature);
    }

    unloadVideo() {
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
        this.loadedVideo = '';
        this.root.style.setProperty('--resume-progress', '0%');
    }

    updateProgress() {
        const duration = Number(this.video.duration);
        const currentTime = Number(this.video.currentTime);
        const percent = Number.isFinite(duration) && duration > 0
            ? Math.min(100, Math.max(0, currentTime / duration * 100))
            : 0;
        this.root.style.setProperty('--resume-progress', `${percent}%`);
        this.progress?.setAttribute('aria-valuenow', String(Math.round(percent)));
    }

    setLoading(isLoading) {
        this.root.classList.toggle('resume-is-loading', Boolean(isLoading));
        if (this.loader) this.loader.hidden = !isLoading;
    }

    updateDetailsBoundary() {
        if (!this.details) return;
        const sidebar = document.querySelector('#projects .projects-sidebar');
        const rightEdge = sidebar?.getBoundingClientRect().right;
        const fallback = Math.round(window.innerWidth * 0.32);
        const requestedLeft = Number.isFinite(rightEdge) ? Math.round(rightEdge + 14) : fallback;
        const left = Math.max(360, Math.min(requestedLeft, window.innerWidth - 640));
        this.details.style.setProperty('--resume-details-left', `${left}px`);
    }

    setDetailsOpen(open, { restoreFocus = false, immediate = false } = {}) {
        if (!this.details) return;
        const isOpen = Boolean(open);
        clearTimeout(this.detailsCloseTimer);

        document.querySelectorAll('[data-project-details-trigger]').forEach(button => {
            const buttonProjectId = decodeURIComponent(button.dataset.projectDetailsTrigger || '');
            button.setAttribute('aria-expanded', String(isOpen && String(buttonProjectId) === String(projectDetailsReturnId)));
        });

        if (isOpen) {
            this.updateDetailsBoundary();
            this.details.hidden = false;
            this.details.setAttribute('aria-hidden', 'false');
            document.body.classList.add('resume-structure-open');
            requestAnimationFrame(() => {
                this.details.classList.add('is-open');
                this.root.classList.add('resume-details-open');
                this.details.querySelector('.resume-structure-head [data-resume-details-close]')?.focus({ preventScroll: true });
            });
            return;
        }

        this.details.classList.remove('is-open');
        this.root.classList.remove('resume-details-open');
        this.details.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('resume-structure-open');
        const finishClose = () => {
            if (!this.details.classList.contains('is-open')) this.details.hidden = true;
        };
        if (immediate) finishClose();
        else this.detailsCloseTimer = setTimeout(finishClose, 280);

        if (restoreFocus && projectDetailsReturnId) {
            requestAnimationFrame(() => {
                const encodedId = encodeInlineId(projectDetailsReturnId);
                const triggers = [...document.querySelectorAll(`[data-project-details-trigger="${encodedId}"]`)];
                triggers.find(button => button.offsetParent !== null)?.focus({ preventScroll: true });
            });
        }
    }

    handleDocumentKeydown(event) {
        if (event.key === 'Escape' && this.details?.classList.contains('is-open')) {
            this.setDetailsOpen(false, { restoreFocus: true });
        }
    }

    destroy() {
        clearTimeout(this.detailsCloseTimer);
        document.removeEventListener('keydown', this.boundKeydown);
        window.removeEventListener('resize', this.boundResize);
        this.setDetailsOpen(false, { immediate: true });
        this.details?.remove();
        this.unloadVideo();
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
            ? 'Nivora verbindet Ziele, Fähigkeiten, Fokus und Belohnungen zu einem gemeinsamen Lernsystem. Aktuell sammle ich Daten, um seine Wirkung später ehrlich auszuwerten.'
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
