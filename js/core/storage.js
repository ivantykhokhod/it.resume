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

function isLegacyLibrarySeed(book) {
    const id = String(book?.id ?? '');
    const title = String(book?.title || '');
    const author = String(book?.author || '');
    if (id === '5' && title === 'Atomic Habits' && author === 'James Clear') {
        return String(book?.notes || '') === 'Ein absolutes Muss.';
    }
    if (id === '1' && title === 'Essentialism' && author === 'Greg McKeown') {
        return String(book?.notes || '') === '';
    }
    return false;
}

function normalizeLibraryDate(value) {
    const date = String(value || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function normalizeLibraryMedium(value) {
    const medium = String(value || '').toLowerCase();
    return ['book', 'ebook', 'audiobook'].includes(medium) ? medium : 'book';
}

function normalizeLibraryTopPosition(value) {
    const position = Number(value);
    return Number.isInteger(position) && position >= 1 && position <= 5 ? position : null;
}

function normalizeLibraryReadYear(value, dateFinished = null) {
    const year = Number(value);
    if (Number.isInteger(year) && year >= 1900 && year <= 2100) return year;
    const normalizedDate = normalizeLibraryDate(dateFinished);
    return normalizedDate ? Number(normalizedDate.slice(0, 4)) : null;
}

function getLibraryBookIdentity(book) {
    return `${String(book?.title || '').trim()}|${String(book?.author || '').trim()}`.toLocaleLowerCase('de-DE');
}

function normalizeLibraryBooks(value, previousSchemaVersion, previousLibraryRevision) {
    const rawBooks = normalizeCollection(value, []);
    const removeOldSeeds = Number(previousSchemaVersion || 0) < 3;
    const normalizeBook = book => {
        const title = String(book.title || '').trim();
        const placeholder = Boolean(book.isPlaceholder) && !title;
        const dateFinished = normalizeLibraryDate(book.dateFinished);
        const normalizedBook = {
            ...cloneData(book),
            title,
            author: String(book.author || '').trim(),
            img: getSafeImageUrl(book.img || book.cover),
            medium: normalizeLibraryMedium(book.medium || (book.icon === 'headphones' ? 'audiobook' : 'book')),
            status: 'read',
            readYear: normalizeLibraryReadYear(book.readYear, dateFinished),
            dateFinished,
            dateAdded: normalizeLibraryDate(book.dateAdded),
            category: String(book.category || '').trim(),
            language: String(book.language || '').trim(),
            takeaway: String(book.takeaway ?? book.notes ?? '').trim(),
            application: String(book.application || '').trim(),
            originalTitle: String(book.originalTitle || '').trim(),
            top: book.top === true,
            topPosition: normalizeLibraryTopPosition(book.topPosition),
            isPlaceholder: placeholder
        };
        delete normalizedBook.notes;
        delete normalizedBook.cover;
        delete normalizedBook.icon;
        return normalizedBook;
    };

    let preparedBooks = rawBooks
        .filter(book => !(removeOldSeeds && isLegacyLibrarySeed(book)))
        .map(normalizeBook);

    if (Number(previousLibraryRevision || 0) < LIBRARY_REVISION) {
        const existingBooks = preparedBooks.filter(book => !book.isPlaceholder);
        const existingById = new Map(existingBooks.map(book => [String(book.id), book]));
        const existingByIdentity = new Map(existingBooks.map(book => [getLibraryBookIdentity(book), book]));
        const usedBooks = new Set();
        const curatedBooks = getDefaultBooks().map(normalizeBook);

        preparedBooks = curatedBooks.map(seedBook => {
            const existingBook = existingById.get(String(seedBook.id)) || existingByIdentity.get(getLibraryBookIdentity(seedBook));
            if (!existingBook) return seedBook;
            usedBooks.add(existingBook);
            return {
                ...seedBook,
                ...existingBook,
                id: seedBook.id,
                readYear: seedBook.readYear ?? existingBook.readYear,
                top: seedBook.top,
                topPosition: seedBook.topPosition,
                isPlaceholder: false
            };
        });

        existingBooks.forEach(book => {
            if (!usedBooks.has(book)) preparedBooks.push(book);
        });
    }

    const realBooks = preparedBooks.filter(book => !book.isPlaceholder);
    const existingPlaceholders = preparedBooks.filter(book => book.isPlaceholder);
    const occupied = new Set();
    const pendingFavorites = [];

    realBooks.forEach(book => {
        const position = normalizeLibraryTopPosition(book.topPosition);
        if (position && !occupied.has(position)) {
            book.top = true;
            book.topPosition = position;
            occupied.add(position);
            return;
        }
        book.topPosition = null;
        if (book.top) pendingFavorites.push(book);
        else book.top = false;
    });

    pendingFavorites.forEach(book => {
        const position = [1, 2, 3, 4, 5].find(candidate => !occupied.has(candidate));
        if (!position) {
            book.top = false;
            book.topPosition = null;
            return;
        }
        book.top = true;
        book.topPosition = position;
        occupied.add(position);
    });

    const placeholdersByPosition = new Map(
        existingPlaceholders
            .map(book => [normalizeLibraryTopPosition(book.topPosition), book])
            .filter(([position]) => position)
    );
    const placeholders = [];
    [1, 2, 3, 4, 5].forEach(position => {
        if (occupied.has(position)) return;
        const placeholder = placeholdersByPosition.get(position) || createEmptyLibraryBook(position);
        placeholders.push({
            ...placeholder,
            id: `library-slot-${position}`,
            top: true,
            topPosition: position,
            isPlaceholder: true
        });
    });

    return [...realBooks, ...placeholders];
}

function getDocumentIdentity(documentItem) {
    return String(documentItem?.title || '').trim().toLocaleLowerCase('de-DE');
}

function normalizeDocumentFeaturedPosition(value) {
    const position = Number(value);
    return Number.isInteger(position) && position >= 1 && position <= 4 ? position : null;
}

function normalizeDocuments(value, previousDocumentsRevision) {
    const rawDocuments = normalizeCollection(value, []);
    const normalizeDocument = (documentItem, index = 0) => {
        const originalFileValue = String(documentItem.originalFileUrl || '').trim();
        return {
            ...cloneData(documentItem),
            id: documentItem.id ?? `document-restored-${index + 1}`,
            code: String(documentItem.code || `DOC-${String(index + 1).padStart(2, '0')}`).trim(),
            title: String(documentItem.title || 'Dokument').trim(),
            category: String(documentItem.category || '').trim(),
            year: String(documentItem.year || '').trim(),
            size: String(documentItem.size || '').trim(),
            ext: String(documentItem.ext || 'PDF').trim().toUpperCase(),
            icon: normalizeIconName(documentItem.icon, 'file-text'),
            img: getSafeImageUrl(documentItem.img),
            fileUrl: getSafeLinkUrl(documentItem.fileUrl),
            originalFileUrl: originalFileValue ? getSafeLinkUrl(originalFileValue) : '',
            hasOriginal: documentItem.hasOriginal === true || Boolean(originalFileValue),
            featured: documentItem.featured !== false,
            featuredPosition: normalizeDocumentFeaturedPosition(documentItem.featuredPosition)
        };
    };

    let preparedDocuments = rawDocuments.map(normalizeDocument);
    if (Number(previousDocumentsRevision || 0) < DOCUMENTS_REVISION) {
        const existingById = new Map(preparedDocuments.map(item => [String(item.id), item]));
        const existingByIdentity = new Map(preparedDocuments.map(item => [getDocumentIdentity(item), item]));
        const usedDocumentIds = new Set();
        const usedDocumentIdentities = new Set();
        const seededDocuments = getDefaultDocuments().map(normalizeDocument);

        preparedDocuments = seededDocuments.map(seedDocument => {
            const existingDocument = existingById.get(String(seedDocument.id)) || existingByIdentity.get(getDocumentIdentity(seedDocument));
            if (!existingDocument) return seedDocument;
            usedDocumentIds.add(String(existingDocument.id));
            usedDocumentIdentities.add(getDocumentIdentity(existingDocument));
            return normalizeDocument({
                ...seedDocument,
                ...existingDocument,
                id: seedDocument.id,
                code: seedDocument.code,
                featured: seedDocument.featured,
                hasOriginal: seedDocument.hasOriginal || existingDocument.hasOriginal,
                originalFileUrl: existingDocument.originalFileUrl || seedDocument.originalFileUrl
            });
        });

        preparedDocuments.push(...rawDocuments
            .map(normalizeDocument)
            .filter(item => !usedDocumentIds.has(String(item.id))
                && !usedDocumentIdentities.has(getDocumentIdentity(item))
                && !seededDocuments.some(seed => String(seed.id) === String(item.id))));
    }

    const occupiedPositions = new Set();
    const pendingFeatured = [];
    preparedDocuments.forEach(documentItem => {
        const position = normalizeDocumentFeaturedPosition(documentItem.featuredPosition);
        if (documentItem.featured !== false && position && !occupiedPositions.has(position)) {
            documentItem.featured = true;
            documentItem.featuredPosition = position;
            occupiedPositions.add(position);
            return;
        }
        documentItem.featuredPosition = null;
        if (documentItem.featured !== false) pendingFeatured.push(documentItem);
        else documentItem.featured = false;
    });

    pendingFeatured.forEach(documentItem => {
        const position = [1, 2, 3, 4].find(candidate => !occupiedPositions.has(candidate));
        documentItem.featured = Boolean(position);
        documentItem.featuredPosition = position || null;
        if (position) occupiedPositions.add(position);
    });

    return preparedDocuments;
}

function normalizeBlogPublishedAt(value) {
    const raw = String(value || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}

function normalizeBlogSlug(value, fallback = 'beitrag') {
    const normalized = String(value || fallback || 'beitrag')
        .trim()
        .toLocaleLowerCase('de-DE')
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 96);
    return normalized || 'beitrag';
}

function normalizeBlogCategory(value, legacyTag = '') {
    const source = String(value || legacyTag || '').trim().toLocaleLowerCase('de-DE');
    if (/idee|arbeit|prozess|experiment|lernen|ai|ki/.test(source)) return 'ideen-arbeit';
    if (/notiz|unterwegs|reise|zitat|buch|schach|vr/.test(source)) return 'notizen';
    return 'projekte';
}

function normalizeBlogType(value, category = 'projekte') {
    const allowed = ['update', 'build-log', 'idee', 'experiment', 'notiz', 'unterwegs', 'case-study'];
    const normalized = String(value || '').trim().toLocaleLowerCase('de-DE');
    if (allowed.includes(normalized)) return normalized;
    if (category === 'ideen-arbeit') return 'idee';
    if (category === 'notizen') return 'notiz';
    return 'update';
}

function normalizeBlogTags(value, legacyTag = '') {
    const source = Array.isArray(value)
        ? value
        : String(value || legacyTag || '').split(',');
    const seen = new Set();
    return source
        .map(tag => String(tag || '').trim().replace(/^#+/, ''))
        .filter(tag => {
            const key = tag.toLocaleLowerCase('de-DE');
            if (!tag || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 3);
}

function isLegacyBlogSeed(blogItem) {
    return String(blogItem?.id) === '1'
        && String(blogItem?.title || '').trim() === 'Eintauchen in modernes JavaScript und React';
}

function normalizeBlogs(value, previousBlogRevision) {
    let rawBlogs = normalizeCollection(value, defaultData.blogs);
    if (Number(previousBlogRevision || 0) < BLOG_REVISION) {
        rawBlogs = rawBlogs.map(blogItem => (
            isLegacyBlogSeed(blogItem) ? cloneData(defaultData.blogs[0]) : blogItem
        ));
    }

    let featuredAssigned = false;
    const usedSlugs = new Set();
    const normalizedBlogs = rawBlogs.map((blogItem, index) => {
        const legacyDescription = String(blogItem.desc || '').trim();
        const contentMarkdown = String(blogItem.contentMarkdown || blogItem.content || legacyDescription).trim();
        const excerpt = String(blogItem.excerpt || legacyDescription || contentMarkdown).trim();
        const category = normalizeBlogCategory(blogItem.category, blogItem.tag);
        const status = blogItem.status === 'draft' ? 'draft' : 'published';
        const requestedFeatured = status === 'published'
            && (blogItem.featured === true || (!('featured' in blogItem) && index === 0));
        const featured = requestedFeatured && !featuredAssigned;
        if (featured) featuredAssigned = true;
        const slugBase = normalizeBlogSlug(blogItem.slug, blogItem.title || blogItem.id || `beitrag-${index + 1}`);
        let slug = slugBase;
        let suffix = 2;
        while (usedSlugs.has(slug)) {
            slug = `${slugBase}-${suffix}`;
            suffix += 1;
        }
        usedSlugs.add(slug);
        const normalizedBlog = {
            ...cloneData(blogItem),
            id: blogItem.id ?? `blog-restored-${index + 1}`,
            slug,
            title: String(blogItem.title || 'Beitrag').trim(),
            publishedAt: normalizeBlogPublishedAt(blogItem.publishedAt || blogItem.date),
            updatedAt: String(blogItem.updatedAt || '').trim(),
            status,
            category,
            type: normalizeBlogType(blogItem.type, category),
            tags: normalizeBlogTags(blogItem.tags, blogItem.tag),
            excerpt,
            contentMarkdown,
            cover: getSafeImageUrl(blogItem.cover || blogItem.img),
            coverAlt: String(blogItem.coverAlt || '').trim(),
            result: String(blogItem.result || '').trim(),
            nextStep: String(blogItem.nextStep || '').trim(),
            featured
        };
        delete normalizedBlog.desc;
        delete normalizedBlog.content;
        delete normalizedBlog.date;
        delete normalizedBlog.tag;
        delete normalizedBlog.img;
        delete normalizedBlog.externalUrl;
        delete normalizedBlog.externalLabel;
        delete normalizedBlog.telegramUrl;
        return normalizedBlog;
    });

    if (!featuredAssigned) {
        const firstPublished = normalizedBlogs.find(blogItem => blogItem.status === 'published');
        if (firstPublished) firstPublished.featured = true;
    }
    return normalizedBlogs;
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
        schemaVersion: 9,
        profile: {
            ...cloneData(defaultData.profile),
            ...profileSource,
            name: String(profileSource.name ?? defaultData.profile.name),
            role: String(profileSource.role ?? defaultData.profile.role),
            images,
            slideshowActive: profileSource.slideshowActive !== false,
            slideshowInterval: Number.isFinite(interval) ? Math.max(1, Math.min(60, Math.round(interval))) : defaultData.profile.slideshowInterval
        },
        projectsRevision: PROJECT_SHOWCASE_REVISION,
        projectsContent: normalizeProjectsContent(source.projectsContent),
        projectsLayout: normalizeProjectsLayout(source.projectsLayout),
        projects: migrateProjectShowcaseData(
            normalizeCollection(source.projects, defaultData.projects),
            source.projectsRevision
        ),
        libraryRevision: LIBRARY_REVISION,
        books: normalizeLibraryBooks(source.books, source.schemaVersion, source.libraryRevision),
        documentsRevision: DOCUMENTS_REVISION,
        documentsContent: normalizeDocumentsContent(source.documentsContent),
        documents: normalizeDocuments(source.documents, source.documentsRevision),
        blogRevision: BLOG_REVISION,
        blogContent: normalizeBlogContent(source.blogContent),
        blogs: normalizeBlogs(source.blogs, source.blogRevision),
        about: migrateAboutData(source.about)
    };

    normalized = migrateEducationData(normalized);
    return normalized;
}

function getBundledSiteData() {
    return cloneData(isPlainObject(window.GX_BUNDLED_SITE_DATA)
        ? window.GX_BUNDLED_SITE_DATA
        : defaultData);
}

async function loadPublishedData() {
    const bundledData = getBundledSiteData();
    // A classic-script snapshot also works when index.html is opened directly.
    if (!['http:', 'https:'].includes(window.location.protocol)) return bundledData;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        // Resolve relative to index.html, including GitHub Pages project paths.
        const response = await fetch(new URL('data.json', document.baseURI), {
            cache: 'no-cache',
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`data.json: HTTP ${response.status}`);
        const publishedData = await response.json();
        if (!isPlainObject(publishedData)) throw new Error('data.json muss ein Objekt enthalten.');
        return publishedData;
    } catch (error) {
        console.warn('data.json konnte nicht geladen werden. Mitgelieferte Daten werden verwendet:', error);
        return bundledData;
    } finally {
        clearTimeout(timeout);
    }
}

let state = {
    data: getBundledSiteData(),
    expanded: { projects: false, books: false, documents: false }
};

// Загрузка данных
async function loadData() {
    const publishedData = await loadPublishedData();
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
            state.data = cloneData(publishedData);
            showToast('Gespeicherte Daten waren beschädigt. Die Daten der Website wurden geladen.', 'error');
        }
    } else {
        state.data = cloneData(publishedData);
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
