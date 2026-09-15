/* Projects, library, documents, blog and education rendering. */

function getCollectionForType(type) {
    const keyByType = { project: 'projects', book: 'books', document: 'documents', blog: 'blogs' };
    const key = keyByType[type];
    return key && Array.isArray(state.data[key]) ? state.data[key] : [];
}

function findItemByTypeAndId(type, id) {
    return getCollectionForType(type).find(item => String(item.id) === String(id)) || null;
}

function renderSection(type) {
    const renderers = {
        profile: renderProfileAndAbout,
        about: renderProfileAndAbout,
        education: renderEducation,
        projects: renderProjects,
        project: renderProjects,
        books: renderBooks,
        book: renderBooks,
        documents: renderDocuments,
        document: renderDocuments,
        blogs: renderBlog,
        blog: renderBlog
    };
    const renderer = renderers[type];
    if (!renderer) return;
    renderer();
    refreshIcons();
    observeElements();
}

function renderProfileAndAbout(options = {}) {
    const p = state.data.profile;
    if (!options.skipProfile) {
        document.getElementById('hero-name').innerText = p.name || "Ivan";
        document.getElementById('hero-role').innerText = p.role || "";
        updateSliderView();
    }

    state.data.about = migrateAboutData(state.data.about);
    const ab = state.data.about;

    const introShortEl = document.getElementById('about-intro-short');
    const introFullEl = document.getElementById('about-intro-full');
    const factsGridEl = document.getElementById('about-facts-grid');
    const skillsGridEl = document.getElementById('about-skills-grid');
    const principlesGridEl = document.getElementById('about-principles-grid');

    if (introShortEl) introShortEl.innerText = ab.introShort || "";
    if (introFullEl) introFullEl.innerText = ab.introFull || "";
    applyAboutContentSettings(ab);
    applyAboutLayoutSettings(ab);
    if (factsGridEl) factsGridEl.innerHTML = renderAboutFacts(ab);
    if (skillsGridEl) skillsGridEl.innerHTML = renderAboutSkills(ab);
    if (principlesGridEl) principlesGridEl.innerHTML = renderAboutPrinciples(ab);
    initializeAboutFocusSlider();
}

