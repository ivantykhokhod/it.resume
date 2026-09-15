/* Library rendering, moving shelf and full catalogue drawer. */

let libraryDrawerOpen = false;
let libraryDrawerCloseTimer = null;
let librarySearchQuery = '';
let libraryDrawerReturnFocus = null;

function getDefaultLibraryContent() {
    return {
        sectionTitle: 'Bibliothek',
        favoritesTitle: 'Fünf, die bleiben',
        streamTitle: 'Gelesen',
        allBooksLabel: 'Alle Bücher',
        archiveTitle: 'Alle Bücher',
        searchPlaceholder: 'Titel oder Autor …',
        emptySearch: 'Kein Buch gefunden.',
        emptyStream: 'Für dieses Jahr wurden noch keine Bücher eingetragen.',
        takeawayLabel: 'Was ich mitgenommen habe',
        applicationLabel: 'Wie ich es nutze',
        emptyNotes: 'Persönliche Notizen werden später ergänzt.'
    };
}

function normalizeLibraryContent(value) {
    const source = value && typeof value === 'object' ? value : {};
    return Object.fromEntries(Object.entries(getDefaultLibraryContent()).map(([key, fallback]) => [
        key, typeof source[key] === 'string' && source[key].trim() ? source[key].trim() : fallback
    ]));
}

function renderLibraryContent() {
    const content = normalizeLibraryContent(state.data.libraryContent);
    document.querySelectorAll('[data-library-text]').forEach(element => {
        const text = content[element.dataset.libraryText];
        if (text !== undefined && element.textContent !== text) element.textContent = text;
    });
    const search = document.getElementById('library-search-input');
    if (search) search.placeholder = content.searchPlaceholder;
    const emptyStream = document.querySelector('.library-stream-empty');
    if (emptyStream) emptyStream.textContent = content.emptyStream;
}

function openLibraryAdmin(options = {}) {
    if (!isAdmin) return;
    openAdminStudio('library', options);
}

function getLibraryBooks() {
    return Array.isArray(state.data.books) ? state.data.books : [];
}

function isLibraryPlaceholder(book) {
    return Boolean(book?.isPlaceholder) || (!String(book?.title || '').trim() && String(book?.id || '').startsWith('library-slot-'));
}

function getLibraryBookLabel(book) {
    if (isLibraryPlaceholder(book)) return 'Freier Buchplatz';
    const title = String(book?.title || 'Buch').trim();
    const author = String(book?.author || '').trim();
    return author ? `${title} von ${author}` : title;
}

function renderLibraryCoverVisual(book) {
    const imageUrl = getSafeImageUrl(book?.img || book?.cover);
    const alt = escapeHtml(book?.coverAlt || `Cover: ${book?.title || 'Buch'}`);
    if (imageUrl) {
        return `<span class="library-cover"><img src="${escapeHtml(imageUrl)}" alt="${alt}" loading="lazy" decoding="async"></span>`;
    }

    return `
        <span class="library-cover">
            <span class="library-cover-placeholder" aria-hidden="true">
                <i data-lucide="book-open"></i>
            </span>
        </span>
    `;
}

function renderLibraryBookButton(book, { duplicate = false } = {}) {
    const id = encodeInlineId(book?.id);
    const placeholder = isLibraryPlaceholder(book);
    const tabindex = duplicate ? ' tabindex="-1"' : '';
    const ariaHidden = duplicate ? ' aria-hidden="true"' : '';
    const disabled = placeholder && !isAdmin ? ' disabled aria-disabled="true"' : '';
    return `
        <button type="button"
            class="library-book-button${placeholder ? ' is-placeholder' : ''}"
            onclick="openLibraryBook(decodeURIComponent('${id}'));"
            aria-label="${escapeHtml(getLibraryBookLabel(book))}"
            title="${escapeHtml(getLibraryBookLabel(book))}"${tabindex}${ariaHidden}${disabled}>
            ${renderLibraryCoverVisual(book)}
        </button>
    `;
}

function getFavoriteLibraryBooks() {
    return getLibraryBooks()
        .filter(book => book?.top === true || normalizeLibraryTopPosition(book?.topPosition) !== null)
        .sort((first, second) => Number(first.topPosition || 99) - Number(second.topPosition || 99))
        .slice(0, 5);
}

