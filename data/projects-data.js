/* Curated project catalogue and lightweight Nivora demo data. */

const PROJECT_SHOWCASE_REVISION = 7;

function getDefaultProjectsContent() {
    return {
        sectionTitle: 'Projekte',
        allProjectsLabel: 'Alle Projekte',
        archiveKicker: 'Portfolio',
        searchPlaceholder: 'Projekte durchsuchen …',
        moreButtonLabel: 'Mehr zum Projekt',
        roleLabel: 'Mein Beitrag',
        statusLabel: 'Status',
        technologiesLabel: 'Verwendet',
        extraTechnologiesLabel: 'Weitere Technologien'
    };
}

function normalizeProjectsContent(value) {
    const fallback = getDefaultProjectsContent();
    const source = value && typeof value === 'object' ? value : {};
    return Object.fromEntries(Object.keys(fallback).map(key => [
        key,
        String(source[key] ?? fallback[key]).trim() || fallback[key]
    ]));
}

function getDefaultProjectsLayout() {
    return {
        sidebarWidth: 344,
        pickerMinHeight: 104,
        insightCardMinHeight: 132,
        insightGap: 12
    };
}

function normalizeProjectsLayout(value, fallback = getDefaultProjectsLayout()) {
    const source = value && typeof value === 'object' ? value : {};
    const numberInRange = (key, min, max) => {
        const number = Number(source[key]);
        return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback[key];
    };
    return {
        sidebarWidth: numberInRange('sidebarWidth', 288, 400),
        pickerMinHeight: numberInRange('pickerMinHeight', 84, 132),
        insightCardMinHeight: numberInRange('insightCardMinHeight', 104, 190),
        insightGap: numberInRange('insightGap', 8, 24)
    };
}

const PROJECT_SHOWCASE_DEFAULTS = [
    {
        id: 'project-nivora',
        showcaseKey: 'nivora',
        title: 'Nivora',
        category: 'Produktivitäts-App',
        desc: 'In Nivora verbinde ich Ziele, Fähigkeiten und meinen Lernfortschritt. Ich baue die App, weil mir bei anderen Lösungen immer der Zusammenhang gefehlt hat.',
        role: 'Idee, Aufbau, Design und Umsetzung',
        period: 'Seit 2025',
        status: 'Prototyp · in Arbeit',
        tech: 'HTML, CSS, JavaScript, Android WebView',
        icon: 'square-terminal',
        learned: 'Bei Nivora bringe ich vieles zusammen, was ich in meinen früheren Projekten gelernt habe.',
        highlights: ['Ziele strukturieren', 'Fähigkeiten entwickeln', 'Fokus halten', 'Fortschritt messbar machen']
    },
    {
        id: 'project-resume',
        showcaseKey: 'resume',
        title: 'Resume Website',
        category: 'Persönliche Website',
        desc: 'Hier zeige ich, wer ich bin, was ich gelernt habe und woran ich gerade arbeite. Die Website habe ich Schritt für Schritt aufgebaut und entwickle sie weiter.',
        role: 'Idee, Struktur, Design und Umsetzung',
        period: 'Seit 2026',
        status: 'Online · in Arbeit',
        tech: 'HTML, CSS, JavaScript',
        icon: 'panel-top',
        learned: 'Bei dieser Website lerne ich vor allem, wie größere Bereiche sauber zusammenarbeiten und trotzdem einzeln verändert werden können.',
        highlights: ['Modulare Struktur', 'Getrennte Dateien', 'Eigener Admin-Modus']
    },
    {
        id: 'project-idea-capture',
        showcaseKey: 'idea-capture',
        title: 'Idea Capture',
        category: 'Produktivitäts-Tool',
        desc: 'Hier speichere ich Gedanken aus Büchern, Videos oder Gesprächen. Zu jeder Idee halte ich direkt fest, was ich damit machen möchte.',
        role: 'Idee, Aufbau und Android-Integration',
        period: 'Prototyp',
        status: 'Prototyp',
        tech: 'HTML, CSS, JavaScript, Android WebView, Firebase',
        icon: 'lightbulb',
        learned: 'Dabei habe ich Android Studio, Firebase, Google-Anmeldung und Synchronisation zum ersten Mal gemeinsam eingesetzt.',
        highlights: ['Ideen aus Büchern sichern', 'Google-Synchronisation', 'Mehrere Geräte', 'Soundeffekte']
    }
];