function renderProjectsLegacy() {
    const container = document.getElementById('projects-container');
    if (!container) return;
    const limit = 6;
    const projects = Array.isArray(state.data.projects) ? state.data.projects : [];
    const items = state.expanded.projects ? projects : projects.slice(0, limit);

    container.innerHTML = items.map(p => {
        const id = encodeInlineId(p.id);
        const title = escapeHtml(p.title || 'Projekt');
        const desc = escapeHtml(p.desc || '');
        const icon = normalizeIconName(p.icon, 'folder');
        const imageUrl = getSafeImageUrl(p.img);
        const tech = String(p.tech || '').split(',').map(item => item.trim()).filter(Boolean);
        return `
        <div class="group relative bg-gx-bg border border-zinc-800 overflow-hidden flex flex-col cursor-pointer glow-hover" onclick="openViewModal('project', decodeURIComponent('${id}')); playClickSound();">
            <div class="absolute top-2 right-2 group/menu z-20 admin-only">
                <button type="button" aria-label="Projektmenü öffnen" class="text-zinc-500 hover:text-gx-yellow p-1 bg-zinc-900/80 rounded backdrop-blur" onclick="event.stopPropagation()"><i data-lucide="more-vertical" class="w-5 h-5"></i></button>
                <div class="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 shadow-xl hidden group-hover/menu:block rounded min-w-[140px]">
                    <button type="button" onclick="event.stopPropagation(); openFormModal('project', decodeURIComponent('${id}')); playClickSound();" class="w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 text-gx-text transition-colors">Bearbeiten</button>
                    <button type="button" onclick="event.stopPropagation(); requestDelete('project', decodeURIComponent('${id}')); playClickSound();" class="w-full text-left px-4 py-2 text-sm hover:bg-red-900/50 text-red-400 transition-colors">Löschen</button>
                </div>
            </div>
            <div class="h-48 overflow-hidden relative ${!imageUrl ? 'border-b border-zinc-800 flex items-center justify-center bg-zinc-900' : ''}">
                ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="Vorschau: ${title}" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 grayscale group-hover:grayscale-0">` :
                          `<i data-lucide="${icon}" class="w-16 h-16 text-zinc-700 group-hover:text-gx-yellow transition-colors duration-500"></i>`}
            </div>
            <div class="p-6 flex-1 flex flex-col">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-bold group-hover:text-gx-yellow transition-colors truncate pr-4">${title}</h3>
                    <i data-lucide="${icon}" class="text-zinc-600 w-5 h-5 shrink-0"></i>
                </div>
                <p class="text-gx-muted text-sm mb-6 flex-1 line-clamp-3">${desc}</p>
                <div class="flex gap-2 text-xs font-mono text-zinc-500 flex-wrap">
                    ${tech.map(item => `<span>${escapeHtml(item)}</span>`).join('')}
                </div>
            </div>
        </div>
    `}).join('');

    const btn = document.getElementById('btn-more-projects');
    if (!btn) return;
    btn.style.display = projects.length <= limit ? 'none' : 'inline-block';
    if(projects.length > limit) btn.innerText = state.expanded.projects ? 'Verbergen' : 'Mehr Projekte anzeigen';
}

function renderDocumentsLegacy() {
    const c = document.getElementById('documents-container');
    if (!c) return;
    const limit = 4;
    const documents = Array.isArray(state.data.documents) ? state.data.documents : [];
    const items = state.expanded.documents ? documents : documents.slice(0, limit);

    c.innerHTML = items.map(d => {
        const id = encodeInlineId(d.id);
        const imageUrl = getSafeImageUrl(d.img);
        const fileUrl = getSafeLinkUrl(d.fileUrl);
        const icon = normalizeIconName(d.icon, 'file-text');
        return `
        <div class="bg-gx-bg border border-zinc-700 hover:border-gx-yellow transition-colors duration-300 group relative cursor-pointer" onclick="openViewModal('document', decodeURIComponent('${id}')); playClickSound();">
            <div class="absolute right-2 top-2 hidden admin-only group-hover:flex gap-1 z-20 bg-zinc-900/90 backdrop-blur rounded p-1 border border-zinc-700">
                <button type="button" onclick="event.stopPropagation(); openFormModal('document', decodeURIComponent('${id}')); playClickSound();" aria-label="Dokument bearbeiten" class="p-1 text-zinc-400 hover:text-gx-yellow"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                <button type="button" onclick="event.stopPropagation(); requestDelete('document', decodeURIComponent('${id}')); playClickSound();" aria-label="Dokument löschen" class="p-1 text-zinc-400 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
            <div class="h-40 bg-zinc-900 flex items-center justify-center border-b border-zinc-800 group-hover:bg-zinc-800 transition-colors relative overflow-hidden">
                ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="Vorschau: ${escapeHtml(d.title || 'Dokument')}" loading="lazy" decoding="async" class="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity">` : `<i data-lucide="${icon}" class="w-12 h-12 text-zinc-600 group-hover:text-gx-yellow transition-colors"></i>`}
            </div>
            <div class="p-4">
                <p class="text-xs text-gx-yellow font-mono mb-1">${escapeHtml(d.ext || 'FILE')} • ${escapeHtml(d.size || '0 KB')}</p>
                <h4 class="font-bold mb-4 line-clamp-1 group-hover:text-gx-yellow transition-colors">${escapeHtml(d.title || 'Dokument')}</h4>
                <div class="flex gap-2">
                    <button type="button" class="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 text-sm flex justify-center items-center gap-2 transition-colors">
                        <i data-lucide="eye" class="w-4 h-4"></i> Ansicht
                    </button>
                    <a href="${escapeHtml(fileUrl)}" download onclick="event.stopPropagation(); if(this.getAttribute('href') === '#') { event.preventDefault(); showToast('Für dieses Dokument wurde noch keine Datei hinterlegt.'); } playClickSound();" class="flex-1 bg-gx-yellow text-gx-bg hover:bg-yellow-500 py-2 text-sm font-bold flex justify-center items-center gap-2 transition-colors">
                        <i data-lucide="download" class="w-4 h-4"></i> Download
                    </a>
                </div>
            </div>
        </div>
    `}).join('');

    const btn = document.getElementById('btn-more-documents');
    if (!btn) return;
    btn.style.display = documents.length <= limit ? 'none' : 'inline-block';
    if(documents.length > limit) btn.innerText = state.expanded.documents ? 'Verbergen' : 'Mehr Dokumente anzeigen';
}