function renderBooks() {
    renderLibraryContent();
    const favoritesContainer = document.getElementById('top-books-container');
    const streamContainer = document.getElementById('books-container');
    if (!favoritesContainer || !streamContainer) return;

    const books = getLibraryBooks();
    const favorites = getFavoriteLibraryBooks();
    favoritesContainer.innerHTML = favorites.map(book => `
        <div class="library-favorite-slot">
            ${renderLibraryBookButton(book)}
        </div>
    `).join('');

    const realBooks = books.filter(book => !isLibraryPlaceholder(book));
    const currentYear = new Date().getFullYear();
    const booksWithReadYear = realBooks.filter(book => normalizeLibraryReadYear(book?.readYear, book?.dateFinished));
    const booksReadThisYear = booksWithReadYear.filter(book => normalizeLibraryReadYear(book?.readYear, book?.dateFinished) === currentYear);
    const streamBooks = booksReadThisYear.length
        ? booksReadThisYear
        : (booksWithReadYear.length ? [] : (realBooks.length ? realBooks : (books.length ? books : favorites)));

    if (!streamBooks.length) {
        streamContainer.innerHTML = `<p class="library-stream-empty">${escapeHtml(normalizeLibraryContent(state.data.libraryContent).emptyStream)}</p>`;
        bindLibraryUi();
        if (libraryDrawerOpen) renderAllLibraryBooks();
        refreshIcons();
        return;
    }

    const repetitions = Math.max(1, Math.ceil(18 / Math.max(1, streamBooks.length)));
    const loopBooks = Array.from({ length: repetitions }, () => streamBooks).flat();
    const primaryGroup = loopBooks.map((book, index) => renderLibraryBookButton(book, { duplicate: index >= streamBooks.length })).join('');
    const duplicateGroup = loopBooks.map(book => renderLibraryBookButton(book, { duplicate: true })).join('');
    const duration = Math.max(32, Math.min(180, loopBooks.length * 2.7));

    streamContainer.innerHTML = `
        <div class="library-marquee-track" style="--library-marquee-duration: ${duration}s">
            <div class="library-marquee-group">${primaryGroup}</div>
            <div class="library-marquee-group" aria-hidden="true">${duplicateGroup}</div>
        </div>
    `;

    bindLibraryUi();
    if (libraryDrawerOpen) renderAllLibraryBooks();
    refreshIcons();
}

function openLibraryBook(bookId) {
    const book = findItemByTypeAndId('book', bookId);
    if (!book) return;

    if (isLibraryPlaceholder(book)) {
        if (isAdmin) {
            playClickSound();
            openLibraryAdmin({ tabId: 'favorites', position: book.topPosition });
        }
        return;
    }

    playClickSound();
    if (isAdmin) {
        openLibraryAdmin({ itemId: bookId, tabId: 'books' });
        return;
    }

    openViewModal('book', bookId);
}

function normalizeLibrarySearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('de-DE')
        .trim();
}

function libraryBookMatchesSearch(book, query) {
    if (!query) return true;
    if (isLibraryPlaceholder(book)) return false;
    const content = [
        book.title,
        book.author,
        book.originalTitle,
        book.readYear,
        book.category,
        book.language,
        book.takeaway,
        book.application,
        book.notes
    ].map(normalizeLibrarySearchText).join(' ');
    return content.includes(query);
}

function renderLibraryAdminActions(book) {
    if (!isAdmin) return '';
    const id = encodeInlineId(book?.id);

    return `
        <div class="library-card-admin admin-only">
            <button type="button" onclick="event.stopPropagation(); openLibraryBook(decodeURIComponent('${id}'));" aria-label="Buch bearbeiten">
                <i data-lucide="edit-2" aria-hidden="true"></i>
            </button>
        </div>
    `;
}

function renderLibraryAllCard(book) {
    const placeholder = isLibraryPlaceholder(book);
    const title = placeholder ? '&nbsp;' : escapeHtml(book?.title || 'Buch');
    const author = placeholder ? '&nbsp;' : escapeHtml(book?.author || '');
    return `
        <article class="library-all-card${placeholder ? ' is-placeholder' : ''}">
            ${renderLibraryAdminActions(book)}
            ${renderLibraryBookButton(book)}
            <div class="library-all-card-caption"${placeholder ? ' aria-hidden="true"' : ''}>
                <strong>${title}</strong>
                <span>${author}</span>
            </div>
        </article>
    `;
}

