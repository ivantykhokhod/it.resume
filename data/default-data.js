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
    let raw = String(value || '').trim();
    if (!raw || raw === '#') return '#';

    // Exported document links may still point to a folder on a Windows PC.
    // Resolve packaged PDFs relative to this site, also on GitHub project pages.
    const localPath = raw.replace(/\\/g, '/');
    if (/^(?:file:|[a-z]:\/)/i.test(localPath)) {
        const documentPath = localPath.match(/(?:^|\/)(assets\/documents\/.+)$/i);
        if (documentPath) raw = documentPath[1];
    }

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

const ABOUT_CATALOG_REVISION = 2;
const LEGACY_ABOUT_SKILL_IDS = new Set([
    'skill-prompting',
    'skill-vibe-coding',
    'skill-lernen',
    'skill-planung',
    'skill-reflexion',
    'skill-frontend',
    'skill-ui-ux-design',
    'skill-backend',
    'skill-problem-solving'
]);
const LEGACY_ABOUT_PRINCIPLE_IDS = new Set([
    'principle-offen',
    'principle-aufgeschlossen',
    'principle-zuverlaessig',
    'principle-organisiert',
    'principle-teamfaehig',
    'principle-zielstrebig',
    'principle-freundlich',
    'principle-flexibel',
    'principle-systematisch',
    'principle-selbststaendig',
    'principle-kommunikativ',
    'principle-positiv',
    'principle-optimistisch',
    'principle-ehrlich',
    'principle-hilfsbereit',
    'principle-kreativ',
    'principle-dankbar',
    'principle-friedlich',
    'principle-tolerant',
    'principle-kritikfaehig',
    'principle-fuehrungsbereit',
    'principle-krisenfest',
    'principle-herausforderungsbereit',
    'principle-verantwortungsbereit',
    'principle-froehlich',
    'principle-tatkraeftig',
    'principle-mitmenschlich',
    'principle-integer'
]);

