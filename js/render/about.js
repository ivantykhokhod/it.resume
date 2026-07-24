/* About-section rendering and focused detail views. */

// --- РЕНДЕРИНГ ВСЕХ СЕКЦИЙ --- //
function toggleMore(type) {
    if (!Object.prototype.hasOwnProperty.call(state.expanded, type)) return;
    state.expanded[type] = !state.expanded[type];
    renderSection(type);
}


function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

function getSafeAboutUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    try {
        const parsed = new URL(raw, window.location.href);
        const protocol = parsed.protocol.toLowerCase();
        if (protocol === 'http:' || protocol === 'https:' || raw.startsWith('data:image/')) {
            return escapeHtml(raw);
        }
    } catch (error) {
        return '';
    }

    return '';
}

function getAboutOrderedFacts(about) {
    const defaults = getDefaultAboutData().facts;
    const labels = ['Standort', 'Sprachen', 'Technologien', 'Verfügbarkeit'];

    return labels.map(label => {
        const current = findFactItem(about?.facts, label);
        const fallback = findFactItem(defaults, label) || { icon: 'info', label, value: '' };
        return { ...cloneData(fallback), ...(current ? cloneData(current) : {}) };
    });
}

function getPinnedAboutItems(items, fallbackItems, limit = 4) {
    const safeItems = Array.isArray(items) ? items : [];
    const visibleItems = safeItems.filter(item => item && item.pinned !== false);
    const source = visibleItems.length ? visibleItems : fallbackItems;
    return source.slice(0, limit).map(item => cloneData(item));
}

const ABOUT_FOCUS_SLIDES = [
    {
        icon: 'cpu',
        title: 'Aktueller Fokus',
        text: 'KI, Automatisierung & digitale Produkte'
    },
    {
        icon: 'workflow',
        title: 'Meine Arbeitsweise',
        text: 'Verstehen → planen → umsetzen → verbessern'
    },
    {
        icon: 'brain',
        title: 'Meine Interessen',
        text: 'Effiziente Lernmethoden, Planungssysteme & Neurologie'
    }
];

let aboutFocusSlideIndex = 0;
let aboutFocusTimer = null;
let aboutFocusTransitionTimer = null;

function renderAboutFocusSlide(index, animate = true) {
    const root = document.getElementById('about-focus-slider');
    const slide = document.getElementById('about-focus-slide');
    const icon = document.getElementById('about-focus-hero-icon');
    const titleEl = document.getElementById('about-focus-title');
    const textEl = document.getElementById('about-focus-text');
    const dots = [...document.querySelectorAll('#about-focus-dots button')];
    if (!root || !slide || !icon || !titleEl || !textEl) return;

    const total = ABOUT_FOCUS_SLIDES.length;
    const safeIndex = ((Number(index) || 0) % total + total) % total;
    const next = ABOUT_FOCUS_SLIDES[safeIndex];
    const applyContent = () => {
        aboutFocusSlideIndex = safeIndex;
        titleEl.textContent = next.title;
        textEl.textContent = next.text;
        icon.innerHTML = `<i data-lucide="${escapeHtml(next.icon)}"></i>`;
        dots.forEach((dot, dotIndex) => {
            const active = dotIndex === safeIndex;
            dot.classList.toggle('is-active', active);
            if (active) dot.setAttribute('aria-current', 'true');
            else dot.removeAttribute('aria-current');
        });
        refreshIcons();
    };

    window.clearTimeout(aboutFocusTransitionTimer);
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        applyContent();
        slide.classList.remove('is-changing');
        icon.classList.remove('is-changing');
        return;
    }

    slide.classList.add('is-changing');
    icon.classList.add('is-changing');
    aboutFocusTransitionTimer = window.setTimeout(() => {
        applyContent();
        requestAnimationFrame(() => {
            slide.classList.remove('is-changing');
            icon.classList.remove('is-changing');
        });
    }, 160);
}

function stopAboutFocusAutoplay() {
    window.clearInterval(aboutFocusTimer);
    aboutFocusTimer = null;
}

function startAboutFocusAutoplay() {
    stopAboutFocusAutoplay();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    aboutFocusTimer = window.setInterval(() => {
        renderAboutFocusSlide(aboutFocusSlideIndex + 1, true);
    }, 6500);
}

function setAboutFocusSlide(index, restartAutoplay = false) {
    renderAboutFocusSlide(index, true);
    if (restartAutoplay) startAboutFocusAutoplay();
}

