/* Default content, schema helpers and migrations. */

// --- ДАННЫЕ И СОСТОЯНИЕ СИСТЕМЫ (CMS Logic - Переведено на Немецкий) --- //
let isAdmin = false;
let currentSlide = 0;
let slideIntervalId = null;
let sliderFadeTimeoutId = null;

function cloneData(data) {
    if (typeof structuredClone === 'function') return structuredClone(data);
    return JSON.parse(JSON.stringify(data));
}

function createPlaceholderDataUrl(label, width = 600, height = 400) {
    const safeLabel = String(label || 'Vorschau').replace(/[<>&"']/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#18181b"/><path d="M0 ${height - 1}H${width}" stroke="#FFD700" stroke-opacity=".35"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#FFD700" font-family="Arial,sans-serif" font-size="${Math.max(18, Math.round(width / 18))}" font-weight="700">${safeLabel}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getSafeImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml)(;charset=[^;,]+)?(;base64)?,/i.test(raw)) return raw;
    try {
        const parsed = new URL(raw, window.location.href);
        return ['http:', 'https:', 'file:', 'blob:'].includes(parsed.protocol) ? raw : '';
    } catch (error) {
        return '';
    }
}

function getSafeLinkUrl(value) {
    const raw = String(value || '').trim();
    if (!raw || raw === '#') return '#';
    try {
        const parsed = new URL(raw, window.location.href);
        return ['http:', 'https:', 'file:', 'blob:', 'mailto:', 'tel:'].includes(parsed.protocol) ? raw : '#';
    } catch (error) {
        return '#';
    }
}

function normalizeIconName(value, fallback = 'circle') {
    const icon = String(value || '').trim().toLowerCase();
    return /^[a-z0-9-]{1,48}$/.test(icon) ? icon : fallback;
}

function encodeInlineId(value) {
    return encodeURIComponent(String(value ?? '')).replace(/'/g, '%27');
}

function getDefaultAboutData() {
    return {
        introShort: "Ich bin eine zielstrebige Person mit einer Leidenschaft für Technologie, effiziente Lernmethoden, Planungssysteme und Neurologie.",
        introFull: "Mein Fokus liegt auf dem Aufbau moderner, leistungsfähiger und benutzerfreundlicher Webanwendungen sowie auf kontinuierlicher Weiterentwicklung. Ich liebe es, komplexe Probleme zu lösen, sauberen Code zu schreiben und Ideen in funktionierende digitale Produkte zu verwandeln.",
        facts: [
            { id: 'fact-standort', icon: 'map-pin', label: 'Standort', value: 'Kehl 77694, Baden-Württemberg, Deutschland', pinned: true },
            { id: 'fact-sprachen', icon: 'languages', label: 'Sprachen', value: 'Ukrainisch, Russisch, Deutsch B2, Englisch B1', pinned: true },
            { id: 'fact-technologien', icon: 'code', label: 'Technologien', value: 'Wird aktuell ergänzt.', pinned: true },
            { id: 'fact-verfuegbarkeit', icon: 'calendar', label: 'Verfügbarkeit', value: 'Aktuell offen für neue Projekte', pinned: true }
        ],
        skills: [
            {
                id: 'skill-prompting',
                title: 'Prompting',
                desc: 'Ich formuliere klare Aufgaben für KI-Systeme und verbessere Ergebnisse durch präzise Anweisungen.',
                fullText: 'Ich kann KI-Systemen klare und präzise Aufgaben geben, damit die Ergebnisse besser, strukturierter und nützlicher werden. Dabei achte ich auf Kontext, Ziel, Einschränkungen und gewünschtes Ausgabeformat. Ich verbessere Prompts Schritt für Schritt, bis das Ergebnis zur Aufgabe passt. Besonders wichtig ist mir, KI nicht blind zu nutzen, sondern Ergebnisse kritisch zu prüfen und sinnvoll weiterzuverarbeiten.',
                application: 'Technische Aufgaben, Code-Analyse, Strukturierung von Projekten und Verbesserung von Texten.',
                development: 'Ich verbessere meine Prompts durch Tests, Vergleiche und klare Bewertung der Ergebnisse.',
                icon: 'message-square-code',
                tags: ['KI', 'Analyse', 'Struktur'],
                levelLabel: 'Fortgeschritten',
                level: 5,
                evidence: [],
                pinned: true
            },
            {
                id: 'skill-vibe-coding',
                title: 'Vibe-Coding',
                desc: 'Ich entwickle Ideen schnell mit KI-Unterstützung und verbessere Code schrittweise durch Tests und Feedback.',
                fullText: 'Ich nutze KI, um Ideen schneller in funktionierende Prototypen zu verwandeln. Dabei arbeite ich iterativ: Aufgabe verstehen, Code prüfen, Fehler finden, verbessern und testen. Mir ist wichtig, nicht nur Code generieren zu lassen, sondern die Logik dahinter zu verstehen. So kann ich schneller lernen, experimentieren und praktische Lösungen entwickeln.',
                application: 'Prototypen, kleine Webfunktionen, UI-Ideen und technische Experimente.',
                development: 'Ich prüfe generierten Code bewusst, teste Änderungen und verbessere meine technische Selbstständigkeit.',
                icon: 'bot',
                tags: ['KI', 'Code', 'Prototyping'],
                levelLabel: 'Obere Mittelstufe',
                level: 4,
                evidence: [],
                pinned: true
            },
            {
                id: 'skill-lernen',
                title: 'Lernen',
                desc: 'Ich lerne strukturiert, analysiere meine Fortschritte und verwandle neue Themen schnell in praktische Fähigkeiten.',
                fullText: 'Ich beschäftige mich intensiv damit, wie man effektiv lernt und Wissen langfristig behält. Ich arbeite mit klaren Lernzielen, Wiederholung, Reflexion und praktischer Anwendung. Neue Themen zerlege ich in kleine Einheiten und prüfe regelmäßig, ob ich sie wirklich verstanden habe. Dadurch kann ich mich schnell in neue Bereiche einarbeiten und Fortschritt bewusst steuern.',
                application: 'Sprachen, Programmierung, Kommunikation, persönliche Entwicklung und Projektarbeit.',
                development: 'Ich arbeite mit Lernsystemen, Wiederholung, Analyse und praktischen Tests.',
                icon: 'brain',
                tags: ['Struktur', 'Analyse', 'Praxis'],
                levelLabel: 'Expertenniveau',
                level: 6,
                evidence: [],
                pinned: true
            },
            {
                id: 'skill-planung',
                title: 'Planung',
                desc: 'Ich zerlege große Ziele in klare Schritte und arbeite mit Prioritäten, Routinen und überprüfbaren Ergebnissen.',
                fullText: 'Ich plane Aufgaben nicht nur grob, sondern zerlege sie in klare Schritte, Prioritäten und überprüfbare Zwischenziele. Dabei achte ich darauf, realistisch zu bleiben und nicht zu viele Dinge gleichzeitig zu beginnen. Gute Planung hilft mir, Energie besser einzusetzen und langfristig konsequent zu bleiben. Besonders bei Projekten ist Planung für mich ein Werkzeug, um Ideen wirklich umzusetzen.',
                application: 'Tagesplanung, Lernplanung, Projektstruktur, persönliche Ziele und Bewerbungsprozesse.',
                development: 'Ich verbessere meine Planung durch Rückblick, Anpassung und klare Prioritäten.',
                icon: 'calendar-check',
                tags: ['Prioritäten', 'Routinen', 'Ziele'],
                levelLabel: 'Expertenniveau',
                level: 6,
                evidence: [],
                pinned: true
            },
            {
                id: 'skill-reflexion',
                title: 'Reflexion',
                desc: 'Ich analysiere mein Verhalten, erkenne Fehler und nutze Erkenntnisse, um mich gezielt weiterzuentwickeln.',
                fullText: 'Ich analysiere regelmäßig mein Verhalten, meine Entscheidungen und meine Ergebnisse. Dabei suche ich nicht nur nach Fehlern, sondern auch nach Mustern, die mich weiterbringen oder bremsen. Reflexion hilft mir, bewusster zu handeln und aus Erfahrungen schneller zu lernen. Dadurch kann ich mich persönlich und fachlich gezielter verbessern.',
                application: 'Lernen, Kommunikation, Projektarbeit, Selbstorganisation und persönliche Entwicklung.',
                development: 'Ich nutze Reflexion, um Fehler schneller zu erkennen und bessere Entscheidungen zu treffen.',
                icon: 'scan-eye',
                tags: ['Analyse', 'Entwicklung', 'Bewusstsein'],
                levelLabel: 'Fortgeschritten',
                level: 5,
                evidence: [],
                pinned: true
            },
            { id: 'skill-frontend', title: 'Frontend', desc: 'Moderne Interfaces mit React, Tailwind & TypeScript.', fullText: 'Ich kann moderne Weboberflächen strukturieren und mit HTML, CSS, JavaScript und UI-Frameworks weiterentwickeln.', application: 'Webseiten, UI-Komponenten und interaktive Benutzeroberflächen.', development: 'Ich vertiefe mein Verständnis für saubere Komponenten, Responsive Design und Wartbarkeit.', icon: 'code', tags: ['HTML', 'CSS', 'JS', 'React'], levelLabel: 'Fortgeschritten', level: 5, evidence: [], pinned: false },
            { id: 'skill-ui-ux-design', title: 'UI/UX & Design', desc: 'Fokussiert auf klare, intuitive und ästhetische Benutzererlebnisse.', fullText: 'Ich achte darauf, dass digitale Oberflächen klar, verständlich und visuell geordnet sind.', application: 'Layouts, Nutzerführung, visuelle Struktur und Design-Verbesserungen.', development: 'Ich verbessere mein Gefühl für Abstände, Hierarchie, Lesbarkeit und Interaktion.', icon: 'box', tags: ['UI', 'UX', 'Design'], levelLabel: 'Fortgeschritten', level: 5, evidence: [], pinned: false },
            { id: 'skill-backend', title: 'Backend', desc: 'Erfahrung mit REST APIs, Datenbanken und Serverlogik.', fullText: 'Ich verstehe grundlegende Backend-Konzepte wie Daten, APIs und serverseitige Logik.', application: 'REST APIs, Datenstrukturen und einfache Serverfunktionen.', development: 'Ich baue mein technisches Verständnis für robuste Backend-Strukturen weiter aus.', icon: 'server', tags: ['REST', 'API', 'Node.js'], levelLabel: 'Mittelstufe', level: 3, evidence: [], pinned: false },
            { id: 'skill-problem-solving', title: 'Problem Solving', desc: 'Analytisch denken, effizient lösen und kontinuierlich verbessern.', fullText: 'Ich zerlege Probleme in kleinere Teile, suche Ursachen und entwickle strukturierte Lösungen.', application: 'Debugging, Projektarbeit, Entscheidungsfindung und technische Analyse.', development: 'Ich verbessere mein Problemlösen durch Tests, Rückblick und bewusstes Lernen aus Fehlern.', icon: 'brain', tags: ['Logik', 'Struktur'], levelLabel: 'Fortgeschritten', level: 5, evidence: [], pinned: false }
        ],
        principles: [
            { id: 'principle-offen', title: 'Offen', desc: 'Für Feedback, Ideen und neue Perspektiven.', icon: 'message-circle', pinned: true },
            { id: 'principle-aufgeschlossen', title: 'Aufgeschlossen', desc: 'Offen für neue Gedanken, andere Sichtweisen und konstruktiven Austausch.', icon: 'lightbulb', pinned: true },
            { id: 'principle-zuverlaessig', title: 'Zuverlässig', desc: 'Absprachen ernst nehmen und Aufgaben verantwortungsvoll umsetzen.', icon: 'shield-check', pinned: true },
            { id: 'principle-organisiert', title: 'Organisiert', desc: 'Ordnung schaffen, Prioritäten setzen und strukturiert arbeiten.', icon: 'folder', pinned: true },
            { id: 'principle-teamfaehig', title: 'Teamfähig', desc: 'Gut mit anderen zusammenarbeiten und gemeinsame Ziele unterstützen.', icon: 'users', pinned: true },
            { id: 'principle-zielstrebig', title: 'Zielstrebig', desc: 'Klare Ziele verfolgen und konsequent an Fortschritt arbeiten.', icon: 'target', pinned: true },
            { id: 'principle-freundlich', title: 'Freundlich', desc: 'Respektvoll, positiv und angenehm im Umgang mit anderen Menschen.', icon: 'smile', pinned: false },
            { id: 'principle-flexibel', title: 'Flexibel', desc: 'Sich schnell auf neue Aufgaben und neue Situationen einstellen.', icon: 'shuffle', pinned: false },
            { id: 'principle-systematisch', title: 'Systematisch', desc: 'Schritt für Schritt denken und mit klarer Struktur vorgehen.', icon: 'list-checks', pinned: false },
            { id: 'principle-selbststaendig', title: 'Selbstständig', desc: 'Eigenverantwortlich arbeiten und Aufgaben sicher selbst erledigen.', icon: 'user-check', pinned: false },
            { id: 'principle-kommunikativ', title: 'Kommunikativ', desc: 'Klar, respektvoll und lösungsorientiert mit anderen kommunizieren.', icon: 'messages-square', pinned: false },
            { id: 'principle-positiv', title: 'Positiv', desc: 'Mit einer positiven Grundhaltung an Menschen und Aufgaben herangehen.', icon: 'plus-circle', pinned: false },
            { id: 'principle-optimistisch', title: 'Optimistisch', desc: 'Auch in schwierigen Situationen Chancen und Lösungen sehen.', icon: 'sunrise', pinned: false },
            { id: 'principle-ehrlich', title: 'Ehrlich', desc: 'Offen, aufrichtig und transparent im Denken und Handeln.', icon: 'badge-check', pinned: false },
            { id: 'principle-hilfsbereit', title: 'Hilfsbereit', desc: 'Andere unterstützen und helfen, wenn Hilfe gebraucht wird.', icon: 'hand-heart', pinned: false },
            { id: 'principle-kreativ', title: 'Kreativ', desc: 'Neue Ideen entwickeln und Probleme auf frische Weise lösen.', icon: 'sparkles', pinned: false },
            { id: 'principle-dankbar', title: 'Dankbar', desc: 'Wertschätzung zeigen und Gutes bewusst wahrnehmen.', icon: 'heart', pinned: false },
            { id: 'principle-friedlich', title: 'Friedlich', desc: 'Ruhig, respektvoll und ohne unnötige Konflikte handeln.', icon: 'circle', pinned: false },
            { id: 'principle-tolerant', title: 'Tolerant', desc: 'Andere Meinungen und Unterschiede respektvoll akzeptieren.', icon: 'scale', pinned: false },
            { id: 'principle-kritikfaehig', title: 'Kritikfähig', desc: 'Feedback annehmen, reflektieren und für Entwicklung nutzen.', icon: 'refresh-cw', pinned: false },
            { id: 'principle-fuehrungsbereit', title: 'Führungsbereit', desc: 'Bei Bedarf Verantwortung übernehmen und andere sicher anleiten.', icon: 'flag', pinned: false },
            { id: 'principle-krisenfest', title: 'Krisenfest', desc: 'Auch unter Druck ruhig bleiben und handlungsfähig bleiben.', icon: 'anchor', pinned: false },
            { id: 'principle-herausforderungsbereit', title: 'Herausforderungsbereit', desc: 'Bereit sein, neue Herausforderungen anzunehmen und daran zu wachsen.', icon: 'mountain', pinned: false },
            { id: 'principle-verantwortungsbereit', title: 'Verantwortungsbereit', desc: 'Bereit sein, Verantwortung zu übernehmen und zuverlässig zu handeln.', icon: 'clipboard-check', pinned: false },
            { id: 'principle-froehlich', title: 'Fröhlich', desc: 'Mit einer offenen, freundlichen und positiven Ausstrahlung auftreten.', icon: 'smile-plus', pinned: false },
            { id: 'principle-tatkraeftig', title: 'Tatkräftig', desc: 'Nicht nur planen, sondern aktiv handeln und Dinge umsetzen.', icon: 'zap', pinned: false },
            { id: 'principle-mitmenschlich', title: 'Mitmenschlich', desc: 'Auf andere achten und menschlich, fair und respektvoll handeln.', icon: 'handshake', pinned: false },
            { id: 'principle-integer', title: 'Integer', desc: 'Nach klaren Werten handeln und auch in schwierigen Situationen korrekt bleiben.', icon: 'gem', pinned: false }
        ],
        moreSections: [
            {
                id: 'about-more-important',
                navLabel: 'Das Wichtigste',
                icon: 'star',
                title: 'Das Wichtigste',
                useIntro: true,
                body: ''
            },
            {
                id: 'about-more-motivation',
                navLabel: 'Motivation',
                icon: 'target',
                title: 'Meine Motivation',
                body: 'Mich motiviert es, komplexe Probleme zu lösen und aus Ideen funktionierende digitale Produkte zu erschaffen. Ich liebe es, Neues zu lernen, mich weiterzuentwickeln und mit Technologie einen echten Mehrwert zu schaffen.'
            },
            {
                id: 'about-more-values',
                navLabel: 'Werte',
                icon: 'shield-check',
                title: 'Was mir wichtig ist',
                body: 'Für mich sind Ehrlichkeit, Verantwortung und Qualität die Grundlage jeder guten Arbeit. Ich arbeite strukturiert, denke analytisch und lege Wert auf sauberen, wartbaren Code sowie auf klare Kommunikation.'
            },
            {
                id: 'about-more-hobbies',
                navLabel: 'Hobbys',
                icon: 'heart',
                title: 'Hobbys & Interessen',
                body: 'Neben der Technik interessiere ich mich für 3D-Grafik, Musik, Sport und Sprachen. Diese Bereiche helfen mir, kreativ zu bleiben, neue Perspektiven zu gewinnen und mich ständig weiterzuentwickeln.'
            },
            {
                id: 'about-more-path',
                navLabel: 'Mein Weg',
                icon: 'briefcase',
                title: 'Mein Weg / Lebenslauf',
                body: 'Ich habe meine schulische Laufbahn in der Ukraine begonnen und später in Deutschland fortgesetzt. Diese Erfahrung hat mich geprägt, flexibel zu sein, mich anzupassen und meinen eigenen Weg Schritt für Schritt aufzubauen.'
            }
        ]
    };
}

function normalizeFactLabel(label) {
    return String(label || '').trim().toLowerCase();
}

function findFactItem(facts, label) {
    if (!Array.isArray(facts)) return null;
    const normalizedLabel = normalizeFactLabel(label);
    return facts.find(fact => normalizeFactLabel(fact?.label) === normalizedLabel) || null;
}

function findFactValue(label, about = state.data.about) {
    const fact = findFactItem(about?.facts, label);
    return fact?.value || '';
}

function setFactValue(label, value, about = state.data.about) {
    if (!about || typeof about !== 'object') return;
    if (!Array.isArray(about.facts)) about.facts = [];

    const defaultFact = findFactItem(getDefaultAboutData().facts, label);
    let fact = findFactItem(about.facts, label);

    if (!fact) {
        fact = defaultFact
            ? cloneData(defaultFact)
            : { id: `fact-${Date.now()}`, icon: 'info', label, value: '', pinned: false };
        about.facts.push(fact);
    }

    fact.value = value || '';
}

function isLegacyDefaultFactValue(label, value) {
    const labelKey = normalizeFactLabel(label);
    const valueKey = String(value || '').trim();
    const legacyValues = {
        standort: ['Kehl, Baden-Württemberg, Deutschland', 'Kehl, Baden-Würtemberg, Deutschland'],
        sprachen: ['Ukr, Rus, Eng, Deu (B2)', 'Ukr, Rus, Eng, Deu'],
        technologien: ['HTML, CSS, JS, React']
    };

    return Array.isArray(legacyValues[labelKey]) && legacyValues[labelKey].includes(valueKey);
}

function mergeFacts(existingFacts, defaultFacts) {
    const result = [];
    const usedLabels = new Set();
    const defaultByLabel = new Map(
        defaultFacts.map(fact => [normalizeFactLabel(fact.label), fact])
    );

    if (Array.isArray(existingFacts)) {
        existingFacts.forEach(fact => {
            if (!fact || typeof fact !== 'object') return;

            const labelKey = normalizeFactLabel(fact.label);
            if (!labelKey) {
                result.push(cloneData(fact));
                return;
            }
            if (usedLabels.has(labelKey)) return;

            const fallback = defaultByLabel.get(labelKey) || {};
            const mergedFact = { ...cloneData(fallback), ...cloneData(fact) };
            const shouldUseDefaultValue = fallback.value && (!isFilledText(fact.value) || isLegacyDefaultFactValue(fallback.label || fact.label, fact.value));

            if (shouldUseDefaultValue) {
                mergedFact.value = fallback.value;
            }

            result.push(mergedFact);
            usedLabels.add(labelKey);
        });
    }

    defaultFacts.forEach(defaultFact => {
        const labelKey = normalizeFactLabel(defaultFact.label);
        if (!usedLabels.has(labelKey)) {
            result.push(cloneData(defaultFact));
            usedLabels.add(labelKey);
        }
    });

    return result;
}


function mergeAboutItemsById(existingItems, defaultItems) {
    const safeDefaults = Array.isArray(defaultItems) ? defaultItems : [];
    if (!Array.isArray(existingItems) || existingItems.length === 0) {
        return cloneData(safeDefaults);
    }

    const existingById = new Map();
    existingItems.forEach(item => {
        if (!item || typeof item !== 'object' || !item.id) return;
        if (!existingById.has(item.id)) existingById.set(item.id, item);
    });

    const result = [];
    const usedIds = new Set();

    safeDefaults.forEach(defaultItem => {
        if (!defaultItem || typeof defaultItem !== 'object' || !defaultItem.id) return;

        const existing = existingById.get(defaultItem.id);
        if (existing) {
            result.push({
                ...cloneData(defaultItem),
                ...cloneData(existing),
                title: isFilledText(existing.title) ? existing.title : defaultItem.title,
                desc: isFilledText(existing.desc) ? existing.desc : defaultItem.desc
            });
        } else {
            result.push(cloneData(defaultItem));
        }

        usedIds.add(defaultItem.id);
    });

    existingItems.forEach(item => {
        if (!item || typeof item !== 'object' || !item.id) return;
        if (usedIds.has(item.id)) return;
        result.push(cloneData(item));
        usedIds.add(item.id);
    });

    return result.length > 0 ? result : cloneData(safeDefaults);
}

function mergeAboutMoreSections(existingSections, defaultSections) {
    const result = [];
    const usedIds = new Set();
    const defaultsById = new Map(
        defaultSections.map(section => [section.id, section])
    );

    if (Array.isArray(existingSections)) {
        existingSections.forEach(section => {
            if (!section || typeof section !== 'object' || !section.id) return;
            if (usedIds.has(section.id)) return;

            const fallback = defaultsById.get(section.id) || {};
            result.push({ ...cloneData(fallback), ...cloneData(section) });
            usedIds.add(section.id);
        });
    }

    defaultSections.forEach(defaultSection => {
        if (!usedIds.has(defaultSection.id)) {
            result.push(cloneData(defaultSection));
            usedIds.add(defaultSection.id);
        }
    });

    return result.length > 0 ? result : cloneData(defaultSections);
}

function isFilledText(value) {
    return typeof value === 'string' && value.trim() !== '';
}

function firstFilledText(...values) {
    const found = values.find(isFilledText);
    return found || '';
}

function migrateAboutData(about) {
    const defaultAbout = getDefaultAboutData();
    const source = about && typeof about === 'object' ? about : {};
    const hadFactsArray = Array.isArray(source.facts);
    const migrated = { ...source };
    const legacyIntroShort = 'Ich bin eine zielstrebige Person mit einer Leidenschaft für Programmierung, Technologie und visuelle Gestaltung.';
    const previousIntroShort = 'Ich bin eine zielstrebige Person mit einer Leidenschaft für Technologie, Lernen, Neurologie und Psychologie.';
    const sourceIntroShort = firstFilledText(source.introShort, source.p1);

    migrated.introShort = !sourceIntroShort || sourceIntroShort === legacyIntroShort || sourceIntroShort === previousIntroShort
        ? defaultAbout.introShort
        : sourceIntroShort;
    migrated.introFull = firstFilledText(source.introFull, source.p2, defaultAbout.introFull);
    migrated.facts = mergeFacts(hadFactsArray ? source.facts : defaultAbout.facts, defaultAbout.facts);
    migrated.skills = mergeAboutItemsById(source.skills, defaultAbout.skills);
    migrated.principles = mergeAboutItemsById(source.principles, defaultAbout.principles);
    migrated.moreSections = mergeAboutMoreSections(source.moreSections, defaultAbout.moreSections);

    [
        { label: 'Standort', value: source.loc },
        { label: 'Sprachen', value: source.lang },
        { label: 'Technologien', value: source.tech }
    ].forEach(({ label, value }) => {
        const sourceFact = hadFactsArray ? findFactItem(source.facts, label) : null;
        const sourceHasFactValue = isFilledText(sourceFact?.value);

        if (isFilledText(value) && !isLegacyDefaultFactValue(label, value) && (!hadFactsArray || !sourceHasFactValue)) {
            setFactValue(label, value, migrated);
        }
    });

    delete migrated.p1;
    delete migrated.p2;
    delete migrated.loc;
    delete migrated.lang;
    delete migrated.tech;

    return migrated;
}



function getDefaultEducationItems() {
    return [
        {
            id: 'edu-ukraine-1-9',
            level: '01',
            title: 'Ukraine',
            subtitle: '1–9 Klassen',
            icon: 'flag',
            status: 'Abgeschlossen',
            statusType: 'completed',
            years: '2013–2022',
            place: 'Ukraine',
            format: 'Schule',
            topics: 'Allgemeinbildung',
            progress: 100,
            clickable: true,
            text: 'Meine schulische Grundlage habe ich von etwa 2013 bis 2022 in der Ukraine aufgebaut.\nDort habe ich die Klassen 1 bis 9 besucht und wichtige Basiskenntnisse in allgemeinbildenden Fächern gesammelt.\nDiese Zeit war der Anfang meines Bildungsweges und hat mir geholfen, Disziplin und Lernbereitschaft zu entwickeln.',
            evidence: []
        },
        {
            id: 'edu-gymnasium-fulda',
            level: '02',
            title: 'Gymnasium Fulda',
            subtitle: 'A1–A2 Deutsch',
            icon: 'school',
            status: 'Abgeschlossen',
            statusType: 'completed',
            years: '01/2023–02/2024',
            place: 'Gymnasium Fulda',
            format: 'Deutschunterricht',
            topics: 'Sprache & Orientierung',
            progress: 100,
            clickable: true,
            text: 'Von Anfang 2023 bis Februar 2024 habe ich am Gymnasium Fulda Deutsch systematisch gelernt.\nIn dieser Zeit habe ich meine ersten Grundlagen in der deutschen Sprache aufgebaut und am Unterricht teilgenommen.\nDieser Abschnitt war wichtig, um mich sprachlich und schulisch besser in Deutschland zu orientieren.',
            evidence: [
                { type: 'placeholder', title: 'A2 Nachweis', note: 'Bild/Dokument später hinzufügen', icon: 'file-image' },
                { type: 'placeholder', title: 'Teilnahme am Deutschunterricht', note: 'Nachweis später hinzufügen', icon: 'file-text' }
            ]
        },
        {
            id: 'edu-3d-visualisierung',
            level: '03',
            title: '3D-Visualisierungskurs',
            subtitle: '3D, Architektur, Rendering',
            icon: 'box',
            status: 'Begonnen · nicht abgeschlossen',
            statusType: 'partial',
            years: '03/2023–03/2024',
            place: 'Online',
            format: 'Kurs',
            topics: '3D, Architektur, Rendering',
            progress: 90,
            clickable: true,
            text: 'Von März 2023 bis März 2024 habe ich an einem 3D-Visualisierungskurs teilgenommen, um meine kreativen Fähigkeiten und mein technisches Verständnis im Bereich 3D-Design zu verbessern.\nDurch mehrere Umzüge von Fulda über Wolfach nach Kehl konnte ich den Kurs leider nicht abschließen.\nTrotzdem habe ich dort ein starkes Interesse für Architektur, Rendering und visuelle Darstellung entwickelt.\nBesonders die Verbindung von Architektur, Design und realistischer Darstellung hat mein Interesse an visueller Kommunikation gestärkt.',
            evidence: [
                { type: 'placeholder', title: 'Architektur Rendering', note: 'Bild später hinzufügen', icon: 'image' },
                { type: 'placeholder', title: 'Innenraum Rendering', note: 'Bild später hinzufügen', icon: 'image' },
                { type: 'placeholder', title: '3D-Modell', note: 'Bild später hinzufügen', icon: 'box' },
                { type: 'placeholder', title: 'Außenansicht', note: 'Bild später hinzufügen', icon: 'image' },
                { type: 'placeholder', title: 'Designstudie', note: 'Bild später hinzufügen', icon: 'palette' },
                { type: 'placeholder', title: 'Visualisierung', note: 'Bild später hinzufügen', icon: 'monitor' }
            ]
        },
        {
            id: 'edu-klassen-10-11-online',
            level: '04',
            title: 'Klassen 10–11 Online',
            subtitle: 'Online-Abschluss',
            icon: 'book-open',
            status: 'Abgeschlossen',
            statusType: 'completed',
            years: '09/2023–06/2025',
            place: 'Ukraine',
            format: 'Online-Schule',
            topics: 'Schulabschluss',
            progress: 100,
            clickable: true,
            text: 'Nach einer Unterbrechung im Jahr 2022 habe ich meine schulische Ausbildung ab 2023 online fortgesetzt und die Klassen 10 und 11 im Juni 2025 abgeschlossen.\nDabei musste ich viel selbstständiger lernen, Aufgaben organisieren und Verantwortung für meinen eigenen Fortschritt übernehmen.\nDer Abschluss gehört zu meiner schulischen Ausbildung in der Ukraine.',
            evidence: [
                { type: 'placeholder', title: 'Schulabschluss / Attestat', note: 'Dokument später hinzufügen', icon: 'file-badge' }
            ]
        },
        {
            id: 'edu-berufliche-schulen-kehl',
            level: '05',
            title: 'Berufliche Schulen Kehl',
            subtitle: 'Schulische Entwicklung',
            icon: 'graduation-cap',
            status: 'Abgeschlossen',
            statusType: 'completed',
            years: '09/2024–06/2025',
            place: 'Kehl',
            format: 'Berufliche Schule',
            topics: 'Sprache & Beruf',
            progress: 100,
            clickable: true,
            text: 'Von September 2024 bis Ende Juni 2025 habe ich die Beruflichen Schulen Kehl besucht – parallel zu meiner Online-Schule.\nDort konnte ich meine Deutschkenntnisse im schulischen und beruflichen Kontext verbessern.\nDiese Phase hat mir geholfen, das deutsche Bildungssystem besser zu verstehen und mich weiter auf Ausbildung und Beruf vorzubereiten.',
            evidence: [
                { type: 'placeholder', title: 'Schulnachweis', note: 'Dokument später hinzufügen', icon: 'file-text' },
                { type: 'placeholder', title: 'Dokument / Attestat', note: 'Dokument später hinzufügen', icon: 'file-badge' }
            ]
        },
        {
            id: 'edu-b2-deutsch',
            level: '06',
            title: 'B2 Deutsch',
            subtitle: 'Berufliche Kommunikation',
            icon: 'message-square-text',
            status: 'Abgeschlossen',
            statusType: 'completed',
            years: '09/2025–02/2026',
            place: 'Deutschland',
            format: 'Deutschkurs',
            topics: 'Berufliche Kommunikation',
            progress: 100,
            clickable: true,
            text: 'Von September 2025 bis Februar 2026 habe ich einen B2-Deutschkurs besucht und abgeschlossen.\nDabei habe ich besonders an sicherer Kommunikation, Schreiben, Präsentationen und dem Verstehen komplexerer Texte gearbeitet.\nDieses Niveau hilft mir, mich auf Ausbildung, Arbeit und Alltag besser vorzubereiten.',
            evidence: [
                { type: 'placeholder', title: 'B2 Nachweis / Kursdokument', note: 'Dokument später hinzufügen', icon: 'file-text' }
            ]
        },
        {
            id: 'edu-arbeitsvorbereitung-afoeg',
            level: '07',
            title: 'Arbeitsvorbereitung',
            subtitle: 'AFÖG Kehl',
            icon: 'briefcase',
            status: 'Aktuell · bis 08/2026',
            statusType: 'current',
            years: '10/2025–08/2026',
            place: 'AFÖG Kehl · über dem Netto',
            format: 'Arbeitsvorbereitung',
            topics: 'Bewerbung & Orientierung',
            progress: 90,
            clickable: true,
            text: 'Bei der Arbeitsvorbereitung bei AFÖG in Kehl bereite ich mich gezielt auf den Einstieg in Ausbildung und Arbeitswelt vor.\nDazu gehören berufliche Orientierung, Bewerbungen, Lebenslauf und praktische Vorbereitung auf Gespräche.\nDiese Phase hilft mir, meine nächsten beruflichen Schritte klarer zu planen.\nOrt: AFÖG Kehl · über dem Netto.',
            evidence: []
        },
        {
            id: 'edu-ai-integrator-kurs',
            level: '08',
            title: 'AI-Integrator Kurs',
            subtitle: 'Online-Kurs',
            icon: 'brain',
            status: 'Gerade begonnen',
            statusType: 'current',
            years: 'Seit 07/2026',
            place: 'Online / Kurs',
            format: 'AI-Kurs',
            topics: 'KI, Projekte, Arbeitsprozesse',
            progress: 10,
            clickable: true,
            text: 'Den AI-Integrator Kurs habe ich gerade erst begonnen, nachdem mein Bruder ihn mir zum Anschauen gegeben hat.\nDort beschäftige ich mich mit dem praktischen Einsatz von künstlicher Intelligenz in Projekten und Arbeitsprozessen.\nMit wachsendem Fortschritt werde ich diesen Bereich später genauer ergänzen.',
            evidence: [
                { type: 'placeholder', title: 'Kursfortschritt', note: 'Screenshot später hinzufügen', icon: 'image' },
                { type: 'placeholder', title: 'Screenshot / Aufgabe', note: 'Bild später hinzufügen', icon: 'monitor' },
                { type: 'placeholder', title: 'Projektbeispiel', note: 'Beispiel später hinzufügen', icon: 'folder' }
            ]
        }
    ];
}

function getDefaultEducationGoal() {
    return {
        title: 'Ausbildung',
        subtitle: 'Nächstes Ziel',
        status: 'Aktiv',
        icon: 'lock',
        locked: true
    };
}

const EDUCATION_TIMELINE_REVISION = 2;

function applyEducationTimelineRevision(items) {
    const fieldsById = {
        'edu-ukraine-1-9': ['years', 'text'],
        'edu-gymnasium-fulda': ['years', 'text'],
        'edu-3d-visualisierung': ['years', 'text'],
        'edu-klassen-10-11-online': ['years', 'text'],
        'edu-berufliche-schulen-kehl': ['years', 'status', 'statusType', 'progress', 'text'],
        'edu-b2-deutsch': ['years', 'status', 'statusType', 'progress', 'text'],
        'edu-arbeitsvorbereitung-afoeg': ['years', 'status', 'statusType', 'progress'],
        'edu-ai-integrator-kurs': ['subtitle', 'years', 'status', 'statusType', 'progress', 'text']
    };
    const defaultsById = new Map(getDefaultEducationItems().map(item => [item.id, item]));

    return items.map(item => {
        const fields = fieldsById[item?.id];
        const defaults = defaultsById.get(item?.id);
        if (!fields || !defaults) return item;

        const update = Object.fromEntries(fields.map(field => [field, cloneData(defaults[field])]));
        return { ...item, ...update };
    });
}

function mergeEducationItemsById(existingItems, defaultItems) {
    const safeDefaults = Array.isArray(defaultItems) ? defaultItems : [];
    if (!Array.isArray(existingItems) || existingItems.length === 0) {
        return cloneData(safeDefaults);
    }

    const existingById = new Map();
    existingItems.forEach(item => {
        if (!item || typeof item !== 'object' || !item.id) return;
        if (!existingById.has(item.id)) existingById.set(item.id, item);
    });

    const result = [];
    const usedIds = new Set();

    safeDefaults.forEach(defaultItem => {
        if (!defaultItem || typeof defaultItem !== 'object' || !defaultItem.id) return;
        const existing = existingById.get(defaultItem.id);
        result.push(existing ? { ...cloneData(defaultItem), ...cloneData(existing) } : cloneData(defaultItem));
        usedIds.add(defaultItem.id);
    });

    existingItems.forEach(item => {
        if (!item || typeof item !== 'object' || !item.id) return;
        if (usedIds.has(item.id)) return;
        result.push(cloneData(item));
        usedIds.add(item.id);
    });

    return result.length > 0 ? result : cloneData(safeDefaults);
}

function migrateEducationData(data) {
    const source = data && typeof data === 'object' ? data : {};
    const migrated = { ...source };
    migrated.educationItems = mergeEducationItemsById(source.educationItems, getDefaultEducationItems());
    if (Number(source.educationTimelineRevision || 0) < EDUCATION_TIMELINE_REVISION) {
        migrated.educationItems = applyEducationTimelineRevision(migrated.educationItems);
    }
    migrated.educationGoal = source.educationGoal && typeof source.educationGoal === 'object'
        ? { ...getDefaultEducationGoal(), ...source.educationGoal, locked: true }
        : getDefaultEducationGoal();
    migrated.educationTimelineRevision = EDUCATION_TIMELINE_REVISION;
    return migrated;
}

const defaultData = {
    schemaVersion: 2,
    profile: {
        name: "Ivan",
        role: "Junior Entwickler, 3D Artist und Technologie-Enthusiast. Ich lerne ständig dazu und erschaffe Neues.",
        images: [
            createPlaceholderDataUrl('Ivan Photo', 600, 600),
        ],
        slideshowActive: true,
        slideshowInterval: 4
    },
    about: getDefaultAboutData(),
    educationItems: getDefaultEducationItems(),
    educationGoal: getDefaultEducationGoal(),
    projects: [
        { id: 1, title: 'Habit Tracker', desc: 'Web-App zur Verfolgung täglicher Gewohnheiten.', tech: 'JavaScript, HTML/CSS', img: createPlaceholderDataUrl('Habit Tracker'), icon: 'folder' },
        { id: 2, title: 'GX Resume Site', desc: 'Genau diese Seite. Single-Page, responsiv.', tech: 'Tailwind, JavaScript', img: createPlaceholderDataUrl('Resume Site'), icon: 'monitor' }
    ],
    books: [
        { id: 5, title: 'Atomic Habits', author: 'James Clear', notes: 'Ein absolutes Muss.', top: true },
        { id: 1, title: 'Essentialism', author: 'Greg McKeown', icon: 'headphones', notes: '', top: false }
    ],
    documents: [
        { id: 1, title: 'Zertifikat B1', size: '1.2 MB', ext: 'PDF', icon: 'file-badge', fileUrl: '#' }
    ],
    blogs: [
        { id: 1, title: "Eintauchen in modernes JavaScript und React", date: "Mai 2026", tag: "#WebDev", desc: "Ich studiere derzeit aktiv das React-Ökosystem. Nach Basis-JS fühlt sich der komponentenbasierte Ansatz wie ein frischer Wind an..." }
    ]
};