function renderBlogLegacy() {
    const container = document.getElementById('blog-container');
    const blogs = Array.isArray(state.data.blogs) ? state.data.blogs : [];

    if (blogs.length === 0) {
        container.innerHTML = `<p class="text-zinc-500 col-span-2 text-center italic">Noch keine Blogbeiträge.</p>`;
        return;
    }

    container.innerHTML = blogs.map(b => {
        const id = encodeInlineId(b.id);
        return `
        <article class="p-6 bg-gx-card border border-zinc-800 glow-hover relative group/blogitem">
            <div class="absolute right-4 top-4 hidden admin-only group-hover/blogitem:flex gap-1 bg-zinc-900 border border-zinc-700 rounded p-1">
                <button type="button" onclick="openFormModal('blog', decodeURIComponent('${id}')); playClickSound();" aria-label="Beitrag bearbeiten" class="text-zinc-400 hover:text-gx-yellow p-1"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                <button type="button" onclick="requestDelete('blog', decodeURIComponent('${id}')); playClickSound();" aria-label="Beitrag löschen" class="text-zinc-400 hover:text-red-500 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
            <div class="flex items-center gap-3 mb-4 text-sm font-mono text-zinc-500">
                <i data-lucide="calendar" class="w-4 h-4"></i> ${escapeHtml(b.date || 'Kürzlich')}
                <span class="text-gx-yellow ml-auto">${escapeHtml(b.tag || '#WebDev')}</span>
            </div>
            <h3 class="text-2xl font-bold mb-3 hover:text-gx-yellow transition-colors cursor-pointer" onclick="openViewModal('blog', decodeURIComponent('${id}')); playClickSound();">${escapeHtml(b.title || 'Beitrag')}</h3>
            <p class="text-gx-muted mb-4 line-clamp-3">${escapeHtml(b.desc || '')}</p>
            <button type="button" onclick="openViewModal('blog', decodeURIComponent('${id}')); playClickSound();" class="inline-flex items-center gap-2 text-gx-yellow hover:text-yellow-400 font-bold text-sm">
                Weiterlesen <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
        </article>
    `}).join('');
}



function getEducationItems() {
    return mergeEducationItemsById(
        state.data.educationItems,
        getDefaultEducationItems(),
        state.data.educationRemovedItems
    );
}

function getEducationGoal() {
    const defaultGoal = getDefaultEducationGoal();
    const sourceGoal = state.data.educationGoal && typeof state.data.educationGoal === 'object'
        ? state.data.educationGoal
        : {};
    const sourceBranches = Array.isArray(sourceGoal.branches) ? sourceGoal.branches : [];
    const sourceBranchesById = new Map(sourceBranches
        .filter(branch => branch && typeof branch === 'object' && branch.id)
        .map(branch => [branch.id, branch]));

    return {
        locked: true,
        branches: defaultGoal.branches.map(branch => ({
            ...branch,
            ...(sourceBranchesById.get(branch.id) || {}),
            id: branch.id,
            locked: true
        }))
    };
}

function getEducationPositionClass(index) {
    return index % 2 === 0 ? 'is-top' : 'is-bottom';
}

function applyEducationContentSettings() {
    const content = normalizeEducationTextMap(state.data.educationContent, getDefaultEducationContent());
    const title = document.getElementById('education-section-title');
    const subtitle = document.getElementById('education-section-subtitle');
    if (title) title.textContent = content.sectionTitle;
    if (subtitle) subtitle.textContent = content.sectionSubtitle;
}

function applyEducationLayoutSettings(container) {
    const layout = normalizeEducationLayout(state.data.educationLayout);
    container.style.setProperty('--education-card-width', `${layout.cardWidth}px`);
    container.style.setProperty('--education-card-height', `${layout.cardHeight}px`);
    container.style.setProperty('--education-track-height', `${layout.timelineHeight}px`);
    container.style.setProperty('--education-line-top', `${layout.linePosition}px`);
    container.style.setProperty('--education-goal-width', `${layout.goalWidth}px`);
}

function renderEducation() {
    const container = document.getElementById('education-timeline-container');
    if (!container) return;

    applyEducationContentSettings();
    applyEducationLayoutSettings(container);
    const items = getEducationItems().slice(0, 20);
    const goal = getEducationGoal();
    const nodesHtml = items.map((item, index) => renderEducationNode(item, index, index === items.length - 1)).join('');
    const scrollClass = items.length > 8 ? ' is-scrollable' : '';
    const trackWidth = Math.max(0, (items.length * 168) + 288);

    container.innerHTML = `
        <div class="education-timeline-scroll${scrollClass}" aria-label="Bildungsweg Timeline">
            <div class="education-timeline-track${scrollClass}" style="--education-item-count: ${Math.max(items.length, 1)}; --education-track-min-width: ${trackWidth}px">
                ${nodesHtml}
                ${renderEducationGoal(goal)}
            </div>
        </div>
    `;
}

function formatEducationCardTitle(title) {
    return escapeHtml(title || 'Bildung')
        .replace('3D-Visualisierung', '3D-<wbr>Visualisierung')
        .replace('AI-Integrator-Kurs', 'AI-Integrator-<wbr>Kurs')
        .replace('Arbeitsvorbereitung', 'Arbeits<wbr>vorbereitung');
}