function getDefaultAboutData() {
    return {
        catalogRevision: ABOUT_CATALOG_REVISION,
        content: {
            sectionTitle: 'Über mich',
            profileTitle: 'Kurzprofil',
            moreButtonLabel: 'Mehr',
            focusLabel: 'Mein Fokus',
            factsTitle: 'Kurz & wichtig',
            principlesTitle: 'Werte & Prinzipien',
            principlesButtonLabel: 'Alle',
            skillsTitle: 'Kernfähigkeiten',
            skillsButtonLabel: 'Alle',
            drawerTitle: 'Über mich',
            drawerKicker: '01 / PROFIL',
            principlesDrawerTitle: 'Werte & Prinzipien',
            skillsDrawerTitle: 'Alle Fähigkeiten',
            locationTitle: 'Standort',
            locationActionLabel: 'In Google Maps öffnen',
            availabilityTitle: 'Kontakt & Verfügbarkeit',
            directContactTitle: 'Direkter Kontakt',
            socialContactTitle: 'Messenger / Social',
            contactNoteTitle: 'Erreichbarkeit',
            qrTitle: 'QR / Schnellzugriff',
            qrPlaceholderHint: 'QR-Code folgt'
        },
        introShort: "Ich bin eine zielstrebige Person mit einer Leidenschaft für Technologie, effiziente Lernmethoden, Planungssysteme und Neurologie.",
        introFull: "Mein Fokus liegt auf dem Aufbau moderner, leistungsfähiger und benutzerfreundlicher Webanwendungen sowie auf kontinuierlicher Weiterentwicklung. Ich liebe es, komplexe Probleme zu lösen, sauberen Code zu schreiben und Ideen in funktionierende digitale Produkte zu verwandeln.",
        focusSlides: [
            { id: 'focus-current', icon: 'cpu', title: 'Aktueller Fokus', text: 'KI, Automatisierung & digitale Produkte' },
            { id: 'focus-workflow', icon: 'workflow', title: 'Meine Arbeitsweise', text: 'Verstehen → planen → umsetzen → verbessern' },
            { id: 'focus-interests', icon: 'brain', title: 'Meine Interessen', text: 'Effiziente Lernmethoden, Planungssysteme & Neurologie' }
        ],
        facts: [
            { id: 'fact-standort', icon: 'map-pin', label: 'Standort', value: 'Kehl 77694, Baden-Württemberg, Deutschland', action: 'location', pinned: true },
            { id: 'fact-sprachen', icon: 'languages', label: 'Sprachen', value: 'Ukrainisch, Russisch, Deutsch B2, Englisch B1', pinned: true },
            { id: 'fact-technologien', icon: 'code', label: 'Technologien', value: 'Wird aktuell ergänzt.', pinned: true },
            { id: 'fact-verfuegbarkeit', icon: 'calendar', label: 'Verfügbarkeit', value: 'Aktuell offen für neue Projekte', action: 'contact', pinned: true }
        ],
        skills: [
            {
                id: 'skill-prompting',
                title: 'Prompting',
                desc: 'Ich formuliere klare Aufgaben für KI-Systeme, prüfe die Ergebnisse und verbessere meine Anweisungen Schritt für Schritt.',
                fullText: 'Beim Prompting versuche ich zuerst genau zu verstehen, welches Ergebnis ich brauche. Dann gebe ich der KI den nötigen Kontext, klare Grenzen und ein passendes Format. Das erste Ergebnis übernehme ich nicht einfach, sondern prüfe es und verbessere meine Anweisung so lange, bis es wirklich zur Aufgabe passt.',
                application: 'Ich nutze das vor allem für Projektplanung, Code, Recherche, Struktur und Texte.',
                development: 'Ich teste unterschiedliche Formulierungen und achte stärker darauf, warum ein Ergebnis gut oder schlecht geworden ist.',
                icon: 'message-square-code',
                tags: ['KI', 'Analyse', 'Struktur'],
                levelLabel: 'Obere Mittelstufe',
                level: 4,
                evidence: [],
                pinned: true
            },
            {
                id: 'skill-vibe-coding',
                title: 'KI-gestützte Entwicklung',
                desc: 'Ich setze Ideen mit KI-Unterstützung als funktionierende erste Version um und verbessere sie durch Tests und klare Rückmeldungen.',
                fullText: 'Ich nutze KI, um aus einer Idee schneller eine funktionierende erste Version zu bauen. Danach prüfe ich, was wirklich funktioniert, beschreibe Fehler möglichst genau und verbessere das Ergebnis in kleinen Schritten. Bei kompliziertem Code brauche ich noch Unterstützung, deshalb teste ich Änderungen bewusst und versuche die Logik dahinter zu verstehen.',
                application: 'Vor allem bei eigenen Webseiten, kleinen Funktionen und digitalen Prototypen.',
                development: 'Ich lerne, Aufgaben technischer zu beschreiben, Code besser zu prüfen und Fehler selbstständiger einzugrenzen.',
                icon: 'bot',
                tags: ['KI', 'Code', 'Prototyping'],
                levelLabel: 'Mittelstufe',
                level: 3,
                evidence: [],
                pinned: true
            },
            {
                id: 'skill-lernen',
                title: 'Strukturiertes Lernen',
                desc: 'Ich teile neue Themen in kleine Schritte, probiere sie praktisch aus und passe meinen Lernweg an, wenn etwas nicht funktioniert.',
                fullText: 'Wenn ich etwas Neues lerne, teile ich das Thema zuerst in kleinere Teile. Ich versuche das Gelernte möglichst schnell praktisch anzuwenden und prüfe, wo noch Lücken sind. Wenn eine Methode nicht funktioniert, halte ich nicht stur daran fest, sondern suche einen anderen Weg.',
                application: 'Sprachen, KI, technische Themen, Kommunikation und eigene Projekte.',
                development: 'Ich arbeite daran, regelmäßiger zu wiederholen und weniger Themen gleichzeitig anzufangen.',
                icon: 'brain',
                tags: ['Struktur', 'Analyse', 'Praxis'],
                levelLabel: 'Obere Mittelstufe',
                level: 4,
                evidence: [],
                pinned: true
            },
            {
                id: 'skill-planung',
                title: 'Planung & Priorisierung',
                desc: 'Ich zerlege größere Ziele in konkrete nächste Schritte und entscheide, was zuerst wirklich wichtig ist.',
                fullText: 'Bei größeren Zielen brauche ich einen klaren Überblick. Ich teile sie in machbare Schritte, lege eine Reihenfolge fest und versuche nicht, alles gleichzeitig zu erledigen. Meine Planung passe ich an, wenn ich merke, dass sie im Alltag nicht realistisch ist.',
                application: 'Projektarbeit, Lernen, persönliche Ziele und die Planung meiner nächsten Schritte.',
                development: 'Ich übe, Pläne einfacher zu halten und früher zwischen wichtig und nur interessant zu unterscheiden.',
                icon: 'calendar-check',
                tags: ['Prioritäten', 'Routinen', 'Ziele'],
                levelLabel: 'Obere Mittelstufe',
                level: 4,
                evidence: [],
                pinned: true
            },
            {
                id: 'skill-reflexion',
                title: 'Analyse & Reflexion',
                desc: 'Ich schaue regelmäßig, was funktioniert, wo ich Fehler mache und was ich beim nächsten Versuch anders machen sollte.',
                fullText: 'Nach wichtigen Aufgaben oder Entscheidungen schaue ich zurück: Was hat funktioniert, was nicht und warum? Dabei versuche ich ehrlich zu bleiben und nicht nur Erklärungen zu suchen. Aus diesen Beobachtungen leite ich konkrete Änderungen für den nächsten Versuch ab.',
                application: 'Eigene Projekte, Lernen, Kommunikation und persönliche Organisation.',
                development: 'Ich möchte Erkenntnisse schneller in kleine, konkrete Veränderungen umsetzen.',
                icon: 'scan-eye',
                tags: ['Analyse', 'Entwicklung', 'Bewusstsein'],
                levelLabel: 'Obere Mittelstufe',
                level: 4,
                evidence: [],
                pinned: true
            },
            {
                id: 'skill-3d-visualisierung',
                title: '3D-Visualisierung',
                desc: 'Ich habe Erfahrung mit 3D-Modellierung, Architekturvisualisierung und Rendering und kann einfache bis mittlere Szenen selbstständig umsetzen.',
                fullText: 'Ich habe mich ungefähr ein Jahr mit 3D-Visualisierung beschäftigt. Dabei habe ich Modelle, Materialien, Licht und Kameras eingesetzt, um Architektur und Räume verständlich darzustellen. Nicht jeder Bereich sitzt schon sicher, aber einfache bis mittlere Szenen kann ich selbstständig aufbauen und weiterentwickeln.',
                application: 'Architekturvisualisierung, einfache Innen- und Außenszenen, Modellierung und Rendering.',
                development: 'Ich möchte meine Kenntnisse bei Materialien, Licht und realistischen Renderings wieder auffrischen und vertiefen.',
                icon: 'box',
                tags: ['3D', 'Architektur', 'Rendering'],
                levelLabel: 'Mittelstufe',
                level: 3,
                evidence: [],
                pinned: false
            },
            {
                id: 'skill-html',
                title: 'HTML',
                desc: 'Ich kann Seiten sauber strukturieren, Inhalte gliedern und einfache Elemente selbst umsetzen. Bei komplexeren Lösungen brauche ich noch Unterstützung.',
                fullText: 'Ich verstehe den grundlegenden Aufbau einer HTML-Seite und kann Inhalte mit passenden Elementen strukturieren. Einfache Bereiche, Links, Bilder, Formulare und Textstrukturen kann ich selbst umsetzen. Bei größeren oder technisch komplizierten Lösungen arbeite ich noch mit Unterstützung.',
                application: 'Einfache Webseiten, Inhaltsstruktur und kleinere Änderungen an bestehenden Seiten.',
                development: 'Ich lerne mehr über semantisches HTML, Barrierefreiheit und saubere Formulare.',
                icon: 'code-xml',
                tags: ['HTML', 'Struktur', 'Web'],
                levelLabel: 'Grundlagen',
                level: 2,
                evidence: [],
                pinned: false
            },
            {
                id: 'skill-produktkonzeption',
                title: 'Produktkonzeption & Prototyping',
                desc: 'Ich entwickle aus einer Idee eine klare Struktur, wähle die wichtigsten Funktionen aus und baue daraus einen testbaren Prototypen.',
                fullText: 'Bei einer neuen Idee versuche ich zuerst zu klären, welches Problem sie lösen soll und was für eine erste Version wirklich nötig ist. Danach ordne ich Inhalte und Funktionen und baue einen Prototypen, an dem man die Idee prüfen kann. So erkenne ich früher, was sinnvoll ist und was nur zusätzliche Arbeit macht.',
                application: 'Eigene digitale Projekte, Webseiten, Funktionskonzepte und erste testbare Versionen.',
                development: 'Ich arbeite daran, früher mit echten Nutzern zu testen und erste Versionen noch kleiner zu halten.',
                icon: 'blocks',
                tags: ['Konzept', 'MVP', 'Prototyping'],
                levelLabel: 'Mittelstufe',
                level: 3,
                evidence: [],
                pinned: false
            },
            {
                id: 'skill-prozessoptimierung',
                title: 'Prozessoptimierung',
                desc: 'Ich erkenne unnötige Schritte und versuche Abläufe einfacher, klarer und schneller zu machen. Das nutze ich vor allem bei eigenen Projekten und Lernsystemen.',
                fullText: 'Wenn ein Ablauf zu lange dauert oder unnötig kompliziert ist, schaue ich mir die einzelnen Schritte an. Ich versuche Wiederholungen, unklare Übergaben und vermeidbare Arbeit zu finden und den Prozess einfacher zu machen. Meine meiste Erfahrung damit kommt aus eigenen Projekten und Lernsystemen.',
                application: 'Projektabläufe, persönliche Organisation, Lernsysteme und wiederkehrende Aufgaben.',
                development: 'Ich möchte Verbesserungen häufiger mit konkreten Zahlen oder klaren Vorher-nachher-Vergleichen prüfen.',
                icon: 'workflow',
                tags: ['Abläufe', 'Struktur', 'Effizienz'],
                levelLabel: 'Mittelstufe',
                level: 3,
                evidence: [],
                pinned: false
            }
        ],
        principles: [
            { id: 'principle-offen', title: 'Offen', desc: 'Ich höre mir andere Meinungen erst einmal an, auch wenn sie nicht zu meiner passen. Wenn mich ein Argument überzeugt, kann ich meine Meinung ändern.', icon: 'message-circle', pinned: true },
            { id: 'principle-zuverlaessig', title: 'Zuverlässig', desc: 'Wenn ich etwas zusage, versuche ich es auch einzuhalten. Falls etwas nicht klappt, sage ich lieber früh Bescheid, statt mich einfach nicht mehr zu melden.', icon: 'shield-check', pinned: true },
            { id: 'principle-organisiert', title: 'Organisiert', desc: 'Ich halte Aufgaben und nächste Schritte gern fest, weil ich nicht alles im Kopf behalten will. Mit einer klaren Ordnung arbeite ich ruhiger und vergesse weniger.', icon: 'folder', pinned: true },
            { id: 'principle-teamfaehig', title: 'Teamfähig', desc: 'Ich arbeite gern selbstständig, komme aber auch im Team gut zurecht. Mir ist wichtig, dass jeder weiß, was er übernimmt, und dass man offen miteinander spricht.', icon: 'users', pinned: true },
            { id: 'principle-zielstrebig', title: 'Zielstrebig', desc: 'Wenn mir ein Ziel wirklich wichtig ist, bleibe ich dran, auch wenn es langsamer geht als geplant. Ich versuche, nicht bei jeder Schwierigkeit die Richtung zu wechseln.', icon: 'target', pinned: true },
            { id: 'principle-flexibel', title: 'Flexibel', desc: 'Pläne laufen selten genau so, wie man sie gemacht hat. Ich kann meinen Weg anpassen, ohne das eigentliche Ziel aus den Augen zu verlieren.', icon: 'shuffle', pinned: false },
            { id: 'principle-systematisch', title: 'Systematisch', desc: 'Bei größeren Aufgaben brauche ich eine klare Struktur. Ich teile sie in kleinere Schritte und schaue zuerst, wo das eigentliche Problem liegt.', icon: 'list-checks', pinned: false },
            { id: 'principle-selbststaendig', title: 'Selbstständig', desc: 'Ich versuche ein Problem zuerst selbst zu verstehen und eine Lösung zu finden. Wenn ich Hilfe brauche, frage ich gezielt nach.', icon: 'user-check', pinned: false },
            { id: 'principle-kommunikativ', title: 'Kommunikativ', desc: 'Ich sage lieber klar, was ich verstanden habe, was noch offen ist und wo es ein Problem gibt. Manchmal bin ich dabei etwas direkt.', icon: 'messages-square', pinned: false },
            { id: 'principle-ehrlich', title: 'Ehrlich', desc: 'Ich will nichts besser darstellen, als es wirklich ist. Bei Fehlern, Wissen und Fortschritt sage ich lieber ehrlich, wo ich gerade stehe.', icon: 'badge-check', pinned: false },
            { id: 'principle-hilfsbereit', title: 'Hilfsbereit', desc: 'Wenn ich jemandem sinnvoll helfen kann, mache ich das gern. Dabei ist mir wichtig, Menschen respektvoll zu behandeln und nicht nur auf den eigenen Vorteil zu schauen.', icon: 'hand-heart', pinned: false },
            { id: 'principle-kreativ', title: 'Kreativ', desc: 'Ich probiere gern andere Wege aus, wenn eine normale Lösung nicht richtig passt. Kreativität bedeutet für mich nicht nur Design, sondern auch praktische Ideen.', icon: 'sparkles', pinned: false },
            { id: 'principle-dankbar', title: 'Dankbar', desc: 'Ich weiß, dass ich vieles nicht allein erreicht habe. Menschen, Chancen und auch schwierige Erfahrungen haben mir geholfen, weiterzukommen.', icon: 'heart', pinned: false },
            { id: 'principle-kritikfaehig', title: 'Kritikfähig', desc: 'Kritik ist nicht immer angenehm, aber ich versuche zuzuhören und sie ehrlich zu prüfen. Wenn etwas stimmt, will ich es auch ändern.', icon: 'refresh-cw', pinned: false },
            { id: 'principle-fuehrungsbereit', title: 'Führungsbereit', desc: 'Ich übernehme Führung, wenn sie gebraucht wird und ich wirklich helfen kann. Dabei will ich nicht alles kontrollieren, sondern Klarheit schaffen und Verantwortung übernehmen.', icon: 'flag', pinned: false },
            { id: 'principle-krisenfest', title: 'Ruhig unter Druck', desc: 'Wenn es stressig wird, versuche ich zuerst ruhig zu bleiben und die Situation zu sortieren. Das klappt nicht immer sofort, aber Hektik macht es meistens nur schlimmer.', icon: 'anchor', pinned: false },
            { id: 'principle-verantwortungsbereit', title: 'Verantwortungsbewusst', desc: 'Wenn ich eine Aufgabe übernehme, gehören auch Fehler dazu. Ich schaue zuerst, was ich selbst besser machen kann, bevor ich anderen die Schuld gebe.', icon: 'clipboard-check', pinned: false },
            { id: 'principle-tatkraeftig', title: 'Tatkräftig', desc: 'Ich plane gern, aber irgendwann muss man anfangen. Ich mache lieber eine brauchbare erste Version und verbessere sie danach Schritt für Schritt.', icon: 'zap', pinned: false },
            { id: 'principle-lernbereitschaft', title: 'Lernbereitschaft', desc: 'Ich lerne gern neue Dinge, besonders wenn ich sie direkt ausprobieren kann. Ich teile ein Thema in kleine Teile und arbeite mich Schritt für Schritt hinein.', icon: 'book-open-check', pinned: false },
            { id: 'principle-ungeduld', title: 'Ungeduld', desc: 'Ich werde schnell ungeduldig, wenn ich lange auf andere warten muss oder das Gefühl habe, dass Zeit verloren geht. Oft will ich lieber sofort anfangen und möglichst schnell ein Ergebnis sehen.', icon: 'timer', pinned: false },
            { id: 'principle-perfektionismus', title: 'Perfektionismus', desc: 'Ich neige dazu, Dinge länger zu verbessern, als es eigentlich nötig wäre. Inzwischen versuche ich bewusster zu erkennen, wann ein Ergebnis gut genug ist und weitere Arbeit kaum noch etwas bringt.', icon: 'crosshair', pinned: false }
        ],
        homepagePrincipleIds: [
            'principle-zuverlaessig',
            'principle-verantwortungsbereit',
            'principle-selbststaendig',
            'principle-teamfaehig',
            'principle-kommunikativ',
            'principle-organisiert',
            'principle-systematisch',
            'principle-zielstrebig',
            'principle-kritikfaehig'
        ],
        homepageSkillIds: [
            'skill-prompting',
            'skill-vibe-coding',
            'skill-lernen',
            'skill-planung',
            'skill-reflexion'
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
        ],
        contact: {
            layoutVersion: 2,
            mapUrl: 'https://www.google.com/maps/search/?api=1&query=Kehl%2077694%20Baden-W%C3%BCrttemberg%20Deutschland',
            note: 'Am besten bin ich per Telegram oder E-Mail erreichbar. Auf WhatsApp antworte ich meistens auch schnell. Bei Instagram kann es etwas länger dauern.',
            direct: [
                { id: 'contact-phone', label: 'Telefon', value: '+49 174 206 2137', url: 'tel:+491742062137', icon: 'phone' },
                { id: 'contact-email-primary', label: 'E-Mail', value: 'ivantykhokhod@gmail.com', url: 'mailto:ivantykhokhod@gmail.com', icon: 'mail' },
                { id: 'contact-email-secondary', label: 'Alternative E-Mail', value: 'ivansredmi12@gmail.com', url: 'mailto:ivansredmi12@gmail.com', icon: 'mail' }
            ],
            socials: [
                { id: 'social-instagram', platform: 'Instagram', value: '@ivan.tykhokhod', url: 'https://www.instagram.com/ivan.tykhokhod', icon: 'instagram', qrImage: '', qrSide: 'left', isPlaceholder: false },
                { id: 'social-future', platform: 'Später hinzufügen', value: '', url: '#', icon: 'plus', qrImage: '', qrSide: 'left', isPlaceholder: true },
                { id: 'social-telegram', platform: 'Telegram', value: '@visualisierer', url: 'https://t.me/visualisierer', icon: 'send', qrImage: '', qrSide: 'right', isPlaceholder: false },
                { id: 'social-whatsapp', platform: 'WhatsApp', value: '+380 68 019 5206', url: 'https://wa.me/380680195206', icon: 'message-circle', qrImage: '', qrSide: 'right', isPlaceholder: false }
            ]
        },
        layout: {
            sectionPadding: 64,
            shellWidth: 94,
            shellMaxWidth: 1800,
            framePadding: 24,
            contentInset: 32,
            profileWidth: 28,
            mainGap: 16,
            panelPadding: 16,
            principleMinHeight: 43,
            skillMinHeight: 104
        },
        removedItems: {
            facts: [],
            principles: [],
            skills: [],
            moreSections: []
        }
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

function mergeFacts(existingFacts, defaultFacts, removedIds = []) {
    const result = [];
    const usedLabels = new Set();
    const usedIds = new Set();
    const removed = new Set(Array.isArray(removedIds) ? removedIds.map(String) : []);
    const defaultByLabel = new Map(
        defaultFacts.map(fact => [normalizeFactLabel(fact.label), fact])
    );
    const defaultById = new Map(
        defaultFacts.filter(fact => fact?.id).map(fact => [String(fact.id), fact])
    );

    if (Array.isArray(existingFacts)) {
        existingFacts.forEach(fact => {
            if (!fact || typeof fact !== 'object') return;
            if (fact.id && removed.has(String(fact.id))) return;

            const labelKey = normalizeFactLabel(fact.label);
            if (!labelKey) {
                result.push(cloneData(fact));
                return;
            }
            if (usedLabels.has(labelKey)) return;

            const factId = String(fact.id || '');
            if (factId && usedIds.has(factId)) return;
            const fallback = defaultById.get(factId) || defaultByLabel.get(labelKey) || {};
            const mergedFact = { ...cloneData(fallback), ...cloneData(fact) };
            const hasOwnValue = Object.prototype.hasOwnProperty.call(fact, 'value');
            const shouldUseDefaultValue = fallback.value && (!hasOwnValue || isLegacyDefaultFactValue(fallback.label || fact.label, fact.value));

            if (shouldUseDefaultValue) {
                mergedFact.value = fallback.value;
            }

            result.push(mergedFact);
            usedLabels.add(labelKey);
            if (factId) usedIds.add(factId);
        });
    }

    defaultFacts.forEach(defaultFact => {
        if (defaultFact.id && removed.has(String(defaultFact.id))) return;
        if (defaultFact.id && usedIds.has(String(defaultFact.id))) return;
        const labelKey = normalizeFactLabel(defaultFact.label);
        if (!usedLabels.has(labelKey)) {
            result.push(cloneData(defaultFact));
            usedLabels.add(labelKey);
            if (defaultFact.id) usedIds.add(String(defaultFact.id));
        }
    });

    return result;
}


function mergeAboutItemsById(existingItems, defaultItems, removedIds = []) {
    const safeDefaults = Array.isArray(defaultItems) ? defaultItems : [];
    const removed = new Set(Array.isArray(removedIds) ? removedIds.map(String) : []);
    if (!Array.isArray(existingItems) || existingItems.length === 0) {
        return cloneData(safeDefaults.filter(item => !item?.id || !removed.has(String(item.id))));
    }

    const result = [];
    const usedIds = new Set();
    const defaultsById = new Map(safeDefaults
        .filter(item => item && typeof item === 'object' && item.id)
        .map(item => [String(item.id), item]));

    existingItems.forEach(existing => {
        if (!existing || typeof existing !== 'object' || !existing.id) return;
        const itemId = String(existing.id);
        if (removed.has(itemId) || usedIds.has(itemId)) return;
        const fallback = defaultsById.get(itemId);
        if (fallback) {
            result.push({
                ...cloneData(fallback),
                ...cloneData(existing),
                title: isFilledText(existing.title) ? existing.title : fallback.title,
                desc: typeof existing.desc === 'string' ? existing.desc : fallback.desc
            });
        } else {
            result.push(cloneData(existing));
        }
        usedIds.add(itemId);
    });

    safeDefaults.forEach(defaultItem => {
        if (!defaultItem || typeof defaultItem !== 'object' || !defaultItem.id) return;
        const itemId = String(defaultItem.id);
        if (removed.has(itemId) || usedIds.has(itemId)) return;
        result.push(cloneData(defaultItem));
        usedIds.add(itemId);
    });

    return result.length > 0
        ? result
        : cloneData(safeDefaults.filter(item => !removed.has(String(item?.id || ''))));
}

function migrateAboutCatalog(existingItems, defaultItems, removedIds, legacyIds, sourceRevision) {
    if (sourceRevision >= ABOUT_CATALOG_REVISION) {
        return mergeAboutItemsById(existingItems, defaultItems, removedIds);
    }

    const removed = new Set(Array.isArray(removedIds) ? removedIds.map(String) : []);
    const defaults = Array.isArray(defaultItems) ? defaultItems : [];
    const defaultIds = new Set(defaults.map(item => String(item?.id || '')).filter(Boolean));
    const customItems = (Array.isArray(existingItems) ? existingItems : [])
        .filter(item => {
            const itemId = String(item?.id || '');
            return itemId
                && !removed.has(itemId)
                && !legacyIds.has(itemId)
                && !defaultIds.has(itemId);
        })
        .map(cloneData);

    return [
        ...defaults
            .filter(item => !item?.id || !removed.has(String(item.id)))
            .map(cloneData),
        ...customItems
    ];
}

function mergeAboutMoreSections(existingSections, defaultSections, removedIds = []) {
    const result = [];
    const usedIds = new Set();
    const removed = new Set(Array.isArray(removedIds) ? removedIds.map(String) : []);
    const defaultsById = new Map(
        defaultSections.map(section => [section.id, section])
    );

    if (Array.isArray(existingSections)) {
        existingSections.forEach(section => {
            if (!section || typeof section !== 'object' || !section.id) return;
            if (removed.has(String(section.id))) return;
            if (usedIds.has(section.id)) return;

            const fallback = defaultsById.get(section.id) || {};
            result.push({ ...cloneData(fallback), ...cloneData(section) });
            usedIds.add(section.id);
        });
    }

    defaultSections.forEach(defaultSection => {
        if (defaultSection.id && removed.has(String(defaultSection.id))) return;
        if (!usedIds.has(defaultSection.id)) {
            result.push(cloneData(defaultSection));
            usedIds.add(defaultSection.id);
        }
    });

    return result.length > 0 ? result : cloneData(defaultSections);
}

function clampAboutNumber(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, Math.round(numeric)));
}