const NIVORA_VIDEO_FEATURES = [
    {
        id: 'ziele',
        navLabel: 'Ziele',
        eyebrow: '01 · Ziele',
        title: 'Ziele anlegen und in kleine Schritte teilen',
        description: 'Ich kann ein Ziel schnell erfassen, priorisieren und mit konkreten Aufgaben verbinden.',
        points: ['Ziel schnell erstellen', 'Priorität festlegen', 'Aufgaben logisch unterteilen'],
        video: 'assets/projects/nivora/videos/ziele.mp4',
        poster: 'assets/projects/nivora/posters/ziele.webp',
        icon: 'circle-check-big'
    },
    {
        id: 'faehigkeiten',
        navLabel: 'Fähigkeiten',
        eyebrow: '02 · Fähigkeiten',
        title: 'Sehen, welche Fähigkeiten wirklich wachsen',
        description: 'Aufgaben lassen sich mit Fähigkeiten verbinden. So bleibt sichtbar, woran ich arbeite und wo ich besser werde.',
        points: ['Fähigkeit auswählen', 'XP sinnvoll zuordnen', 'Entwicklung nachvollziehen'],
        video: 'assets/projects/nivora/videos/faehigkeiten.mp4',
        poster: 'assets/projects/nivora/posters/faehigkeiten.webp',
        icon: 'layers-3'
    },
    {
        id: 'charakter',
        navLabel: 'Charakter',
        eyebrow: '03 · Charakter',
        title: 'Den eigenen Fortschritt an einem Ort sehen',
        description: 'Der Charakter bündelt Level, Notizen und persönliche Entwicklung, ohne dass ich dafür mehrere Ansichten öffnen muss.',
        points: ['Eigene Entwicklung überblicken', 'Notizen schnell öffnen', 'Fortschritt und Balance verbinden'],
        video: 'assets/projects/nivora/videos/flow.mp4',
        poster: 'assets/projects/nivora/posters/flow.webp',
        icon: 'user-round'
    },
    {
        id: 'belohnungen',
        navLabel: 'Belohnungen',
        eyebrow: '04 · Belohnungen',
        title: 'Erledigte Arbeit bewusst abschließen',
        description: 'Für abgeschlossene Aufgaben kann ich eigene Belohnungen hinterlegen. Das macht den Fortschritt greifbarer.',
        points: ['Ergebnis anzeigen', 'Belohnung erhalten', 'Motivation mit Fortschritt verbinden'],
        video: 'assets/projects/nivora/videos/belohnungen.mp4',
        poster: 'assets/projects/nivora/posters/belohnungen.webp',
        icon: 'gift'
    },
    {
        id: 'navigation',
        navLabel: 'Navigation',
        eyebrow: '05 · Navigation & Einstellungen',
        title: 'Ohne Umwege durch die App',
        description: 'Die wichtigsten Bereiche und Einstellungen sind direkt erreichbar und bleiben auch bei vielen Inhalten übersichtlich.',
        points: ['Bereiche direkt wechseln', 'Wichtige Einstellungen finden', 'Oberfläche anpassen'],
        video: 'assets/projects/nivora/videos/navigation.mp4',
        poster: 'assets/projects/nivora/posters/navigation.webp',
        icon: 'settings-2'
    }
];


const RESUME_WEBSITE_FEATURES = [
    {
        id: 'startseite',
        navLabel: 'Startseite',
        eyebrow: '01 · Startseite',
        title: 'Schnell verstehen, wer ich bin',
        description: 'Die Startseite zeigt meine Richtung und führt ohne Umwege zu den wichtigsten Bereichen.',
        image: 'assets/projects/resume/posters/startseite.webp',
        video: '',
        icon: 'home'
    },
    {
        id: 'ueber-mich',
        navLabel: 'Über mich',
        eyebrow: '02 · Über mich',
        title: 'Mehr über mich, ohne langen Lebenslauftext',
        description: 'Hier stehen mein kurzer Hintergrund, meine Werte und die Fähigkeiten, die für meine Arbeit wichtig sind.',
        image: 'assets/projects/resume/posters/ueber-mich.webp',
        video: '',
        icon: 'user-round'
    },
    {
        id: 'bildung',
        navLabel: 'Bildung',
        eyebrow: '03 · Bildung',
        title: 'Mein Bildungsweg als klare Timeline',
        description: 'Schule, Deutschkurse und die nächsten Möglichkeiten werden in zeitlicher Reihenfolge gezeigt.',
        image: 'assets/projects/resume/posters/bildung.webp',
        video: '',
        icon: 'graduation-cap'
    },
    {
        id: 'projekte',
        navLabel: 'Projekte',
        eyebrow: '04 · Projekte',
        title: 'Projekte nicht nur nennen, sondern zeigen',
        description: 'Jedes Projekt bekommt eigene Bilder, kurze Erklärungen und einen klaren aktuellen Stand.',
        image: 'assets/projects/resume/posters/projekte.webp',
        video: '',
        icon: 'folder-kanban'
    },
    {
        id: 'bibliothek',
        navLabel: 'Bibliothek',
        eyebrow: '05 · Bibliothek',
        title: 'Bücher, die mir wirklich etwas gebracht haben',
        description: 'Die Bibliothek zeigt meine Favoriten und die Bücher, die ich zuletzt gelesen habe.',
        image: 'assets/projects/resume/posters/bibliothek.webp',
        video: '',
        icon: 'book-open'
    },
    {
        id: 'dokumente',
        navLabel: 'Dokumente',
        eyebrow: '06 · Dokumente',
        title: 'Dokumente direkt öffnen',
        description: 'Zeugnisse und Zertifikate sind geordnet und können direkt angesehen oder heruntergeladen werden.',
        image: 'assets/projects/resume/posters/dokumente.webp',
        video: '',
        icon: 'files'
    },
    {
        id: 'blog',
        navLabel: 'Blog',
        eyebrow: '07 · Blog',
        title: 'Updates zu meiner Arbeit und meinen Ideen',
        description: 'Im Blog schreibe ich gelegentlich über Projekte, neue Funktionen und Dinge, an denen ich gerade arbeite.',
        image: 'assets/projects/resume/posters/blog.webp',
        video: '',
        icon: 'rss'
    }
];