function renderEducationNode(item, index, isLast = false) {
    const id = encodeURIComponent(String(item.id || ''));
    const positionClass = getEducationPositionClass(index);
    const stateClass = item.statusType === 'current' ? 'is-current' : item.statusType === 'completed' ? 'is-completed' : item.statusType === 'partial' ? 'is-partial' : 'is-progress';
    const title = escapeHtml(item.title || 'Bildung');
    const cardTitle = formatEducationCardTitle(item.title);
    const rawSubtitle = String(item.subtitle || '').trim();
    const subtitle = item.statusType === 'current' && rawSubtitle.toLocaleLowerCase('de-DE') === 'aktuell'
        ? ''
        : escapeHtml(rawSubtitle);
    const subtitleHtml = subtitle ? `<span class="education-card-subtitle">${subtitle}</span>` : '';
    const icon = escapeHtml(item.icon || 'book-open');
    const level = escapeHtml(item.level || String(index + 1).padStart(2, '0'));
    const years = escapeHtml(item.years || '');
    const currentLabel = item.statusType === 'current' ? `<div class="education-card-current-label">Aktuell</div>` : '';
    const clickable = item.clickable !== false;
    const actionAttributes = clickable
        ? `onclick="openEducationDetail(decodeURIComponent('${id}')); playClickSound();"`
        : 'disabled aria-disabled="true"';

    return `
        <div class="education-node ${positionClass} ${stateClass}${isLast ? ' is-last' : ''}">
            <span class="education-dot" aria-hidden="true"></span>
            <button type="button" class="education-card ${stateClass}" ${actionAttributes} aria-label="Details zu ${title} öffnen">
                <span class="education-card-meta">
                    <span class="education-card-lvl">LVL ${level}</span>
                    ${years ? `<span class="education-card-years">${years}</span>` : ''}
                </span>
                <i data-lucide="${icon}" class="education-card-icon"></i>
                <span class="education-card-title">${cardTitle}</span>
                ${subtitleHtml}
                ${currentLabel}
            </button>
        </div>
    `;
}

function renderEducationGoal(goal) {
    const branches = Array.isArray(goal?.branches) && goal.branches.length > 0
        ? goal.branches.slice(0, 2)
        : getDefaultEducationGoal().branches;
    const ariaLabel = branches
        .map(branch => String(branch?.title || 'Nächster Weg'))
        .join(' oder ');
    const branchesHtml = branches.map((branch, index) => {
        const title = escapeHtml(branch?.title || 'Nächster Weg');
        const subtitle = escapeHtml(branch?.subtitle || 'Möglicher Weg');
        const status = escapeHtml(branch?.status || 'Offen');
        const icon = escapeHtml(branch?.icon || 'lock');
        const positionClass = index === 0 ? 'is-upper' : 'is-lower';

        return `
            <div class="education-goal-branch ${positionClass}">
                <div class="education-goal-marker" aria-disabled="true" aria-label="${subtitle}: ${title}, ${status}">
                    <span class="education-goal-label">${subtitle}</span>
                    <i data-lucide="${icon}"></i>
                    <span class="education-goal-title">${title}</span>
                    <span class="education-goal-status">${status}</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="education-goal-node" aria-label="Mögliche nächste Wege: ${escapeHtml(ariaLabel)}">
            <span class="education-goal-dot" aria-hidden="true"></span>
            <span class="education-goal-fork-line is-upper" aria-hidden="true"></span>
            <span class="education-goal-fork-line is-lower" aria-hidden="true"></span>
            <div class="education-goal-branches">
                ${branchesHtml}
            </div>
        </div>
    `;
}

function findEducationItemById(itemId) {
    const id = String(itemId || '');
    return getEducationItems().find(item => String(item.id || '') === id) || null;
}

function openEducationDetail(itemId) {
    const item = findEducationItemById(itemId);
    if (!item) return;

    showModal(renderEducationDetail(item));
    document.getElementById('modal-container')?.classList.add('education-detail-modal-wide');
    refreshIcons();
}

function renderEducationDetail(item) {
    const level = escapeHtml(item.level || '');
    const title = escapeHtml(item.title || 'Bildung');
    const status = escapeHtml(item.status || '');
    const icon = escapeHtml(item.icon || 'book-open');
    const textHtml = renderEducationText(item.text);
    const metaHtml = renderEducationMeta(item);
    const evidenceHtml = renderEducationEvidence(item.evidence);
    const progressHtml = renderEducationProgress(item.progress);

    return `
        <article class="education-detail-modal">
            <button type="button" onclick="closeModal(); playClickSound();" class="education-detail-close" aria-label="Bildung Detail schließen">
                <i data-lucide="x"></i>
            </button>
            <div class="education-detail-head">
                <div class="education-detail-lvl">LVL ${level}</div>
                <div class="education-detail-status">${status}</div>
                <div class="education-detail-icon"><i data-lucide="${icon}"></i></div>
            </div>
            <h3 class="education-detail-title">${title}</h3>
            ${metaHtml}
            <div class="education-detail-text">${textHtml}</div>
            ${evidenceHtml}
            ${progressHtml}
        </article>
    `;
}

function renderEducationText(text) {
    const parts = String(text || '').split(/\n+/).map(part => part.trim()).filter(Boolean);
    if (parts.length === 0) return '<p>Weitere Informationen werden ergänzt.</p>';
    return parts.map(part => `<p>${escapeHtml(part)}</p>`).join('');
}

function renderEducationMeta(item) {
    const metaItems = [
        { icon: 'calendar-days', value: item.years },
        { icon: 'map-pin', value: item.place },
        { icon: 'monitor', value: item.format },
        { icon: 'book-open', value: item.topics }
    ].filter(meta => isFilledText(String(meta.value || '')));

    if (metaItems.length === 0) return '';

    return `
        <div class="education-detail-meta">
            ${metaItems.map(meta => `
                <span class="education-detail-meta-item">
                    <i data-lucide="${escapeHtml(meta.icon)}"></i>
                    ${escapeHtml(meta.value)}
                </span>
            `).join('')}
        </div>
    `;
}

function renderEducationEvidence(evidence) {
    if (!Array.isArray(evidence) || evidence.length === 0) return '';

    const cardsHtml = evidence.map(item => renderEducationEvidenceCard(item)).join('');
    return `
        <section class="education-evidence">
            <h4 class="education-evidence-title">Nachweise / Beispiele</h4>
            <div class="education-evidence-grid">
                ${cardsHtml}
            </div>
        </section>
    `;
}

function isSafeEducationUrl(url) {
    const value = String(url || '').trim();
    if (!value || value === '#') return '';
    if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value)) return value;
    try {
        const parsed = new URL(value, window.location.href);
        return ['http:', 'https:', 'file:', 'blob:'].includes(parsed.protocol) ? value : '';
    } catch (_error) {
        return '';
    }
}