function normalizeAboutTextMap(value, fallback) {
    const source = value && typeof value === 'object' ? value : {};
    return Object.fromEntries(Object.entries(fallback).map(([key, defaultValue]) => [
        key,
        typeof source[key] === 'string' ? source[key] : defaultValue
    ]));
}

function normalizeAboutRemovedItems(value) {
    const source = value && typeof value === 'object' ? value : {};
    const normalizeIds = ids => Array.isArray(ids)
        ? [...new Set(ids.map(id => String(id || '').trim()).filter(Boolean))]
        : [];
    return {
        facts: normalizeIds(source.facts),
        principles: normalizeIds(source.principles),
        skills: normalizeIds(source.skills),
        moreSections: normalizeIds(source.moreSections)
    };
}

function normalizeAboutFocusSlides(value, fallback) {
    const source = Array.isArray(value) ? value : fallback;
    const normalized = source
        .filter(item => item && typeof item === 'object')
        .slice(0, 8)
        .map((item, index) => ({
            id: String(item.id || `focus-${index + 1}`),
            icon: normalizeIconName(item.icon, 'circle'),
            title: String(item.title || '').trim(),
            text: String(item.text || '').trim()
        }));
    return normalized.length ? normalized : cloneData(fallback);
}

function inferAboutQrSide(item) {
    const identity = `${item?.id || ''} ${item?.platform || item?.label || ''}`.toLowerCase();
    if (identity.includes('instagram')) return 'left';
    if (identity.includes('telegram') || identity.includes('whatsapp')) return 'right';
    return 'none';
}