function nextAboutFocusSlide(restartAutoplay = false) {
    setAboutFocusSlide(aboutFocusSlideIndex + 1, restartAutoplay);
}

function initializeAboutFocusSlider() {
    const root = document.getElementById('about-focus-slider');
    if (!root) return;

    renderAboutFocusSlide(aboutFocusSlideIndex, false);
    if (root.dataset.focusSliderReady === 'true') {
        startAboutFocusAutoplay();
        return;
    }

    root.dataset.focusSliderReady = 'true';
    root.addEventListener('mouseenter', stopAboutFocusAutoplay);
    root.addEventListener('mouseleave', startAboutFocusAutoplay);
    root.addEventListener('focusin', stopAboutFocusAutoplay);
    root.addEventListener('focusout', event => {
        if (!root.contains(event.relatedTarget)) startAboutFocusAutoplay();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAboutFocusAutoplay();
        else startAboutFocusAutoplay();
    });
    startAboutFocusAutoplay();
}

const aboutContactInfo = {
    phonePrimary: '+49 174 206 2137',
    whatsapp: '+380 68 019 5206',
    emailPrimary: 'ivantykhokhod@gmail.com',
    emailSecondary: 'ivansredmi12@gmail.com',
    telegram: '@visualisierer',
    instagram: '@ivan.tykhokhod',
    links: {
        phone: 'tel:+491742062137',
        whatsapp: 'https://wa.me/380680195206',
        emailPrimary: 'mailto:ivantykhokhod@gmail.com',
        emailSecondary: 'mailto:ivansredmi12@gmail.com',
        telegram: 'https://t.me/visualisierer',
        instagram: 'https://www.instagram.com/ivan.tykhokhod'
    }
};

function getAboutFactModalType(label) {
    const normalized = normalizeFactLabel(label);
    if (normalized === 'standort') return 'standort';
    if (normalized === 'verfügbarkeit') return 'availability';
    return '';
}

function renderAboutFactModalShell(title, bodyHtml) {
    return `
        <div class="about-fact-modal">
            <div class="about-fact-modal-head">
                <h3 class="about-fact-modal-title">${escapeHtml(title)}</h3>
                <button type="button" onclick="closeModal(); playClickSound();" class="about-fact-modal-close" aria-label="${escapeHtml(title)} schließen">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="about-fact-modal-body">
                ${bodyHtml}
            </div>
        </div>
    `;
}

function renderLocationModal() {
    const locationText = 'Kehl 77694, Baden-Württemberg, Deutschland';
    const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=Kehl%2077694%20Baden-W%C3%BCrttemberg%20Deutschland';

    return renderAboutFactModalShell('Standort', `
        <p class="about-fact-modal-lead">${escapeHtml(locationText)}</p>
        <div class="about-location-map" aria-label="Stilisierte Karte von Kehl">
            <div class="about-location-rhein" aria-hidden="true"></div>
            <div class="about-location-marker" aria-hidden="true"></div>
            <div class="about-location-label is-kehl">Kehl</div>
            <div class="about-location-label is-rhein">Rhein</div>
            <div class="about-location-label is-france">Frankreich</div>
            <div class="about-location-label is-germany">Deutschland</div>
        </div>
        <a class="about-fact-modal-action" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">
            <i data-lucide="map"></i>
            In Google Maps öffnen
        </a>
    `);
}

function renderContactLink(label, value, href, external = false) {
    const targetAttrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `
        <a class="about-contact-link" href="${escapeHtml(href)}"${targetAttrs}>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
        </a>
    `;
}

function renderQrPlaceholder(service, icon, value) {
    return `
        <div class="about-qr-placeholder-card">
            <div class="about-qr-placeholder-box"><span>QR</span></div>
            <div class="about-qr-placeholder-service"><i data-lucide="${escapeHtml(icon)}" class="w-4 h-4"></i>${escapeHtml(service)}</div>
            <div class="about-qr-placeholder-value">${escapeHtml(value)}</div>
            <div class="about-qr-placeholder-hint">QR-Code später hinzufügen</div>
        </div>
    `;
}

