/* Curated project catalogue and lightweight Nivora demo data. */

const PROJECT_SHOWCASE_REVISION = 5;

const PROJECT_SHOWCASE_DEFAULTS = [
    {
        id: 'project-nivora',
        showcaseKey: 'nivora',
        title: 'Nivora',
        category: 'Produktivitäts-App',
        desc: 'Ein modulares Lern- und Entwicklungssystem, das meine bisherigen Projekte und Erfahrungen verbindet.',
        role: 'Produktkonzept, Systemstruktur und Entwicklung',
        period: 'Aktive Rohversion',
        status: 'Funktionsfähiger Prototyp',
        tech: 'HTML, CSS, JavaScript, Android WebView',
        icon: 'square-terminal',
        learned: 'Nivora verbindet die wichtigsten Erkenntnisse aus meinen bisherigen Projekten zu einem gemeinsamen Lernsystem.',
        highlights: ['Ziele strukturieren', 'Fähigkeiten entwickeln', 'Fokus halten', 'Fortschritt messbar machen']
    },
    {
        id: 'project-resume',
        showcaseKey: 'resume',
        title: 'Resume Website',
        category: 'Web-Portfolio',
        desc: 'Diese modulare Website präsentiert meinen Weg, meine Projekte und meine Entwicklung.',
        role: 'Konzept, Struktur und Entwicklung',
        period: 'Aktive Entwicklung',
        status: 'Online-Projekt',
        tech: 'HTML, CSS, JavaScript',
        icon: 'panel-top',
        learned: 'Damit habe ich gelernt, wie man eine Webanwendung strukturiert über mehrere HTML-, CSS- und JavaScript-Dateien aufbaut.',
        highlights: ['Modulare Struktur', 'Getrennte Dateien', 'Eigener Admin-Modus']
    },
    {
        id: 'project-idea-capture',
        showcaseKey: 'idea-capture',
        title: 'Idea Capture',
        category: 'Produktivitäts-Tool',
        desc: 'Ein minimalistisches System zum schnellen Erfassen, Ordnen und Anwenden von Ideen.',
        role: 'Produktidee, Android-Integration und Synchronisation',
        period: 'Funktionsfähiger Prototyp',
        status: 'Mehrgeräte-Prototyp',
        tech: 'HTML, CSS, JavaScript, Android WebView, Firebase',
        icon: 'lightbulb',
        learned: 'Android Studio, Firebase, Google-Anmeldung, Synchronisation und Soundeffekte praktisch eingesetzt.',
        highlights: ['Ideen aus Büchern sichern', 'Google-Synchronisation', 'Mehrere Geräte', 'Soundeffekte']
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


const RESUME_WEBSITE_FEATURES = [
    {
        id: 'startseite',
        navLabel: 'Startseite',
        eyebrow: '01 · Startseite',
        title: 'Der erste Eindruck in wenigen Sekunden',
        description: 'Die Startseite stellt Person, Ausrichtung und die wichtigsten Wege durch die Website direkt vor.',
        image: 'assets/projects/resume/posters/startseite.webp',
        video: '',
        icon: 'home'
    },
    {
        id: 'ueber-mich',
        navLabel: 'Über mich',
        eyebrow: '02 · Über mich',
        title: 'Profil, Werte und Fähigkeiten in einer Struktur',
        description: 'Die Seite verbindet Kurzprofil, persönliche Prinzipien und Kernfähigkeiten in einem übersichtlichen Bereich.',
        image: 'assets/projects/resume/posters/ueber-mich.webp',
        video: '',
        icon: 'user-round'
    },
    {
        id: 'bildung',
        navLabel: 'Bildung',
        eyebrow: '03 · Bildung',
        title: 'Ein Weg, der Schritt für Schritt sichtbar wird',
        description: 'Die Timeline zeigt Schulbildung, Sprachentwicklung, Kurse und das nächste berufliche Ziel.',
        image: 'assets/projects/resume/posters/bildung.webp',
        video: '',
        icon: 'graduation-cap'
    },
    {
        id: 'projekte',
        navLabel: 'Projekte',
        eyebrow: '04 · Projekte',
        title: 'Produkte werden nicht nur genannt, sondern gezeigt',
        description: 'Jedes Projekt erhält eine eigene interaktive Präsentation mit Rolle, Technologien und visuellen Demos.',
        image: 'assets/projects/resume/posters/projekte.webp',
        video: '',
        icon: 'folder-kanban'
    },
    {
        id: 'bibliothek',
        navLabel: 'Bibliothek',
        eyebrow: '05 · Bibliothek',
        title: 'Gelesenes und Gehörtes an einem Ort',
        description: 'Die Bibliothek sammelt Favoriten und aktuelle Inhalte, die Lernen und persönliche Entwicklung unterstützen.',
        image: 'assets/projects/resume/posters/bibliothek.webp',
        video: '',
        icon: 'book-open'
    },
    {
        id: 'dokumente',
        navLabel: 'Dokumente',
        eyebrow: '06 · Dokumente',
        title: 'Nachweise direkt ansehen und herunterladen',
        description: 'Zertifikate, Zeugnisse und weitere Dokumente werden klar geordnet und schnell zugänglich gemacht.',
        image: 'assets/projects/resume/posters/dokumente.webp',
        video: '',
        icon: 'files'
    },
    {
        id: 'blog',
        navLabel: 'Blog',
        eyebrow: '07 · Blog',
        title: 'Fortschritt und Gedanken werden dokumentiert',
        description: 'Der Blog bietet Raum für Lernfortschritte, Erkenntnisse und kurze Berichte über neue Entwicklungen.',
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
        description: 'Jede größere Sektion besitzt eigene Styles, damit Änderungen kontrolliert bleiben.',
        files: ['base.css', 'about.css', 'education.css', 'projects.css']
    },
    {
        folder: 'js',
        preview: 'assets/projects/resume/structure/js.webp',
        icon: 'braces',
        description: 'Rendering, Navigation, Speicherung und Interaktionen sind nach Aufgaben getrennt.',
        files: ['app.js', 'render/projects.js', 'core/storage.js', 'ui/interactions.js']
    },
    {
        folder: 'data',
        preview: 'assets/projects/resume/structure/data.webp',
        icon: 'database',
        description: 'Inhalte und Projektdaten werden unabhängig vom Layout verwaltet.',
        files: ['default-data.js', 'projects-data.js']
    },
    {
        folder: 'assets',
        preview: 'assets/projects/resume/structure/assets.webp',
        icon: 'images',
        description: 'Bilder, Videos, Icons und Schriftdateien liegen in klaren Unterordnern.',
        files: ['images/', 'projects/', 'fonts/', 'vendor/']
    }
];


const IDEA_CAPTURE_FEATURES = [
    {
        id: 'app',
        navLabel: 'App',
        eyebrow: '01 · App',
        title: 'Ideen schnell erfassen und später nutzen',
        description: 'Die Anwendung sammelt Erkenntnisse aus Büchern, Videos und anderen Quellen und verbindet sie mit einer konkreten nächsten Handlung.',
        kind: 'video',
        image: 'assets/projects/idea-capture/posters/app.webp',
        video: 'assets/projects/idea-capture/videos/app.mp4',
        icon: 'notebook-pen'
    },
    {
        id: 'synchronisation',
        navLabel: 'Synchronisation',
        eyebrow: '02 · Synchronisation',
        title: 'Eine Idee bleibt auf mehreren Geräten verfügbar',
        description: 'Google-Anmeldung und Firebase verbinden Smartphone, Tablet und Webansicht. Änderungen können dadurch auf drei oder mehr Geräten genutzt werden.',
        kind: 'video',
        image: 'assets/projects/idea-capture/posters/sync.webp',
        video: 'assets/projects/idea-capture/videos/sync.mp4',
        icon: 'refresh-cw'
    },
    {
        id: 'gelernt',
        navLabel: 'Gelernt',
        eyebrow: '03 · Gelernt',
        title: 'Was ich in diesem Projekt gelernt habe',
        description: 'Ich habe verstanden, wie Android Studio, Android WebView, Firebase, Google-Anmeldung und Synchronisation zusammenspielen. Zusätzlich habe ich Soundeffekte in eine reale Anwendung integriert.',
        kind: 'text',
        icon: 'graduation-cap',
        points: ['Android Studio praktisch eingesetzt', 'Firebase und Google Sign-In verbunden', 'Synchronisation getestet', 'Soundeffekte integriert']
    },
    {
        id: 'zweck',
        navLabel: 'Zweck',
        eyebrow: '04 · Zweck',
        title: 'Warum ich diese Anwendung gebaut habe',
        description: 'Ich wollte verstehen, wie Anmeldung und Synchronisation technisch funktionieren und gleichzeitig einen Ort schaffen, an dem Erkenntnisse aus Büchern, Videos und Dateien gespeichert und später direkt angewendet werden können.',
        kind: 'text',
        icon: 'target',
        points: ['Wissen nicht nur sammeln, sondern anwenden', 'Erkenntnisse dauerhaft sichern', 'Auf mehreren Geräten weiterarbeiten']
    }
];

const IDEA_CAPTURE_DETAILS = [
    {
        title: 'Android Studio',
        label: 'App-Aufbau',
        icon: 'smartphone',
        preview: 'assets/projects/idea-capture/details/android-studio.webp',
        description: 'Hier zeige ich die Projektstruktur, die WebView-Integration und die Verbindung zwischen Web-App und Android-Hülle.'
    },
    {
        title: 'Firebase',
        label: 'Cloud & Anmeldung',
        icon: 'database-zap',
        preview: 'assets/projects/idea-capture/details/firebase.webp',
        description: 'Google Sign-In, gespeicherte Daten und die Synchronisation zwischen Smartphone, Tablet und Webansicht.'
    },
    {
        title: 'Motivation',
        label: 'Warum dieses Projekt',
        icon: 'lightbulb',
        preview: '',
        description: 'Ich wollte Google-Anmeldung, Firebase und Android Studio nicht nur theoretisch verstehen, sondern in einer Anwendung einsetzen, die ich selbst täglich für Ideen aus Büchern, Videos und Dateien nutzen kann.'
    }
];

const NIVORA_PROJECT_DETAILS = [
    {
        title: 'Ein gemeinsames System',
        label: 'Produktidee',
        icon: 'network',
        description: 'Nivora verbindet Ziele, Fähigkeiten, Fokus, Belohnungen und persönliche Entwicklung in einem zusammenhängenden Ablauf.'
    },
    {
        title: 'Erfahrungen zusammengeführt',
        label: 'Entwicklung',
        icon: 'blocks',
        description: 'In diesem Projekt nutze ich die wichtigsten Erkenntnisse aus meinen vorherigen Web-, Android- und Produktprojekten gemeinsam.'
    },
    {
        title: 'Modulare Struktur',
        label: 'Technik',
        icon: 'folder-tree',
        description: 'Die Anwendung besteht aus getrennten Bereichen, Dateien und Modulen, damit neue Funktionen kontrolliert ergänzt werden können.'
    },
    {
        title: 'Wirkung wird gemessen',
        label: 'Aktueller Stand',
        icon: 'chart-no-axes-combined',
        description: 'Die Anwendung ist noch roh. Aktuell sammle ich Daten, um später ehrlich zeigen zu können, wie stark sie meine Lerneffizienz verbessert hat.'
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
            ...match,
            ...defaultProject,
            id: defaultProject.id,
            showcaseKey: defaultProject.showcaseKey,
            img: match.img || defaultProject.img,
            learned: defaultProject.learned || match.learned || '',
            highlights: [...defaultProject.highlights]
        };
    });

    const ignoredLegacyTitles = new Set(['habit tracker']);
    const custom = migratedSource
        .filter(item => !usedItems.has(item))
        .filter(item => !ignoredLegacyTitles.has(normalizeProjectTitle(item.title)))
        .map(item => ({ ...item }));

    return [...curated, ...custom];
}