const RESUME_WEBSITE_STRUCTURE = [
    {
        folder: 'css',
        preview: 'assets/projects/resume/structure/css.webp',
        icon: 'palette',
        description: 'Jeder größere Bereich hat eigene Styles. Dadurch bleiben Änderungen überschaubar.',
        files: ['base.css', 'about.css', 'education.css', 'projects.css']
    },
    {
        folder: 'js',
        preview: 'assets/projects/resume/structure/js.webp',
        icon: 'braces',
        description: 'Darstellung, Navigation, Speicherung und Interaktionen sind nach Aufgaben getrennt.',
        files: ['app.js', 'render/projects.js', 'core/storage.js', 'ui/interactions.js']
    },
    {
        folder: 'data',
        preview: 'assets/projects/resume/structure/data.webp',
        icon: 'database',
        description: 'Texte und Projektdaten liegen getrennt vom Layout und lassen sich leichter bearbeiten.',
        files: ['default-data.js', 'projects-data.js']
    },
    {
        folder: 'assets',
        preview: 'assets/projects/resume/structure/assets.webp',
        icon: 'images',
        description: 'Bilder, Videos, Icons und Schriftarten liegen in eigenen Unterordnern.',
        files: ['images/', 'projects/', 'fonts/', 'vendor/']
    }
];


const IDEA_CAPTURE_FEATURES = [
    {
        id: 'app',
        navLabel: 'App',
        eyebrow: '01 · App',
        title: 'Ideen festhalten und mit einer Handlung verbinden',
        description: 'Ich sammle Gedanken aus Büchern, Videos und Gesprächen und schreibe direkt dazu, was ich damit machen möchte.',
        kind: 'video',
        image: 'assets/projects/idea-capture/posters/app.webp',
        video: 'assets/projects/idea-capture/videos/app.mp4',
        icon: 'notebook-pen'
    },
    {
        id: 'synchronisation',
        navLabel: 'Synchronisation',
        eyebrow: '02 · Synchronisation',
        title: 'Auf mehreren Geräten weiterarbeiten',
        description: 'Mit Google-Anmeldung und Firebase bleiben die Einträge auf Smartphone, Tablet und im Browser verfügbar.',
        kind: 'video',
        image: 'assets/projects/idea-capture/posters/sync.webp',
        video: 'assets/projects/idea-capture/videos/sync.mp4',
        icon: 'refresh-cw'
    }
];

const IDEA_CAPTURE_DETAILS = [
    {
        title: 'Android Studio',
        label: 'App-Aufbau',
        icon: 'smartphone',
        preview: 'assets/projects/idea-capture/details/android-studio.webp',
        description: 'Hier sieht man die Projektstruktur und wie die Web-App in die Android-Anwendung eingebunden ist.'
    },
    {
        title: 'Firebase',
        label: 'Cloud & Anmeldung',
        icon: 'database-zap',
        preview: 'assets/projects/idea-capture/details/firebase.webp',
        description: 'Firebase speichert die Einträge und hält sie nach der Google-Anmeldung auf meinen Geräten synchron.'
    },
    {
        title: 'Motivation',
        label: 'Warum dieses Projekt',
        icon: 'lightbulb',
        preview: '',
        description: 'Ich wollte Ideen nicht nur sammeln, sondern später auch wirklich nutzen. Gleichzeitig konnte ich Firebase und Android Studio an einem echten eigenen Projekt ausprobieren.'
    }
];