function renderAvailabilityModal() {
    const contact = aboutContactInfo;

    return renderAboutFactModalShell('Kontakt & Verfügbarkeit', `
        <div class="about-contact-layout">
            <div class="about-contact-main">
                <div class="about-contact-grid">
                    <section class="about-contact-card">
                        <h4>Direktkontakt</h4>
                        <div class="about-contact-list">
                            ${renderContactLink('Telefon', contact.phonePrimary, contact.links.phone)}
                            ${renderContactLink('E-Mail', contact.emailPrimary, contact.links.emailPrimary)}
                            ${renderContactLink('Alternative E-Mail', contact.emailSecondary, contact.links.emailSecondary)}
                        </div>
                    </section>
                    <section class="about-contact-card">
                        <h4>Messenger / Social</h4>
                        <div class="about-contact-list">
                            ${renderContactLink('Telegram', contact.telegram, contact.links.telegram, true)}
                            ${renderContactLink('WhatsApp', contact.whatsapp, contact.links.whatsapp, true)}
                            ${renderContactLink('Instagram', contact.instagram, contact.links.instagram, true)}
                        </div>
                    </section>
                </div>
                <section class="about-contact-note">
                    <h4>Erreichbarkeit</h4>
                    <p>Per E-Mail kann ich oft schneller antworten.<br>Auf Telegram bin ich in der Regel am besten erreichbar.<br>Instagram prüfe ich nicht so häufig.</p>
                </section>
            </div>
            <aside class="about-contact-qr-side">
                <h4 class="about-contact-qr-title">QR / Schnellzugriff</h4>
                <div class="about-qr-placeholder-grid is-side">
                    ${renderQrPlaceholder('Telegram', 'send', contact.telegram)}
                    ${renderQrPlaceholder('Instagram', 'instagram', contact.instagram)}
                    ${renderQrPlaceholder('WhatsApp', 'message-circle', contact.whatsapp)}
                </div>
            </aside>
        </div>
    `);
}

function openAboutFactModal(type) {
    if (type === 'standort') {
        showModal(renderLocationModal());
        return;
    }

    if (type === 'availability') {
        showModal(renderAvailabilityModal());
        document.getElementById('modal-container')?.classList.add('about-contact-modal-wide');
    }
}

function renderAboutFacts(about) {
    return getAboutOrderedFacts(about).map(fact => {
        const modalType = getAboutFactModalType(fact.label);
        const isClickable = modalType !== '';
        const safeIcon = escapeHtml(fact.icon || 'info');
        const safeLabel = escapeHtml(fact.label || '');
        const safeValue = escapeHtml(fact.value || '');
        const clickableAttrs = isClickable
            ? ` type="button" onclick="openAboutFactModal('${modalType}'); playClickSound();" aria-label="${safeLabel} öffnen"`
            : '';
        const tagName = isClickable ? 'button' : 'div';
        const className = `about-cyber-fact${isClickable ? ' is-clickable' : ''}`;

        return `
            <${tagName}${clickableAttrs} class="${className}">
                <div class="about-cyber-fact-icon">
                    <i data-lucide="${safeIcon}" class="w-7 h-7"></i>
                </div>
                <div class="min-w-0">
                    <div class="about-cyber-fact-label">${safeLabel}</div>
                    <div class="about-cyber-fact-value">${safeValue}</div>
                </div>
            </${tagName}>
        `;
    }).join('');
}

const ABOUT_SKILL_LEVEL_LABELS = [
    'Anfänger',
    'Untere Mittelstufe',
    'Mittelstufe',
    'Obere Mittelstufe',
    'Fortgeschritten',
    'Expertenniveau'
];

const ABOUT_HOME_SKILL_IDS = [
    'skill-prompting',
    'skill-vibe-coding',
    'skill-lernen',
    'skill-planung',
    'skill-reflexion'
];

function normalizeSkillLevel(level) {
    const numeric = Number(level);
    if (!Number.isFinite(numeric)) return 1;

    if (numeric >= 1 && numeric <= 6) {
        return Math.max(1, Math.min(6, Math.round(numeric)));
    }

    if (numeric > 6 && numeric <= 100) {
        if (numeric <= 16) return 1;
        if (numeric <= 33) return 2;
        if (numeric <= 50) return 3;
        if (numeric <= 66) return 4;
        if (numeric <= 83) return 5;
        return 6;
    }

    return 1;
}

function getSkillLevelLabel(skill) {
    if (isFilledText(skill?.levelLabel)) return skill.levelLabel;
    return ABOUT_SKILL_LEVEL_LABELS[normalizeSkillLevel(skill?.level) - 1] || ABOUT_SKILL_LEVEL_LABELS[0];
}