function renderAllLibraryBooks() {
    const container = document.getElementById('library-all-container');
    const empty = document.getElementById('library-empty-search');
    if (!container || !empty) return;

    const query = normalizeLibrarySearchText(librarySearchQuery);
    const allBooks = getLibraryBooks();
    const realBooks = allBooks.filter(book => !isLibraryPlaceholder(book));
    const visibleSource = realBooks.length ? realBooks : allBooks;
    const books = visibleSource.filter(book => libraryBookMatchesSearch(book, query));
    container.innerHTML = books.map(renderLibraryAllCard).join('');
    container.hidden = books.length === 0;
    empty.hidden = books.length !== 0;
    refreshIcons();
}

function getLibraryDrawer() {
    const drawer = document.getElementById('library-drawer');
    if (drawer && drawer.parentElement !== document.body) document.body.appendChild(drawer);
    return drawer;
}

function setLibraryDrawerOpen(open, { immediate = false } = {}) {
    const drawer = getLibraryDrawer();
    const toggle = document.getElementById('library-open-all');
    if (!drawer || !toggle) return;

    clearTimeout(libraryDrawerCloseTimer);
    libraryDrawerOpen = Boolean(open);
    toggle.setAttribute('aria-expanded', String(libraryDrawerOpen));
    drawer.setAttribute('aria-hidden', String(!libraryDrawerOpen));
    document.body.classList.toggle('library-drawer-open', libraryDrawerOpen);

    if (libraryDrawerOpen) {
        if (typeof setProjectsDrawerOpen === 'function') setProjectsDrawerOpen(false, { immediate: true });
        libraryDrawerReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : toggle;
        drawer.hidden = false;
        renderAllLibraryBooks();
        requestAnimationFrame(() => {
            drawer.classList.add('is-open');
            drawer.querySelector('.library-drawer-close')?.focus({ preventScroll: true });
        });
        return;
    }

    drawer.classList.remove('is-open');
    closeLibrarySearch({ clear: true });
    const finishClose = () => {
        if (libraryDrawerOpen) return;
        drawer.hidden = true;
        if (libraryDrawerReturnFocus && document.contains(libraryDrawerReturnFocus)) {
            libraryDrawerReturnFocus.focus({ preventScroll: true });
        }
        libraryDrawerReturnFocus = null;
    };
    if (immediate) finishClose();
    else libraryDrawerCloseTimer = setTimeout(finishClose, 340);
}

function openLibrarySearch() {
    const search = document.querySelector('[data-library-search]');
    const toggle = document.getElementById('library-search-toggle');
    const input = document.getElementById('library-search-input');
    if (!search || !toggle || !input) return;

    search.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Suche schließen');
    requestAnimationFrame(() => input.focus({ preventScroll: true }));
}

function closeLibrarySearch({ clear = false } = {}) {
    const search = document.querySelector('[data-library-search]');
    const toggle = document.getElementById('library-search-toggle');
    const input = document.getElementById('library-search-input');
    if (!search || !toggle || !input) return;

    if (clear) {
        input.value = '';
        librarySearchQuery = '';
        if (libraryDrawerOpen) renderAllLibraryBooks();
    }
    search.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Suche öffnen');
}

function toggleLibrarySearch() {
    const search = document.querySelector('[data-library-search]');
    const input = document.getElementById('library-search-input');
    if (!search || !input) return;

    if (!search.classList.contains('is-open')) {
        openLibrarySearch();
        return;
    }

    if (input.value) {
        input.value = '';
        librarySearchQuery = '';
        renderAllLibraryBooks();
        input.focus({ preventScroll: true });
        return;
    }

    closeLibrarySearch();
}