function normalizeAboutQrSide(value, item, fallbackItem) {
    const side = String(value || fallbackItem?.qrSide || '').toLowerCase();
    return ['left', 'right', 'none'].includes(side) ? side : inferAboutQrSide(item);
}

function normalizeAboutContactList(value, fallback, type) {
    const source = Array.isArray(value) ? value : fallback;
    const fallbackItems = Array.isArray(fallback) ? fallback : [];
    return source
        .filter(item => item && typeof item === 'object')
        .slice(0, 20)
        .map((item, index) => {
            const isSocial = type === 'social';
            const fallbackItem = fallbackItems.find(candidate => String(candidate?.id || '') === String(item.id || ''));
            return {
                id: String(item.id || `${type}-${index + 1}`),
                ...(isSocial
                    ? { platform: String(item.platform || item.label || 'Plattform').trim() }
                    : { label: String(item.label || 'Kontakt').trim() }),
                value: String(item.value || '').trim(),
                url: getSafeLinkUrl(item.url || '#'),
                icon: normalizeIconName(item.icon, isSocial ? 'link' : 'contact'),
                ...(isSocial ? {
                    qrImage: getSafeImageUrl(item.qrImage),
                    qrSide: normalizeAboutQrSide(item.qrSide, item, fallbackItem),
                    isPlaceholder: typeof item.isPlaceholder === 'boolean'
                        ? item.isPlaceholder
                        : fallbackItem?.isPlaceholder === true
                } : {})
            };
        });
}

function normalizeAboutContact(value, fallback) {
    const source = value && typeof value === 'object' ? value : {};
    const sourceLayoutVersion = Number(source.layoutVersion) || 0;
    const direct = normalizeAboutContactList(source.direct, fallback.direct, 'contact');
    const socials = normalizeAboutContactList(source.socials, fallback.socials, 'social');

    if (sourceLayoutVersion < 2 && Array.isArray(source.socials)) {
        const fallbackPlaceholder = fallback.socials.find(item => item?.isPlaceholder === true);
        const hasPlaceholder = socials.some(item => item.isPlaceholder === true || item.id === fallbackPlaceholder?.id);
        if (fallbackPlaceholder && !hasPlaceholder) {
            const normalizedPlaceholder = normalizeAboutContactList([fallbackPlaceholder], fallback.socials, 'social')[0];
            const lastLeftIndex = socials.reduce((lastIndex, item, index) => item.qrSide === 'left' ? index : lastIndex, -1);
            socials.splice(lastLeftIndex + 1, 0, normalizedPlaceholder);
        }
    }

    const occupiedSlots = { left: 0, right: 0 };
    socials.forEach(item => {
        if (!['left', 'right'].includes(item.qrSide)) return;
        occupiedSlots[item.qrSide] += 1;
        if (occupiedSlots[item.qrSide] > 2) item.qrSide = 'none';
    });

    return {
        layoutVersion: 2,
        mapUrl: getSafeLinkUrl(source.mapUrl || fallback.mapUrl),
        note: typeof source.note === 'string' ? source.note : fallback.note,
        direct,
        socials
    };
}

function normalizeAboutLayout(value, fallback) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        sectionPadding: clampAboutNumber(source.sectionPadding, fallback.sectionPadding, 24, 112),
        shellWidth: clampAboutNumber(source.shellWidth, fallback.shellWidth, 78, 100),
        shellMaxWidth: clampAboutNumber(source.shellMaxWidth, fallback.shellMaxWidth, 1180, 2100),
        framePadding: clampAboutNumber(source.framePadding, fallback.framePadding, 10, 40),
        contentInset: clampAboutNumber(source.contentInset, fallback.contentInset, 0, 64),
        profileWidth: clampAboutNumber(source.profileWidth, fallback.profileWidth, 27, 44),
        mainGap: clampAboutNumber(source.mainGap, fallback.mainGap, 8, 36),
        panelPadding: clampAboutNumber(source.panelPadding, fallback.panelPadding, 10, 30),
        principleMinHeight: clampAboutNumber(source.principleMinHeight, fallback.principleMinHeight, 38, 72),
        skillMinHeight: clampAboutNumber(source.skillMinHeight, fallback.skillMinHeight, 88, 160)
    };
}