const NIVORA_PROJECT_DETAILS = [
    {
        title: 'Ein gemeinsames System',
        label: 'Produktidee',
        icon: 'network',
        description: 'Nivora verbindet Ziele, Fähigkeiten, Fokus und Belohnungen, damit mein Fortschritt nicht auf mehrere Apps verteilt ist.'
    },
    {
        title: 'Erfahrungen zusammengeführt',
        label: 'Entwicklung',
        icon: 'blocks',
        description: 'In diesem Projekt nutze ich vieles, was ich bei meinen früheren Web- und Android-Projekten gelernt habe.'
    },
    {
        title: 'Modulare Struktur',
        label: 'Technik',
        icon: 'folder-tree',
        description: 'Die Bereiche sind voneinander getrennt. So kann ich neue Funktionen ergänzen, ohne dabei alles andere umzubauen.'
    },
    {
        title: 'Wirkung wird gemessen',
        label: 'Aktueller Stand',
        icon: 'chart-no-axes-combined',
        description: 'Die App funktioniert, ist aber noch nicht fertig. Im Moment nutze ich sie selbst und beobachte, was wirklich hilfreich ist und was noch verbessert werden muss.'
    }
];

function cloneProjectEntries(entries) {
    return (Array.isArray(entries) ? entries : []).map(entry => ({
        ...entry,
        ...(Array.isArray(entry.points) ? { points: [...entry.points] } : {}),
        ...(Array.isArray(entry.files) ? { files: [...entry.files] } : {})
    }));
}

const PROJECT_SHOWCASE_CONTENT_DEFAULTS = {
    nivora: {
        detailsTitle: 'Nivora · Projektsystem',
        detailsIntro: 'Hier zeige ich etwas genauer, wie Nivora aufgebaut ist, was bereits funktioniert und woran ich noch arbeite.',
        features: NIVORA_VIDEO_FEATURES,
        details: NIVORA_PROJECT_DETAILS
    },
    resume: {
        detailsTitle: 'Technischer Aufbau',
        detailsIntro: 'Hier sieht man, wie ich Inhalte, Darstellung und Funktionen voneinander getrennt habe. So kann ich einzelne Bereiche ändern, ohne jedes Mal die ganze Website anzufassen.',
        features: RESUME_WEBSITE_FEATURES,
        details: RESUME_WEBSITE_STRUCTURE
    },
    'idea-capture': {
        detailsTitle: 'Idea Capture · Technik & Motivation',
        detailsIntro: 'Hier zeige ich den technischen Aufbau und warum ich die Anwendung überhaupt entwickelt habe.',
        features: IDEA_CAPTURE_FEATURES,
        details: IDEA_CAPTURE_DETAILS
    }
};

PROJECT_SHOWCASE_DEFAULTS.forEach(project => {
    const showcase = PROJECT_SHOWCASE_CONTENT_DEFAULTS[project.showcaseKey];
    project.features = cloneProjectEntries(showcase?.features);
    project.details = cloneProjectEntries(showcase?.details);
    project.detailsTitle = showcase?.detailsTitle || '';
    project.detailsIntro = showcase?.detailsIntro || '';
});

function getProjectShowcaseDefaults(showcaseKey) {
    const showcase = PROJECT_SHOWCASE_CONTENT_DEFAULTS[String(showcaseKey || '')];
    return {
        features: cloneProjectEntries(showcase?.features),
        details: cloneProjectEntries(showcase?.details),
        detailsTitle: showcase?.detailsTitle || '',
        detailsIntro: showcase?.detailsIntro || ''
    };
}

