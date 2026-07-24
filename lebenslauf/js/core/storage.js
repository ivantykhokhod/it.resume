/* State normalization and local persistence. */

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeCollection(value, fallback) {
    if (!Array.isArray(value)) return cloneData(fallback);
    return value
        .filter(isPlainObject)
        .map((item, index) => ({
            ...cloneData(item),
            id: item.id ?? `restored-${Date.now()}-${index}`
        }));
}

function normalizeRootData(value) {
    const source = isPlainObject(value) ? value : {};
    const profileSource = isPlainObject(source.profile) ? source.profile : {};
    const images = Array.isArray(profileSource.images)
        ? profileSource.images.map(getSafeImageUrl).filter(Boolean).slice(0, 12)
        : cloneData(defaultData.profile.images);
    const interval = Number(profileSource.slideshowInterval);

    let normalized = {
        ...cloneData(defaultData),
        ...source,
        schemaVersion: 2,
        profile: {
            ...cloneData(defaultData.profile),
            ...profileSource,
            name: String(profileSource.name ?? defaultData.profile.name),
            role: String(profileSource.role ?? defaultData.profile.role),
            images,
            slideshowActive: profileSource.slideshowActive !== false,
            slideshowInterval: Number.isFinite(interval) ? Math.max(1, Math.min(60, Math.round(interval))) : defaultData.profile.slideshowInterval
        },
        projects: normalizeCollection(source.projects, defaultData.projects),
        books: normalizeCollection(source.books, defaultData.books),
        documents: normalizeCollection(source.documents, defaultData.documents),
        blogs: normalizeCollection(source.blogs, defaultData.blogs),
        about: migrateAboutData(source.about)
    };

    normalized = migrateEducationData(normalized);
    return normalized;
}

let state = {
    data: cloneData(defaultData),
    expanded: { projects: false, books: false, documents: false }
};

// Загрузка данных
function loadData() {
    let savedData = null;
    try {
        savedData = localStorage.getItem('gxResumeData');
    } catch (error) {
        console.warn('Lokale Daten konnten nicht gelesen werden:', error);
    }

    if (savedData) {
        try {
            state.data = normalizeRootData(JSON.parse(savedData));
        } catch (error) {
            console.error('Fehler beim Laden von gxResumeData:', error);
            state.data = cloneData(defaultData);
            showToast('Gespeicherte Daten waren beschädigt. Die Standarddaten wurden geladen.', 'error');
        }
    } else {
        state.data = cloneData(defaultData);
    }

    state.data = normalizeRootData(state.data);
    renderAll();
    startSlideshow();
}

function saveData() {
    try {
        state.data = normalizeRootData(state.data);
        localStorage.setItem('gxResumeData', JSON.stringify(state.data));
        return true;
    } catch (error) {
        console.error('Daten konnten nicht gespeichert werden:', error);
        const quotaMessage = error && error.name === 'QuotaExceededError'
            ? 'Der lokale Speicher ist voll. Entferne große Bilder oder lade kleinere Dateien hoch.'
            : 'Die Änderungen konnten nicht gespeichert werden.';
        showToast(quotaMessage, 'error');
        return false;
    }
}