function normalizeAboutFeaturedIds(value, items, fallback, limit) {
    const validIds = new Set((Array.isArray(items) ? items : []).map(item => String(item?.id || '')).filter(Boolean));
    const source = Array.isArray(value) ? value : fallback;
    const normalized = [...new Set(source.map(id => String(id || '')).filter(id => validIds.has(id)))].slice(0, limit);
    if (Array.isArray(value) || normalized.length) return normalized;
    return (Array.isArray(items) ? items : []).slice(0, limit).map(item => String(item.id));
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
    const sourceCatalogRevision = Number(source.catalogRevision) || 0;
    const hadFactsArray = Array.isArray(source.facts);
    const migrated = { ...source };
    const removedItems = normalizeAboutRemovedItems(source.removedItems);
    const legacyIntroShort = 'Ich bin eine zielstrebige Person mit einer Leidenschaft für Programmierung, Technologie und visuelle Gestaltung.';
    const previousIntroShort = 'Ich bin eine zielstrebige Person mit einer Leidenschaft für Technologie, Lernen, Neurologie und Psychologie.';
    const sourceIntroShort = firstFilledText(source.introShort, source.p1);
    const previousContactNote = 'Per E-Mail kann ich oft schneller antworten.\nAuf Telegram bin ich in der Regel am besten erreichbar.\nInstagram prüfe ich nicht so häufig.';

    migrated.introShort = !sourceIntroShort || sourceIntroShort === legacyIntroShort || sourceIntroShort === previousIntroShort
        ? defaultAbout.introShort
        : sourceIntroShort;
    migrated.introFull = firstFilledText(source.introFull, source.p2, defaultAbout.introFull);
    migrated.content = normalizeAboutTextMap(source.content, defaultAbout.content);
    migrated.focusSlides = normalizeAboutFocusSlides(source.focusSlides, defaultAbout.focusSlides);
    migrated.facts = mergeFacts(hadFactsArray ? source.facts : defaultAbout.facts, defaultAbout.facts, removedItems.facts);
    migrated.skills = migrateAboutCatalog(source.skills, defaultAbout.skills, removedItems.skills, LEGACY_ABOUT_SKILL_IDS, sourceCatalogRevision);
    migrated.principles = migrateAboutCatalog(source.principles, defaultAbout.principles, removedItems.principles, LEGACY_ABOUT_PRINCIPLE_IDS, sourceCatalogRevision);
    migrated.moreSections = mergeAboutMoreSections(source.moreSections, defaultAbout.moreSections, removedItems.moreSections);
    migrated.homepagePrincipleIds = normalizeAboutFeaturedIds(source.homepagePrincipleIds, migrated.principles, defaultAbout.homepagePrincipleIds, 12);
    migrated.homepageSkillIds = normalizeAboutFeaturedIds(source.homepageSkillIds, migrated.skills, defaultAbout.homepageSkillIds, 8);
    migrated.contact = normalizeAboutContact(source.contact, defaultAbout.contact);
    migrated.layout = normalizeAboutLayout(source.layout, defaultAbout.layout);
    migrated.removedItems = removedItems;
    migrated.catalogRevision = ABOUT_CATALOG_REVISION;

    if (source.content?.directContactTitle === 'Direktkontakt') {
        migrated.content.directContactTitle = defaultAbout.content.directContactTitle;
    }
    if (source.content?.qrPlaceholderHint === 'QR-Code später hinzufügen') {
        migrated.content.qrPlaceholderHint = defaultAbout.content.qrPlaceholderHint;
    }
    if (source.contact?.note === previousContactNote) {
        migrated.contact.note = defaultAbout.contact.note;
    }

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



function getDefaultEducationContent() {
    return {
        sectionTitle: 'Bildung',
        sectionSubtitle: 'Mein Weg – Schritt für Schritt'
    };
}

function getDefaultEducationLayout() {
    return {
        cardWidth: 152,
        cardHeight: 172,
        timelineHeight: 440,
        linePosition: 216,
        goalWidth: 160
    };
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
            text: 'Von 2013 bis 2022 bin ich in der Ukraine zur Schule gegangen und habe dort die Klassen 1 bis 9 abgeschlossen.\nDas war meine normale schulische Grundlage, bevor ich nach Deutschland gekommen bin.',
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
            text: 'Nach meinem Umzug nach Deutschland habe ich am Gymnasium Fulda vor allem Deutsch gelernt.\nVon Januar 2023 bis Februar 2024 bin ich dort ungefähr von A1 auf A2 gekommen und habe mich langsam an den Schulalltag in Deutschland gewöhnt.',
            evidence: [
                { type: 'placeholder', title: 'A2 Nachweis', note: 'Bild/Dokument später hinzufügen', icon: 'file-image' },
                { type: 'placeholder', title: 'Teilnahme am Deutschunterricht', note: 'Nachweis später hinzufügen', icon: 'file-text' }
            ]
        },
        {
            id: 'edu-3d-visualisierung',
            level: '03',
            title: '3D-Visualisierung',
            subtitle: '3D, Architektur, Rendering',
            icon: 'box',
            status: 'Nicht abgeschlossen',
            statusType: 'partial',
            years: '03/2023–03/2024',
            place: 'Online',
            format: 'Kurs',
            topics: '3D, Architektur, Rendering',
            progress: 90,
            clickable: true,
            text: 'Parallel dazu habe ich online einen Kurs für 3D-Visualisierung gemacht. Dort habe ich mit 3D-Modellierung, Architektur und Rendering gearbeitet.\nWegen mehrerer Umzüge konnte ich den Kurs nicht ganz abschließen. Die meisten Inhalte habe ich aber durchgearbeitet und dabei viel praktische Erfahrung gesammelt.',
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
            text: 'Ab September 2023 habe ich meine ukrainische Schule online weitergeführt. Im Juni 2025 habe ich dort die 10. und 11. Klasse abgeschlossen.\nVieles musste ich selbst organisieren, weil ich gleichzeitig in Deutschland zur Schule gegangen bin.',
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
            text: 'Von September 2024 bis Juni 2025 habe ich die Beruflichen Schulen Kehl besucht. Parallel dazu habe ich weiterhin meine ukrainische Schule online gemacht.\nIn Kehl konnte ich mein Deutsch verbessern und besser verstehen, wie Schule und Berufsausbildung in Deutschland funktionieren.',
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
            text: 'Von September 2025 bis Februar 2026 habe ich einen B2-Deutschkurs besucht und erfolgreich abgeschlossen.\nDort habe ich besonders Schreiben, Präsentationen und berufliche Kommunikation geübt. Seitdem kann ich mich im Alltag, in der Schule und bei Bewerbungen deutlich sicherer ausdrücken.',
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
            status: 'Abgeschlossen',
            statusType: 'completed',
            years: '10/2025–08/2026',
            place: 'AFÖG Kehl',
            format: 'Arbeitsvorbereitung',
            topics: 'Bewerbung & Ausbildungsorientierung',
            progress: 100,
            clickable: true,
            text: 'Von Oktober 2025 bis August 2026 war ich bei AFÖG in Kehl zur Arbeitsvorbereitung.\nDort habe ich mich auf eine Ausbildung vorbereitet, Bewerbungen geschrieben, Gespräche geübt und mich beruflich orientiert. Diese Vorbereitung habe ich inzwischen abgeschlossen.',
            evidence: [
                { type: 'placeholder', title: 'Teilnahmenachweis', note: 'Dokument später hinzufügen', icon: 'file-text' },
                { type: 'placeholder', title: 'Bewerbungsunterlagen', note: 'Beispiel später hinzufügen', icon: 'folder-open' }
            ]
        },
        {
            id: 'edu-ai-integrator-kurs',
            level: '08',
            title: 'AI-Integrator-Kurs',
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
            text: 'Seit Juli 2026 mache ich online einen Kurs zum AI-Integrator.\nDort lerne ich, wie ich KI bei meinen Projekten und später im Beruf praktisch nutzen kann. Ich bin noch am Anfang, deshalb kommen hier später konkrete Beispiele dazu.',
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
        locked: true,
        branches: [
            {
                id: 'goal-studienkolleg',
                title: 'Studienkolleg',
                subtitle: 'Möglicher Weg',
                status: 'Offen',
                icon: 'graduation-cap',
                locked: true
            },
            {
                id: 'goal-ausbildung',
                title: 'Ausbildung',
                subtitle: 'Möglicher Weg',
                status: 'Offen',
                icon: 'briefcase',
                locked: true
            }
        ]
    };
}