function renderAboutProgressSegments(level) {
    const total = 6;
    const active = normalizeSkillLevel(level);

    return Array.from({ length: total }, (_, index) => `
        <span class="${index < active ? 'is-active' : ''}"></span>
    `).join('');
}

function getCuratedHomeSkills(about) {
    const defaults = getDefaultAboutData().skills;
    const source = Array.isArray(about?.skills) ? about.skills : defaults;
    const sourceById = new Map();
    const fallbackById = new Map(defaults.map(item => [String(item.id), item]));

    source.forEach(item => {
        if (item && typeof item === 'object' && item.id) {
            sourceById.set(String(item.id), item);
        }
    });

    return ABOUT_HOME_SKILL_IDS
        .map(id => sourceById.get(id) || fallbackById.get(id))
        .filter(Boolean);
}

function renderAboutSkills(about) {
    const skills = getCuratedHomeSkills(about);

    return skills.map(skill => `
        <button type="button" class="about-cyber-skill" data-skill-id="${escapeHtml(skill.id || '')}" onclick="openAboutSkillFocus(this.dataset.skillId); playClickSound();">
            <div class="about-cyber-skill-icon-box">
                <i data-lucide="${escapeHtml(skill.icon || 'code')}"></i>
            </div>
            <h4 class="about-cyber-skill-title">${escapeHtml(skill.title || '')}</h4>
            <div class="about-cyber-progress" aria-hidden="true">
                ${renderAboutProgressSegments(skill.level)}
            </div>
            <div class="about-cyber-level">${escapeHtml(getSkillLevelLabel(skill))}</div>
        </button>
    `).join('');
}

const ABOUT_HOME_PRINCIPLE_IDS = [
    'principle-zuverlaessig',
    'principle-verantwortungsbereit',
    'principle-selbststaendig',
    'principle-teamfaehig',
    'principle-kommunikativ',
    'principle-organisiert',
    'principle-systematisch',
    'principle-zielstrebig',
    'principle-kritikfaehig'
];

function getCuratedHomePrinciples(about) {
    const defaults = getDefaultAboutData().principles;
    const source = Array.isArray(about?.principles) ? about.principles : defaults;
    const sourceById = new Map();
    const fallbackById = new Map(defaults.map(item => [String(item.id), item]));

    source.forEach(item => {
        if (item && typeof item === 'object' && item.id) {
            sourceById.set(String(item.id), item);
        }
    });

    return ABOUT_HOME_PRINCIPLE_IDS
        .map(id => sourceById.get(id) || fallbackById.get(id))
        .filter(Boolean);
}

function renderAboutPrinciples(about) {
    const principles = getCuratedHomePrinciples(about);

    return principles.map(principle => `
        <button type="button" class="about-cyber-principle" data-principle-id="${escapeHtml(principle.id || '')}" onclick="openAboutPrincipleFocus(this.dataset.principleId); playClickSound();">
            <i data-lucide="${escapeHtml(principle.icon || 'sparkles')}"></i>
            <h4 class="about-cyber-principle-title">${escapeHtml(principle.title || '')}</h4>
        </button>
    `).join('');
}

function getSafeAboutCollectionItems(type) {
    state.data.about = migrateAboutData(state.data.about);
    const about = state.data.about || {};
    const defaults = getDefaultAboutData();
    const source = type === 'principles' ? about.principles : about.skills;
    const fallback = type === 'principles' ? defaults.principles : defaults.skills;
    const safeItems = Array.isArray(source) ? source.filter(item => item && typeof item === 'object') : [];
    return (safeItems.length ? safeItems : fallback).map(item => cloneData(item));
}