function trapLibraryDrawerFocus(event) {
    if (!libraryDrawerOpen || event.key !== 'Tab') return;
    if (document.body.classList.contains('admin-studio-open')) return;
    const globalOverlay = document.getElementById('global-modal');
    if (globalOverlay && !globalOverlay.classList.contains('hidden')) return;
    const panel = document.querySelector('.library-drawer-panel');
    if (!panel) return;

    const focusable = [...panel.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(element => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

function bindLibraryUi() {
    const drawer = getLibraryDrawer();
    const openButton = document.getElementById('library-open-all');
    const searchToggle = document.getElementById('library-search-toggle');
    const searchInput = document.getElementById('library-search-input');

    if (openButton && !openButton.dataset.libraryBound) {
        openButton.dataset.libraryBound = 'true';
        openButton.addEventListener('click', () => {
            setLibraryDrawerOpen(true);
            playClickSound();
        });
    }

    if (drawer && !drawer.dataset.libraryBound) {
        drawer.dataset.libraryBound = 'true';
        drawer.querySelectorAll('[data-library-close]').forEach(button => {
            button.addEventListener('click', () => setLibraryDrawerOpen(false));
        });
    }

    if (searchToggle && !searchToggle.dataset.libraryBound) {
        searchToggle.dataset.libraryBound = 'true';
        searchToggle.addEventListener('click', toggleLibrarySearch);
    }

    if (searchInput && !searchInput.dataset.libraryBound) {
        searchInput.dataset.libraryBound = 'true';
        searchInput.addEventListener('input', () => {
            librarySearchQuery = searchInput.value;
            renderAllLibraryBooks();
        });
    }

    if (!document.documentElement.dataset.libraryKeyboardBound) {
        document.documentElement.dataset.libraryKeyboardBound = 'true';
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && libraryDrawerOpen) {
                const globalOverlay = document.getElementById('global-modal');
                if (!globalOverlay || globalOverlay.classList.contains('hidden')) {
                    event.preventDefault();
                    setLibraryDrawerOpen(false);
                }
                return;
            }
            trapLibraryDrawerFocus(event);
        });
    }
}

function formatLibraryDate(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return String(value || '').trim();
    return `${match[3]}.${match[2]}.${match[1]}`;
}

function getLibraryMediumLabel(value) {
    const labels = { book: 'Buch', audiobook: 'Hörbuch', ebook: 'E-Book' };
    return labels[String(value || '').toLowerCase()] || '';
}

function renderLibraryBookDetail(book) {
    const content = normalizeLibraryContent(state.data.libraryContent);
    const title = escapeHtml(book?.title || 'Buch');
    const author = escapeHtml(book?.author || '');
    const takeaway = String(book?.takeaway || book?.notes || '').trim();
    const application = String(book?.application || '').trim();
    const finishedDate = formatLibraryDate(book?.dateFinished);
    const readYear = normalizeLibraryReadYear(book?.readYear, book?.dateFinished);
    const meta = [
        getLibraryMediumLabel(book?.medium),
        finishedDate || (readYear ? `Gelesen ${readYear}` : ''),
        String(book?.category || '').trim(),
        String(book?.language || '').trim()
    ].filter(Boolean);
    const notes = [
        takeaway ? { title: content.takeawayLabel, text: takeaway } : null,
        application ? { title: content.applicationLabel, text: application } : null
    ].filter(Boolean);

    return `
        <article class="library-detail">
            <button type="button" onclick="closeModal(); playClickSound();" class="library-detail-close" aria-label="Buch schließen">
                <i data-lucide="x" aria-hidden="true"></i>
            </button>
            <div class="library-detail-cover">
                ${renderLibraryCoverVisual(book)}
            </div>
            <div class="library-detail-content">
                ${meta.length ? `<div class="library-detail-kicker">${meta.map(item => `<span>${escapeHtml(item)}</span>`).join('<span aria-hidden="true">/</span>')}</div>` : ''}
                <h3>${title}</h3>
                ${author ? `<p class="library-detail-author">${author}</p>` : ''}
                ${notes.length ? `
                    <div class="library-detail-notes">
                        ${notes.map(note => `
                            <section class="library-detail-note">
                                <h4>${escapeHtml(note.title)}</h4>
                                <p>${escapeHtml(note.text)}</p>
                            </section>
                        `).join('')}
                    </div>
                ` : `<p class="library-detail-empty">${escapeHtml(content.emptyNotes)}</p>`}
            </div>
        </article>
    `;
}