const EDUCATION_TIMELINE_REVISION = 4;

function applyEducationTimelineRevision(items) {
    const fieldsById = {
        'edu-ukraine-1-9': ['years', 'text'],
        'edu-gymnasium-fulda': ['years', 'text'],
        'edu-3d-visualisierung': ['title', 'years', 'text'],
        'edu-klassen-10-11-online': ['years', 'text'],
        'edu-berufliche-schulen-kehl': ['years', 'status', 'statusType', 'progress', 'text'],
        'edu-b2-deutsch': ['years', 'status', 'statusType', 'progress', 'text'],
        'edu-arbeitsvorbereitung-afoeg': ['level', 'title', 'subtitle', 'icon', 'years', 'place', 'format', 'topics', 'status', 'statusType', 'progress', 'text'],
        'edu-ai-integrator-kurs': ['level', 'title', 'subtitle', 'years', 'status', 'statusType', 'progress', 'text']
    };
    const defaultsById = new Map(getDefaultEducationItems().map(item => [item.id, item]));
    const updatedItems = items.map(item => {
            const fields = fieldsById[item?.id];
            const defaults = defaultsById.get(item?.id);
            if (!fields || !defaults) return item;

            const update = Object.fromEntries(fields.map(field => [field, cloneData(defaults[field])]));
            return { ...item, ...update };
        });
    const updatedById = new Map(updatedItems
        .filter(item => item?.id)
        .map(item => [String(item.id), item]));
    const defaultIds = new Set(defaultsById.keys());

    return [
        ...getDefaultEducationItems()
            .map(defaultItem => updatedById.get(String(defaultItem.id)))
            .filter(Boolean),
        ...updatedItems.filter(item => !defaultIds.has(String(item?.id || '')))
    ];
}

function mergeEducationItemsById(existingItems, defaultItems, removedIds = []) {
    const safeDefaults = Array.isArray(defaultItems) ? defaultItems : [];
    const removed = new Set(Array.isArray(removedIds) ? removedIds.map(String) : []);
    if (!Array.isArray(existingItems) || existingItems.length === 0) {
        return cloneData(safeDefaults.filter(item => !removed.has(String(item?.id || ''))));
    }

    const result = [];
    const usedIds = new Set();
    const defaultsById = new Map(safeDefaults
        .filter(item => item && typeof item === 'object' && item.id)
        .map(item => [String(item.id), item]));

    existingItems.forEach(item => {
        if (!item || typeof item !== 'object' || !item.id) return;
        const itemId = String(item.id);
        if (removed.has(itemId) || usedIds.has(itemId)) return;
        const fallback = defaultsById.get(itemId);
        result.push(fallback ? { ...cloneData(fallback), ...cloneData(item) } : cloneData(item));
        usedIds.add(itemId);
    });

    safeDefaults.forEach(defaultItem => {
        if (!defaultItem || typeof defaultItem !== 'object' || !defaultItem.id) return;
        const itemId = String(defaultItem.id);
        if (removed.has(itemId) || usedIds.has(itemId)) return;
        result.push(cloneData(defaultItem));
        usedIds.add(itemId);
    });

    return result.length > 0 ? result : cloneData(safeDefaults);
}

function normalizeEducationTextMap(value, fallback) {
    const source = value && typeof value === 'object' ? value : {};
    return Object.fromEntries(Object.entries(fallback).map(([key, defaultValue]) => [
        key,
        typeof source[key] === 'string' ? source[key] : defaultValue
    ]));
}

function clampEducationNumber(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, Math.round(numeric)));
}

function normalizeEducationLayout(value, fallback = getDefaultEducationLayout()) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        cardWidth: clampEducationNumber(source.cardWidth, fallback.cardWidth, 132, 176),
        cardHeight: clampEducationNumber(source.cardHeight, fallback.cardHeight, 160, 210),
        timelineHeight: clampEducationNumber(source.timelineHeight, fallback.timelineHeight, 420, 520),
        linePosition: clampEducationNumber(source.linePosition, fallback.linePosition, 200, 250),
        goalWidth: clampEducationNumber(source.goalWidth, fallback.goalWidth, 144, 180)
    };
}

function normalizeEducationRemovedItems(value) {
    return Array.isArray(value)
        ? [...new Set(value.map(id => String(id || '').trim()).filter(Boolean))]
        : [];
}

function migrateEducationData(data) {
    const source = data && typeof data === 'object' ? data : {};
    const migrated = { ...source };
    const removedItems = normalizeEducationRemovedItems(source.educationRemovedItems);
    migrated.educationContent = normalizeEducationTextMap(source.educationContent, getDefaultEducationContent());
    migrated.educationLayout = normalizeEducationLayout(source.educationLayout);
    migrated.educationItems = mergeEducationItemsById(source.educationItems, getDefaultEducationItems(), removedItems);
    if (Number(source.educationTimelineRevision || 0) < EDUCATION_TIMELINE_REVISION) {
        migrated.educationItems = applyEducationTimelineRevision(migrated.educationItems);
    }
    const defaultGoal = getDefaultEducationGoal();
    const sourceGoal = source.educationGoal && typeof source.educationGoal === 'object'
        ? source.educationGoal
        : {};
    const sourceBranches = Array.isArray(sourceGoal.branches) ? sourceGoal.branches : [];
    const sourceBranchesById = new Map(sourceBranches
        .filter(branch => branch && typeof branch === 'object' && branch.id)
        .map(branch => [branch.id, branch]));

    migrated.educationGoal = {
        locked: true,
        branches: defaultGoal.branches.map(branch => ({
            ...cloneData(branch),
            ...cloneData(sourceBranchesById.get(branch.id) || {}),
            id: branch.id,
            locked: true
        }))
    };
    migrated.educationRemovedItems = removedItems;
    migrated.educationTimelineRevision = EDUCATION_TIMELINE_REVISION;
    return migrated;
}

const LIBRARY_REVISION = 2;

function createEmptyLibraryBook(position) {
    return {
        id: `library-slot-${position}`,
        title: '',
        author: '',
        img: '',
        medium: 'book',
        status: 'read',
        readYear: null,
        dateFinished: null,
        dateAdded: null,
        category: '',
        language: '',
        takeaway: '',
        application: '',
        top: true,
        topPosition: position,
        isPlaceholder: true
    };
}

function createLibraryBook({
    id,
    title,
    author,
    category,
    takeaway,
    application,
    topPosition = null,
    readYear = null,
    originalTitle = ''
}) {
    return {
        id,
        title,
        author,
        img: '',
        medium: 'book',
        status: 'read',
        readYear,
        dateFinished: null,
        dateAdded: null,
        category,
        language: '',
        takeaway,
        application,
        originalTitle,
        top: Number.isInteger(topPosition),
        topPosition,
        isPlaceholder: false
    };
}