function renderAboutCollectionCards(type) {
    const isPrinciples = type === 'principles';
    const safeType = isPrinciples ? 'principles' : 'skills';
    const items = getSafeAboutCollectionItems(safeType);

    if (!items.length) {
        return `<div class="about-collection-empty">Keine Einträge vorhanden.</div>`;
    }

    return items.map(item => {
        const safeIcon = escapeHtml(item.icon || (isPrinciples ? 'sparkles' : 'code'));
        const safeId = escapeHtml(item.id || '');
        const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];
        const progressHtml = !isPrinciples ? `
            <div class="about-cyber-progress" aria-hidden="true">
                ${renderAboutProgressSegments(item.level)}
            </div>
        ` : '';
        const levelHtml = !isPrinciples ? `<div class="about-cyber-level">${escapeHtml(getSkillLevelLabel(item))}</div>` : '';
        const tagsHtml = !isPrinciples && tags.length ? `
            <div class="about-collection-tags">
                ${tags.map(tag => `<span class="about-collection-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        ` : '';

        const descHtml = !isPrinciples ? `<p class="about-collection-card-desc">${escapeHtml(item.desc || '')}</p>` : '';
        const cardClass = isPrinciples ? 'about-collection-card is-principle-card' : 'about-collection-card';

        return `
            <button type="button" class="${cardClass}" data-about-item-type="${safeType}" data-about-item-id="${safeId}" onclick="openAboutItemFocus(this.dataset.aboutItemType, this.dataset.aboutItemId); playClickSound();">
                <div class="about-collection-card-icon">
                    <i data-lucide="${safeIcon}"></i>
                </div>
                <h3 class="about-collection-card-title">${escapeHtml(item.title || '')}</h3>
                ${descHtml}
                ${progressHtml}
                ${levelHtml}
                ${tagsHtml}
            </button>
        `;
    }).join('');
}


function getAboutPrincipleFocusOverlay() {
    let overlay = document.getElementById('about-principle-focus-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'about-principle-focus-overlay';
        overlay.className = 'about-principle-focus-overlay hidden';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Detailansicht');
        document.body.appendChild(overlay);
    }
    return overlay;
}

