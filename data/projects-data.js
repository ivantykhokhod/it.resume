/* Curated project catalogue and lightweight Nivora demo data. */

const PROJECT_SHOWCASE_REVISION = 2;

const PROJECT_SHOWCASE_DEFAULTS = [
    {
        id: 'project-nivora',
        showcaseKey: 'nivora',
        title: 'Nivora',
        category: 'Produktivitäts-App',
        desc: 'Eine Anwendung für Planung, Zeitmanagement und persönliche Entwicklung.',
        role: 'Konzept, Produktstruktur und Prototyping',
        period: 'Aktive Entwicklung',
        status: 'Aktiver Prototyp',
        tech: 'HTML, CSS, JavaScript, Android WebView',
        icon: 'square-terminal',
        highlights: ['Ziele strukturieren', 'Fähigkeiten entwickeln', 'Fokus halten', 'Fortschritt belohnen']
    },
    {
        id: 'project-resume',
        showcaseKey: 'resume',
        title: 'Resume Website',
        category: 'Web-Portfolio',
        desc: 'Diese modulare Website präsentiert meinen Weg, meine Projekte und meine Entwicklung.',
        role: 'Konzept, Inhalt und Umsetzung',
        period: 'Aktive Entwicklung',
        status: 'Online-Projekt',
        tech: 'HTML, CSS, JavaScript',
        icon: 'panel-top',
        highlights: ['Modulare Struktur', 'Eigener Admin-Modus', 'Responsive Oberfläche']
    },
    {
        id: 'project-idea-capture',
        showcaseKey: 'idea-capture',
        title: 'Idea Capture',
        category: 'Produktivitäts-Tool',
        desc: 'Ein minimalistisches System zum schnellen Erfassen, Ordnen und Anwenden von Ideen.',
        role: 'Produktidee und Prototyping',
        period: 'Konzeptphase',
        status: 'Prototyp',
        tech: 'HTML, CSS, JavaScript, LocalStorage',
        icon: 'lightbulb',
        highlights: ['Schnelle Erfassung', 'Klare Kategorien', 'Direkte nächste Handlung']
    }
];

const NIVORA_VIDEO_FEATURES = [
    {
        id: 'ziele',
        navLabel: 'Ziele',
        eyebrow: '01 · Ziele',
        title: 'Aus einer Idee wird ein klarer Plan',
        description: 'Ziele werden angelegt, priorisiert und in überschaubare Schritte zerlegt.',
        points: ['Ziel schnell erstellen', 'Priorität festlegen', 'Aufgaben logisch unterteilen'],
        video: 'assets/projects/nivora/videos/ziele.mp4',
        poster: 'assets/projects/nivora/posters/ziele.webp',
        icon: 'circle-check-big'
    },
    {
        id: 'faehigkeiten',
        navLabel: 'Fähigkeiten',
        eyebrow: '02 · Fähigkeiten',
        title: 'Jede Aufgabe stärkt eine konkrete Fähigkeit',
        description: 'Ziele werden mit Fähigkeiten verbunden, damit Entwicklung und Erfahrung sichtbar bleiben.',
        points: ['Fähigkeit auswählen', 'XP sinnvoll zuordnen', 'Entwicklung nachvollziehen'],
        video: 'assets/projects/nivora/videos/faehigkeiten.mp4',
        poster: 'assets/projects/nivora/posters/faehigkeiten.webp',
        icon: 'layers-3'
    },
    {
        id: 'charakter',
        navLabel: 'Charakter',
        eyebrow: '03 · Charakter',
        title: 'Fortschritt bekommt ein persönliches Zentrum',
        description: 'Der Charakter bündelt den persönlichen Fortschritt, Notizen und die Balance an einem Ort.',
        points: ['Eigene Entwicklung überblicken', 'Notizen schnell öffnen', 'Fortschritt und Balance verbinden'],
        video: 'assets/projects/nivora/videos/flow.mp4',
        poster: 'assets/projects/nivora/posters/flow.webp',
        icon: 'user-round'
    },
    {
        id: 'belohnungen',
        navLabel: 'Belohnungen',
        eyebrow: '04 · Belohnungen',
        title: 'Fortschritt endet mit einem sichtbaren Ergebnis',
        description: 'Belohnungen schließen erledigte Arbeit emotional ab und machen Fortschritt spürbar.',
        points: ['Ergebnis anzeigen', 'Belohnung erhalten', 'Motivation mit Fortschritt verbinden'],
        video: 'assets/projects/nivora/videos/belohnungen.mp4',
        poster: 'assets/projects/nivora/posters/belohnungen.webp',
        icon: 'gift'
    },
    {
        id: 'navigation',
        navLabel: 'Navigation',
        eyebrow: '05 · Navigation & Einstellungen',
        title: 'Schnell zwischen Bereichen wechseln',
        description: 'Die letzte Demo zeigt die Navigation zwischen den Hauptbereichen und einige zentrale Einstellungen.',
        points: ['Bereiche direkt wechseln', 'Wichtige Einstellungen finden', 'Oberfläche anpassen'],
        video: 'assets/projects/nivora/videos/navigation.mp4',
        poster: 'assets/projects/nivora/posters/navigation.webp',
        icon: 'settings-2'
    }
];

function normalizeProjectTitle(value) {
    return String(value || '').trim().toLowerCase();
}

function migrateProjectShowcaseData(projects, currentRevision = 0) {
    const source = Array.isArray(projects)
        ? projects.filter(item => item && typeof item === 'object')
        : [];

    if (Number(currentRevision || 0) >= PROJECT_SHOWCASE_REVISION) {
        return source.map(item => ({ ...item }));
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

        if (!match) return { ...defaultProject, highlights: [...defaultProject.highlights] };
        usedItems.add(match);

        const isCanonical = String(match.id) === defaultProject.id || match.showcaseKey === defaultProject.showcaseKey;
        if (!isCanonical) {
            return {
                ...defaultProject,
                desc: match.desc || defaultProject.desc,
                tech: match.tech || defaultProject.tech,
                icon: match.icon || defaultProject.icon,
                img: match.img || defaultProject.img,
                highlights: [...defaultProject.highlights]
            };
        }

        return {
            ...defaultProject,
            ...match,
            id: defaultProject.id,
            showcaseKey: defaultProject.showcaseKey,
            highlights: Array.isArray(match.highlights) ? [...match.highlights] : [...defaultProject.highlights]
        };
    });

    const ignoredLegacyTitles = new Set(['habit tracker']);
    const custom = migratedSource
        .filter(item => !usedItems.has(item))
        .filter(item => !ignoredLegacyTitles.has(normalizeProjectTitle(item.title)))
        .map(item => ({ ...item }));

    return [...curated, ...custom];
}