function getDefaultBooks() {
    return [
        createLibraryBook({
            id: 'book-atomic-habits',
            title: 'Atomic Habits',
            author: 'James Clear',
            category: 'Gewohnheiten & Selbstentwicklung',
            topPosition: 1,
            takeaway: 'Große Veränderungen entstehen meist nicht durch einen einzelnen Motivationsschub, sondern durch kleine Handlungen, die oft genug wiederholt werden. Für mich ist der wichtigste Gedanke: Nicht nur Ziele setzen, sondern ein System bauen, das Fortschritt fast automatisch macht.',
            application: 'Ich zerlege große Ziele in kleine Fähigkeiten und wiederholbare Schritte. Genau diese Logik nutze ich auch bei Nivora und in meinen Lernplänen.'
        }),
        createLibraryBook({
            id: 'book-five-love-languages',
            title: 'Die fünf Sprachen der Liebe',
            author: 'Gary Chapman',
            category: 'Beziehungen & Kommunikation',
            topPosition: 2,
            takeaway: 'Menschen können dieselbe Nähe sehr unterschiedlich wahrnehmen. Gute Absichten reichen nicht, wenn ich nicht verstehe, wodurch sich die andere Person wirklich gesehen und geschätzt fühlt.',
            application: 'Ich achte bewusster darauf, ob jemand eher Zeit, Worte, Hilfe, Berührung oder kleine Aufmerksamkeiten braucht, statt nur das zu geben, was für mich selbst wichtig wäre.'
        }),
        createLibraryBook({
            id: 'book-think-grow-rich',
            title: 'Denke nach und werde reich',
            author: 'Napoleon Hill',
            category: 'Erfolg & Unternehmertum',
            topPosition: 3,
            originalTitle: 'Think and Grow Rich',
            takeaway: 'Der nützliche Teil ist für mich nicht magisches Denken, sondern ein klares Ziel, Beharrlichkeit, Planung und Menschen, deren Stärken sich ergänzen.',
            application: 'Ich versuche große Produktideen konkret zu formulieren, sie in Schritte zu zerlegen und trotz langsamer Ergebnisse langfristig daran weiterzuarbeiten.'
        }),
        createLibraryBook({
            id: 'book-mans-search-for-meaning',
            title: "Man's Search for Meaning",
            author: 'Viktor E. Frankl',
            category: 'Psychologie & Sinn',
            topPosition: 4,
            takeaway: 'Ich kann nicht jede Situation kontrollieren, aber ich kann entscheiden, welche Haltung ich dazu einnehme und wofür ich sie aushalte. Sinn gibt Belastung eine Richtung.',
            application: 'Wenn etwas schwierig oder langsam wird, versuche ich mich nicht nur zu motivieren, sondern mich wieder mit dem Grund zu verbinden, warum ich es überhaupt tue.'
        }),
        createLibraryBook({
            id: 'book-proverbs',
            title: 'Sprüche Salomos',
            author: 'Salomo',
            category: 'Glaube & Weisheit',
            topPosition: 5,
            takeaway: 'Weisheit zeigt sich nicht in komplizierten Gedanken, sondern in täglichen Entscheidungen: wie ich rede, mit Menschen umgehe, arbeite, mit Geld umgehe und meinen Stolz kontrolliere.',
            application: 'Ich nutze die Sprüche als praktischen Maßstab für Verhalten und Entscheidungen, nicht nur als Text zum Lesen.'
        }),
        createLibraryBook({
            id: 'book-48-laws-of-power',
            title: 'Die 48 Gesetze der Macht',
            author: 'Robert Greene',
            category: 'Strategie & Gesellschaft',
            readYear: 2026,
            originalTitle: 'The 48 Laws of Power',
            takeaway: 'Macht und Status wirken oft indirekt: über Ruf, Abhängigkeiten, Timing und die Interessen anderer Menschen. Das Buch ist für mich eher eine Beschreibung sozialer Spiele als eine Anleitung, jedes Gesetz nachzumachen.',
            application: 'Ich nutze die Ideen, um Manipulation und Machtspiele früher zu erkennen und in Gruppen strategischer zu handeln, ohne meine eigenen Werte aufzugeben.'
        }),
        createLibraryBook({
            id: 'book-bible',
            title: 'Die Bibel',
            author: 'Verschiedene Autoren',
            category: 'Glaube & Weisheit',
            readYear: 2026,
            takeaway: 'Für mich ist die Bibel keine Sammlung einzelner schöner Zitate, sondern eine zusammenhängende Geschichte über Gott, den Menschen, Verantwortung, Schuld, Gnade und Hoffnung.',
            application: 'Sie ist die Grundlage meines Glaubens. Ich versuche Entscheidungen und Verhalten nicht nur nach Nutzen, sondern auch nach ihren Werten zu prüfen.'
        }),
        createLibraryBook({
            id: 'book-personality-plus',
            title: 'Personality Plus',
            author: 'Florence Littauer',
            category: 'Persönlichkeit & Kommunikation',
            readYear: 2026,
            takeaway: 'Temperament erklärt viele Unterschiede im Verhalten, aber es entschuldigt sie nicht. Eine Stärke kann übertrieben schnell zur Schwäche werden.',
            application: 'Ich beobachte meinen phlegmatisch-sanguinischen Mix bewusster: wann Ruhe hilft, wann sie zu Passivität wird und wann ich aktiv mehr Energie in eine Gruppe bringen sollte.'
        }),
        createLibraryBook({
            id: 'book-richest-man-babylon',
            title: 'Der reichste Mann von Babylon',
            author: 'George S. Clason',
            category: 'Finanzen',
            readYear: 2026,
            originalTitle: 'The Richest Man in Babylon',
            takeaway: 'Finanzielle Stabilität beginnt mit einfachen Regeln: weniger ausgeben als man verdient, zuerst einen Teil für sich behalten und Geld nicht unüberlegt riskieren.',
            application: 'Ich denke bei Projekten und persönlichen Ausgaben stärker in Budgets, Reserven und langfristigem Aufbau statt nur in dem, was gerade verfügbar ist.'
        }),
        createLibraryBook({
            id: 'book-magic-thinking-big',
            title: 'The Magic of Thinking Big',
            author: 'David J. Schwartz',
            category: 'Denken & Selbstentwicklung',
            readYear: 2026,
            takeaway: 'Viele Grenzen entstehen schon im Denken, bevor die Realität sie setzt. Groß zu denken bedeutet für mich aber nicht zu fantasieren, sondern größere Möglichkeiten ernst zu nehmen und entsprechend zu handeln.',
            application: 'Ich versuche Produktideen nicht sofort kleinzureden. Erst formuliere ich die große Version, danach zerlege ich sie in einen realistischen ersten Schritt.'
        }),
        createLibraryBook({
            id: 'book-developing-leaders',
            title: 'Chef und sein Team',
            author: 'John C. Maxwell',
            category: 'Führung & Teamarbeit',
            readYear: 2026,
            originalTitle: 'Developing the Leaders Around You',
            takeaway: 'Ein starker Leiter macht nicht alles selbst. Seine eigentliche Aufgabe ist, andere Menschen zu entwickeln, Verantwortung zu übertragen und aus einzelnen Personen ein funktionierendes Team zu machen.',
            application: 'Bei eigenen Projekten will ich Aufgaben nicht nur verteilen, sondern Menschen so einbinden, dass sie selbstständig stärker werden und Verantwortung übernehmen können.'
        }),
        createLibraryBook({
            id: 'book-first-20-hours',
            title: 'The First 20 Hours',
            author: 'Josh Kaufman',
            category: 'Lernen & Fähigkeiten',
            readYear: 2026,
            takeaway: 'Für einen brauchbaren Einstieg braucht man nicht tausende Stunden. Entscheidend sind ein klares Teilziel, die wichtigsten Grundlagen und genug konzentrierte Übung, um die erste Frustrationsphase zu überwinden.',
            application: 'Ich zerlege neue Fähigkeiten in kleine Bestandteile und baue kurze Lernblöcke, in denen ich möglichst schnell etwas praktisch anwende.'
        })
    ];
}

const DOCUMENTS_REVISION = 1;
const BLOG_REVISION = 2;

function getDefaultDocumentsContent() {
    return {
        sectionTitle: 'Dokumente',
        subtitle: 'Belege meines Weges',
        allDocumentsLabel: 'Alle Dokumente',
        archiveKicker: 'Dokumente',
        archiveTitle: 'Alle Dokumente',
        categoryLabel: 'Kategorie',
        yearLabel: 'Jahr',
        fileTypeLabel: 'Dateityp',
        viewLabel: 'Ansehen',
        downloadLabel: 'Herunterladen',
        originalLabel: 'Original',
        translationLabel: 'Übersetzung',
        emptyLabel: 'Noch keine Dokumente vorhanden.'
    };
}

function normalizeDocumentsContent(value) {
    const source = value && typeof value === 'object' ? value : {};
    return Object.fromEntries(Object.entries(getDefaultDocumentsContent()).map(([key, fallback]) => [
        key,
        typeof source[key] === 'string' && source[key].trim() ? source[key].trim() : fallback
    ]));
}

function getDefaultBlogContent() {
    return {
        sectionTitle: 'Blog',
        purposeText: 'Fortschritte, Entscheidungen und Gedanken hinter meinen Projekten – und gelegentlich Notizen von unterwegs.',
        allPostsLabel: 'Alle Beiträge',
        addPostLabel: 'Beitrag erstellen',
        archiveKicker: 'Blogarchiv',
        archiveTitle: 'Alle Beiträge',
        searchPlaceholder: 'Beiträge durchsuchen …',
        emptyArchive: 'Kein passender Beitrag gefunden.',
        loadMoreLabel: 'Weitere Beiträge laden',
        currentPostLabel: 'Aktueller Beitrag',
        readPostLabel: 'Beitrag lesen',
        emptyKicker: 'Worum es hier geht',
        emptyTitle: 'Was entsteht gerade – und was lerne ich beim Bauen?',
        emptyText: 'Hier halte ich Fortschritte, Entscheidungen und Gedanken hinter meinen Projekten fest.',
        orientationLabel: 'Orientierung',
        themesTitle: 'Themen',
        archiveSummaryLabel: 'Im Archiv',
        latestKicker: 'Weiterlesen',
        latestTitle: 'Letzte Beiträge',
        allFilterLabel: 'Alle',
        allYearsLabel: 'Alle Jahre',
        allFormatsLabel: 'Alle Formate',
        noDateLabel: 'Ohne Datum',
        archiveYearLabel: 'Archiv',
        draftLabel: 'Entwurf',
        minutesLabel: 'Min.',
        posterLabel: 'BLOG',
        resultLabel: 'Was sich geändert hat',
        nextStepLabel: 'Nächster Schritt',
        tocTitle: 'Inhalt',
        relatedKicker: 'Im gleichen Thema',
        relatedTitle: 'Weitere Beiträge',
        emptyPostText: 'Dieser Beitrag wird noch ergänzt.',
        archiveSingular: 'Beitrag',
        archivePlural: 'Beiträge',
        categories: [
            { key: 'projekte', label: 'Projekte', description: 'Updates, Entscheidungen und Fehler aus meinen Projekten.', icon: 'blocks' },
            { key: 'ideen-arbeit', label: 'Ideen & Arbeit', description: 'Wie aus Gedanken prüfbare Entwürfe und Produkte werden.', icon: 'lightbulb' },
            { key: 'notizen', label: 'Notizen', description: 'Kurze Beobachtungen, Bücher, Zitate und Wege dazwischen.', icon: 'notebook-tabs' }
        ],
        types: [
            { key: 'update', label: 'Update' },
            { key: 'build-log', label: 'Build Log' },
            { key: 'idee', label: 'Idee' },
            { key: 'experiment', label: 'Experiment' },
            { key: 'notiz', label: 'Notiz' },
            { key: 'unterwegs', label: 'Unterwegs' },
            { key: 'case-study', label: 'Case Study' }
        ]
    };
}