function renderSkillEvidence(evidence) {
    const safeEvidence = Array.isArray(evidence) ? evidence.filter(entry => entry && typeof entry === 'object') : [];
    if (!safeEvidence.length) return '';

    const cards = safeEvidence.map(entry => {
        const type = String(entry.type || '').toLowerCase();
        const safeTitle = escapeHtml(entry.title || 'Nachweis');
        const safeNote = escapeHtml(entry.note || '');
        const safeUrl = getSafeAboutUrl(entry.url || '');
        const imageHtml = type === 'image' && safeUrl ? `<img src="${safeUrl}" alt="${safeTitle}" class="about-skill-evidence-img">` : '';
        const titleHtml = type === 'link' && safeUrl
            ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeTitle}</a>`
            : safeTitle;

        return `
            <div class="about-skill-evidence-item">
                ${imageHtml}
                <div class="about-skill-evidence-title">${titleHtml}</div>
                ${safeNote ? `<div class="about-skill-evidence-note">${safeNote}</div>` : ''}
            </div>
        `;
    }).join('');

    return `
        <div class="about-skill-focus-section">
            <div class="about-skill-focus-label">Nachweise / Beispiele</div>
            <div class="about-skill-evidence-grid">${cards}</div>
        </div>
    `;
}

function renderAboutItemFocus(type, item) {
    const isPrinciples = type === 'principles';
    const safeIcon = escapeHtml(item?.icon || (isPrinciples ? 'sparkles' : 'code'));
    const safeTitle = escapeHtml(item?.title || (isPrinciples ? 'Wert' : 'Fähigkeit'));
    const safeDesc = escapeHtml(item?.desc || 'Keine Beschreibung vorhanden.');
    const backLabel = isPrinciples ? 'Alle Werte & Prinzipien' : 'Alle Fähigkeiten';
    const backIcon = isPrinciples ? 'grid-3x3' : 'layout-grid';
    const progressHtml = !isPrinciples ? `
        <div class="about-cyber-progress" aria-hidden="true">
            ${renderAboutProgressSegments(item?.level)}
        </div>
    ` : '';
    const levelHtml = !isPrinciples ? `<div class="about-cyber-level">${escapeHtml(getSkillLevelLabel(item))}</div>` : '';
    const tags = !isPrinciples && Array.isArray(item?.tags) ? item.tags.filter(Boolean) : [];
    const tagsHtml = tags.length ? `
        <div class="about-collection-tags">
            ${tags.map(tag => `<span class="about-collection-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
    ` : '';
    const skillFullText = escapeHtml(item?.fullText || item?.desc || 'Keine Beschreibung vorhanden.');
    const skillApplication = isFilledText(item?.application) ? `
        <div class="about-skill-focus-section">
            <div class="about-skill-focus-label">Anwendung</div>
            <div class="about-skill-focus-text">${escapeHtml(item.application)}</div>
        </div>
    ` : '';
    const skillDevelopment = isFilledText(item?.development) ? `
        <div class="about-skill-focus-section">
            <div class="about-skill-focus-label">Entwicklung</div>
            <div class="about-skill-focus-text">${escapeHtml(item.development)}</div>
        </div>
    ` : '';
    const skillDetailsHtml = !isPrinciples ? `
        <div class="about-skill-focus-section">
            <div class="about-skill-focus-label">Beschreibung</div>
            <div class="about-skill-focus-text">${skillFullText}</div>
        </div>
        ${skillApplication}
        ${skillDevelopment}
        ${renderSkillEvidence(item?.evidence)}
    ` : '';

    return `
        <div class="about-principle-focus-card ${isPrinciples ? 'is-principle-focus' : 'is-skill-focus'}" onclick="event.stopPropagation();">
            <div class="about-principle-focus-head">
                <button type="button" class="about-principle-focus-all" onclick="closeAboutItemFocus(true); openAboutCollectionModal('${isPrinciples ? 'principles' : 'skills'}'); playClickSound();">
                    <i data-lucide="${backIcon}" class="w-4 h-4"></i>
                    ${backLabel}
                </button>
                <button type="button" class="about-principle-focus-close" onclick="closeAboutItemFocus(); playClickSound();" aria-label="Karte schließen">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="about-principle-focus-icon">
                <i data-lucide="${safeIcon}"></i>
            </div>
            <h3 class="about-principle-focus-title">${safeTitle}</h3>
            ${isPrinciples ? `<p class="about-principle-focus-desc">${safeDesc}</p>` : ''}
            ${progressHtml}
            ${levelHtml}
            ${tagsHtml}
            ${skillDetailsHtml}
        </div>
    `;
}

let aboutFocusPreviousOverflow = '';

function openAboutItemFocus(type, itemId) {
    const safeType = type === 'skills' ? 'skills' : 'principles';
    state.data.about = migrateAboutData(state.data.about);
    const items = getSafeAboutCollectionItems(safeType);
    const fallback = safeType === 'skills' ? getDefaultAboutData().skills : getDefaultAboutData().principles;
    const item = items.find(entry => String(entry.id) === String(itemId))
        || fallback.find(entry => String(entry.id) === String(itemId));

    if (!item) return;

    const overlay = getAboutPrincipleFocusOverlay();
    overlay.innerHTML = renderAboutItemFocus(safeType, item);
    overlay.onclick = () => closeAboutItemFocus();
    aboutFocusPreviousOverflow = document.body.style.overflow;
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    refreshIcons();
    setTimeout(() => overlay.querySelector('button')?.focus({ preventScroll: true }), 20);
}

function openAboutPrincipleFocus(principleId) {
    openAboutItemFocus('principles', principleId);
}

function openAboutSkillFocus(skillId) {
    openAboutItemFocus('skills', skillId);
}

function closeAboutItemFocus(preserveBodyLock = false) {
    const overlay = document.getElementById('about-principle-focus-overlay');
    if (!overlay || overlay.classList.contains('hidden')) return;

    overlay.classList.remove('is-open');
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.innerHTML = '';

        const globalOverlay = document.getElementById('global-modal');
        const globalModalOpen = globalOverlay && !globalOverlay.classList.contains('hidden');
        if (!preserveBodyLock && !globalModalOpen) {
            document.body.style.overflow = aboutFocusPreviousOverflow;
        }
    }, 210);
}

function closeAboutPrincipleFocus(preserveBodyLock = false) {
    closeAboutItemFocus(preserveBodyLock);
}

function openAboutCollectionModal(type) {
    const isPrinciples = type === 'principles';
    const title = isPrinciples ? 'Werte & Prinzipien' : 'Alle Fähigkeiten';
    const overlay = document.getElementById('global-modal');
    const container = document.getElementById('modal-container');
    resetSpecialModalClasses();

    container.className = 'about-more-modal about-collection-modal';
    container.innerHTML = `
        <div class="about-more-modal-inner" onclick="event.stopPropagation();">
            <div class="about-more-modal-head">
                <h2 class="about-more-modal-title">${escapeHtml(title)}</h2>
                <button type="button" onclick="closeModal(); playClickSound();" class="about-more-modal-close" aria-label="${escapeHtml(title)} schließen">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="about-collection-grid">
                ${renderAboutCollectionCards(isPrinciples ? 'principles' : 'skills')}
            </div>
        </div>
    `;

    overlay.classList.add('about-more-modal-open');
    activateGlobalModal();
    refreshIcons();
}