function normalizeProjectShowcaseItem(item, fallback = {}) {
    const source = item && typeof item === 'object' ? item : {};
    const base = fallback && typeof fallback === 'object' ? fallback : {};
    const showcaseKey = ['nivora', 'resume', 'idea-capture'].includes(String(source.showcaseKey || base.showcaseKey))
        ? String(source.showcaseKey || base.showcaseKey)
        : 'generic';
    const showcaseDefaults = getProjectShowcaseDefaults(showcaseKey);
    const sourceFeatures = Array.isArray(source.features) && source.features.length
        ? source.features
        : (Array.isArray(base.features) && base.features.length ? base.features : showcaseDefaults.features);
    const sourceDetails = Array.isArray(source.details)
        ? source.details
        : (Array.isArray(base.details) ? base.details : showcaseDefaults.details);
    const safeString = (key, fallbackValue = '') => String(source[key] ?? base[key] ?? fallbackValue).trim();
    const highlights = Array.isArray(source.highlights)
        ? source.highlights
        : (Array.isArray(base.highlights) ? base.highlights : []);

    return {
        ...base,
        ...source,
        id: safeString('id', `project-${Date.now()}`),
        showcaseKey,
        title: safeString('title', 'Neues Projekt'),
        category: safeString('category', 'Projekt'),
        desc: safeString('desc'),
        role: safeString('role', 'Idee und Umsetzung'),
        period: safeString('period'),
        status: safeString('status', 'In Entwicklung'),
        tech: safeString('tech'),
        icon: safeString('icon', 'folder'),
        img: safeString('img'),
        learned: safeString('learned'),
        detailsTitle: safeString('detailsTitle', base.detailsTitle || showcaseDefaults.detailsTitle),
        detailsIntro: safeString('detailsIntro', base.detailsIntro || showcaseDefaults.detailsIntro),
        highlights: highlights.map(value => String(value || '').trim()).filter(Boolean).slice(0, 8),
        features: cloneProjectEntries(sourceFeatures).slice(0, 12).map((entry, index) => ({
            ...entry,
            id: String(entry.id || `${showcaseKey}-view-${index + 1}`)
        })),
        details: cloneProjectEntries(sourceDetails).slice(0, 12).map((entry, index) => ({
            ...entry,
            id: String(entry.id || `${showcaseKey}-detail-${index + 1}`)
        }))
    };
}

function normalizeProjectTitle(value) {
    return String(value || '').trim().toLowerCase();
}

function migrateProjectShowcaseData(projects, currentRevision = 0) {
    const source = Array.isArray(projects)
        ? projects.filter(item => item && typeof item === 'object')
        : [];

    if (Number(currentRevision || 0) >= PROJECT_SHOWCASE_REVISION) {
        return source.map(item => {
            const fallback = PROJECT_SHOWCASE_DEFAULTS.find(defaultProject => (
                String(defaultProject.id) === String(item.id)
                || defaultProject.showcaseKey === item.showcaseKey
            ));
            return normalizeProjectShowcaseItem(item, fallback);
        });
    }

    const migratedSource = source.filter(item => {
        const title = normalizeProjectTitle(item.title);
        return String(item.id) !== 'project-3d'
            && item.showcaseKey !== '3d'
            && title !== '3d-visualisierung'
            && title !== '3d visualisierung';
    });

    const aliases = {
        nivora: ['nivora'],
        resume: ['resume website', 'gx resume site', 'resume site'],
        'idea-capture': ['idea capture']
    };
    const usedItems = new Set();

    const curated = PROJECT_SHOWCASE_DEFAULTS.map(defaultProject => {
        const match = migratedSource.find(item => {
            if (usedItems.has(item)) return false;
            if (String(item.id) === defaultProject.id || item.showcaseKey === defaultProject.showcaseKey) return true;
            return (aliases[defaultProject.showcaseKey] || []).includes(normalizeProjectTitle(item.title));
        });

        if (!match) return normalizeProjectShowcaseItem(defaultProject, defaultProject);
        usedItems.add(match);

        const isCanonical = String(match.id) === defaultProject.id || match.showcaseKey === defaultProject.showcaseKey;
        if (!isCanonical) {
            return normalizeProjectShowcaseItem({
                ...defaultProject,
                desc: match.desc || defaultProject.desc,
                tech: match.tech || defaultProject.tech,
                icon: match.icon || defaultProject.icon,
                img: match.img || defaultProject.img
            }, defaultProject);
        }

        return normalizeProjectShowcaseItem({
            ...defaultProject,
            ...match,
            id: defaultProject.id,
            showcaseKey: defaultProject.showcaseKey,
            features: Array.isArray(match.features) && match.features.length ? match.features : defaultProject.features,
            details: Array.isArray(match.details) ? match.details : defaultProject.details,
            detailsTitle: match.detailsTitle || defaultProject.detailsTitle,
            detailsIntro: match.detailsIntro || defaultProject.detailsIntro
        }, defaultProject);
    });

    const ignoredLegacyTitles = new Set(['habit tracker']);
    const custom = migratedSource
        .filter(item => !usedItems.has(item))
        .filter(item => !ignoredLegacyTitles.has(normalizeProjectTitle(item.title)))
        .map(item => normalizeProjectShowcaseItem(item));

    return [...curated, ...custom];
}