function normalizeBlogContent(value) {
    const defaults = getDefaultBlogContent();
    const source = value && typeof value === 'object' ? value : {};
    const strings = Object.fromEntries(Object.entries(defaults)
        .filter(([, fallback]) => typeof fallback === 'string')
        .map(([key, fallback]) => [
            key,
            typeof source[key] === 'string' && source[key].trim() ? source[key].trim() : fallback
        ]));
    const mergeFixedItems = (sourceItems, fallbackItems) => {
        const byKey = new Map((Array.isArray(sourceItems) ? sourceItems : [])
            .filter(item => item && typeof item === 'object')
            .map(item => [String(item.key || ''), item]));
        return fallbackItems.map(fallback => {
            const item = byKey.get(fallback.key) || {};
            return Object.fromEntries(Object.entries(fallback).map(([key, fallbackValue]) => [
                key,
                key === 'key' ? fallbackValue : (typeof item[key] === 'string' && item[key].trim() ? item[key].trim() : fallbackValue)
            ]));
        });
    };
    return {
        ...strings,
        categories: mergeFixedItems(source.categories, defaults.categories),
        types: mergeFixedItems(source.types, defaults.types)
    };
}

function getDefaultDocuments() {
    return [
        {
            id: 'document-cv',
            code: 'DOC-01',
            title: 'Lebenslauf',
            category: 'Bewerbung',
            year: '2026',
            size: '',
            ext: 'PDF',
            icon: 'file-text',
            img: '',
            fileUrl: '#',
            originalFileUrl: '',
            hasOriginal: false,
            featured: true,
            featuredPosition: 1
        },
        {
            id: 'document-b2',
            code: 'DOC-02',
            title: 'B2-Zertifikat',
            category: 'Sprache',
            year: '2026',
            size: '',
            ext: 'PDF',
            icon: 'file-badge',
            img: '',
            fileUrl: '#',
            originalFileUrl: '',
            hasOriginal: false,
            featured: true,
            featuredPosition: 2
        },
        {
            id: 'document-school-certificate',
            code: 'DOC-03',
            title: 'Schulabschlusszeugnis',
            category: 'Bildung',
            year: '2025',
            size: '',
            ext: 'PDF',
            icon: 'graduation-cap',
            img: '',
            fileUrl: '#',
            originalFileUrl: '#',
            hasOriginal: true,
            featured: true,
            featuredPosition: 3
        },
        {
            id: 1,
            code: 'DOC-04',
            title: 'B1-Zertifikat',
            category: 'Sprache',
            year: '2025',
            size: '1.2 MB',
            ext: 'PDF',
            icon: 'file-badge',
            img: '',
            fileUrl: '#',
            originalFileUrl: '',
            hasOriginal: false,
            featured: true,
            featuredPosition: 4
        },
        {
            id: 'document-vabo-1',
            code: 'DOC-05',
            title: 'VABO 1 – Berufsschule',
            category: 'Bildung',
            year: '',
            size: '',
            ext: 'PDF',
            icon: 'school',
            img: '',
            fileUrl: '#',
            originalFileUrl: '',
            hasOriginal: false,
            featured: false,
            featuredPosition: null
        }
    ];
}

const defaultData = {
    schemaVersion: 9,
    projectsRevision: PROJECT_SHOWCASE_REVISION,
    libraryRevision: LIBRARY_REVISION,
    documentsRevision: DOCUMENTS_REVISION,
    blogRevision: BLOG_REVISION,
    profile: {
        name: "Ivan",
        role: "Junior Entwickler, 3D Artist und Technologie-Enthusiast. Ich lerne ständig dazu und erschaffe Neues.",
        images: [
            createPlaceholderDataUrl('Ivan Photo', 600, 600),
        ],
        slideshowActive: true,
        slideshowInterval: 10
    },
    about: getDefaultAboutData(),
    educationContent: getDefaultEducationContent(),
    educationItems: getDefaultEducationItems(),
    educationGoal: getDefaultEducationGoal(),
    educationLayout: getDefaultEducationLayout(),
    educationRemovedItems: [],
    educationTimelineRevision: EDUCATION_TIMELINE_REVISION,
    projectsContent: getDefaultProjectsContent(),
    projectsLayout: getDefaultProjectsLayout(),
    projects: cloneData(PROJECT_SHOWCASE_DEFAULTS),
    books: getDefaultBooks(),
    documentsContent: getDefaultDocumentsContent(),
    documents: getDefaultDocuments(),
    blogContent: getDefaultBlogContent(),
    blogs: [
        {
            id: 'blog-website-update-2026',
            slug: 'was-sich-auf-meiner-website-geaendert-hat',
            title: 'Was sich auf meiner Website geändert hat',
            publishedAt: '2026-09-09',
            updatedAt: '2026-09-09T12:00:00.000Z',
            status: 'published',
            category: 'projekte',
            type: 'update',
            tags: ['Website', 'Design', 'JSON'],
            excerpt: 'Mein Lebenslauf ist inzwischen mehr als eine Seite mit Informationen. Ich baue ihn wie ein eigenes Produkt auf – Abschnitt für Abschnitt, mit echten Entscheidungen und sichtbaren Fortschritten.',
            contentMarkdown: 'Dieser Lebenslauf sollte zuerst nur zeigen, wer ich bin und was ich kann. Mit jeder neuen Version wurde aber klarer: Eine gewöhnliche Sammlung von Karten reicht dafür nicht aus. Die Website selbst kann zeigen, wie ich denke, gestalte und Probleme löse.\n\n## Was sich geändert hat\n\nIch habe die wichtigsten Bereiche Schritt für Schritt neu aufgebaut. Projekte funktionieren jetzt wie ein Arbeitsbereich, die Bibliothek wie eine persönliche Auswahl und Dokumente wie ein kompaktes digitales Archiv. Im Blog zeige ich die Entscheidungen hinter diesen Änderungen.\n\n## Warum ich es neu gebaut habe\n\nViele frühe Varianten waren technisch funktionsfähig, wirkten aber wie einzelne Vorlagen. Deshalb habe ich begonnen, jede Sektion nach ihrer eigentlichen Aufgabe zu gestalten. Ein Projekt braucht eine andere Darstellung als ein Zeugnis, und ein längerer Gedanke braucht mehr Ruhe als eine Projektkarte.\n\n## Was nicht funktioniert hat\n\nMehr Elemente machten die Seite nicht automatisch besser. Leere Karten, große Flächen ohne Inhalt und Dekoration ohne Funktion ließen manche Bereiche unfertig wirken. Die wichtigste Korrektur war deshalb nicht mehr Design, sondern eine klarere Hierarchie.\n\n## Der nächste Schritt\n\nAls Nächstes fülle ich den Blog mit echten Updates aus meinen Projekten. Nicht nach einem künstlichen Zeitplan, sondern dann, wenn es eine konkrete Veränderung, ein Problem oder eine Erkenntnis gibt, die sich festzuhalten lohnt.',
            cover: '',
            coverAlt: '',
            result: 'Aus einzelnen Sektionen entsteht ein zusammenhängendes digitales Profil, das nicht nur Ergebnisse, sondern auch meinen Arbeitsprozess zeigt.',
            nextStep: 'Die ersten Projektberichte zu Nivora und zu den Entscheidungen hinter dieser Website veröffentlichen.',
            featured: true
        }
    ]
};