function renderEducationEvidenceCard(item) {
    const type = String(item?.type || 'placeholder');
    const title = escapeHtml(item?.title || 'Nachweis');
    const note = escapeHtml(item?.note || 'später hinzufügen');
    const icon = escapeHtml(item?.icon || (type === 'document' ? 'file-text' : 'image'));
    const safeUrl = isSafeEducationUrl(item?.url);

    if (type === 'image' && safeUrl) {
        return `
            <figure class="education-evidence-card">
                <img src="${escapeHtml(safeUrl)}" alt="${title}">
                <figcaption class="education-evidence-card-title">${title}</figcaption>
                <span class="education-evidence-card-note">${note}</span>
            </figure>
        `;
    }

    if (type === 'document' && safeUrl) {
        return `
            <a class="education-evidence-card" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">
                <i data-lucide="${icon}"></i>
                <span class="education-evidence-card-title">${title}</span>
                <span class="education-evidence-card-note">${note}</span>
            </a>
        `;
    }

    return `
        <div class="education-evidence-card" aria-label="${title}">
            <i data-lucide="${icon}"></i>
            <span class="education-evidence-card-title">${title}</span>
            <span class="education-evidence-card-note">${note}</span>
        </div>
    `;
}

function normalizeEducationProgress(progress) {
    const value = Number(progress);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
}

function renderEducationProgress(progress) {
    const normalized = normalizeEducationProgress(progress);
    const filled = Math.round(normalized / 10);
    const segments = Array.from({ length: 10 }, (_, index) => {
        const activeClass = index < filled ? 'is-filled' : '';
        return `<span class="education-detail-progress-segment ${activeClass}" aria-hidden="true"></span>`;
    }).join('');

    return `
        <div class="education-detail-progress">
            <span class="education-detail-progress-label">Fortschritt</span>
            <div class="education-detail-progress-track" aria-label="Fortschritt ${normalized}%">
                ${segments}
            </div>
            <span class="education-detail-progress-percent">${normalized}%</span>
        </div>
    `;
}

function renderAll() {
    renderProfileAndAbout();
    renderEducation();
    renderProjects();
    renderBooks();
    renderDocuments();
    renderBlog();
    refreshIcons();
    observeElements();
}
