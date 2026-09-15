const BLOG_CATEGORIES = Object.freeze([
    { key: 'projekte', label: 'Projekte', description: 'Updates, Entscheidungen und Fehler aus meinen Projekten.', icon: 'blocks' },
    { key: 'ideen-arbeit', label: 'Ideen & Arbeit', description: 'Wie aus Gedanken prüfbare Entwürfe und Produkte werden.', icon: 'lightbulb' },
    { key: 'notizen', label: 'Notizen', description: 'Kurze Beobachtungen, Bücher, Zitate und Wege dazwischen.', icon: 'notebook-tabs' }
]);

const BLOG_TYPES = Object.freeze([
    { key: 'update', label: 'Update' },
    { key: 'build-log', label: 'Build Log' },
    { key: 'idee', label: 'Idee' },
    { key: 'experiment', label: 'Experiment' },
    { key: 'notiz', label: 'Notiz' },
    { key: 'unterwegs', label: 'Unterwegs' },
    { key: 'case-study', label: 'Case Study' }
]);

const BLOG_ARCHIVE_PAGE_SIZE = 20;
const BLOG_BASE_TITLE = document.title;
const BLOG_BASE_DESCRIPTION = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

let blogArchiveOpen = false;
let blogPostOpen = false;
let blogArchiveCloseTimer = null;
let blogPostCloseTimer = null;
let blogArchiveReturnFocus = null;
let blogPostReturnFocus = null;
let activeBlogPostId = null;
let activeBlogCategory = 'all';
let activeBlogYear = 'all';
let activeBlogType = 'all';
let blogSearchQuery = '';
let blogArchiveVisibleLimit = BLOG_ARCHIVE_PAGE_SIZE;

function getBlogUiContent() {
    return normalizeBlogContent(state.data.blogContent);
}

function getBlogCategories() {
    return getBlogUiContent().categories;
}

function getBlogTypes() {
    return getBlogUiContent().types;
}

function renderBlogStaticContent() {
    const content = getBlogUiContent();
    document.querySelectorAll('[data-blog-text]').forEach(element => {
        const text = content[element.dataset.blogText];
        if (text !== undefined && element.textContent !== text) element.textContent = text;
    });
    document.querySelectorAll('[data-blog-placeholder]').forEach(element => {
        const text = content[element.dataset.blogPlaceholder];
        if (text !== undefined && element.getAttribute('placeholder') !== text) element.setAttribute('placeholder', text);
    });
}

function openBlogAdmin(options = {}) {
    if (!isAdmin) return;
    openAdminStudio('blog', options);
}

function getBlogPosts({ includeDrafts = isAdmin } = {}) {
    const posts = Array.isArray(state.data.blogs) ? state.data.blogs : [];
    return posts
        .filter(post => includeDrafts || post.status !== 'draft')
        .map((post, index) => ({ post, index }))
        .sort((first, second) => {
            const firstDate = Date.parse(normalizeBlogPublishedAt(first.post.publishedAt));
            const secondDate = Date.parse(normalizeBlogPublishedAt(second.post.publishedAt));
            const firstValid = Number.isFinite(firstDate);
            const secondValid = Number.isFinite(secondDate);
            if (firstValid && secondValid && firstDate !== secondDate) return secondDate - firstDate;
            if (firstValid !== secondValid) return firstValid ? -1 : 1;
            return first.index - second.index;
        })
        .map(entry => entry.post);
}

function getFeaturedBlogPost(posts = getBlogPosts()) {
    return posts.find(post => post.status !== 'draft' && post.featured === true)
        || posts.find(post => post.status !== 'draft')
        || null;
}

function getBlogCategory(post) {
    const key = normalizeBlogCategory(post?.category, post?.tag);
    const categories = getBlogCategories();
    return categories.find(category => category.key === key) || categories[0];
}

function getBlogType(post) {
    const key = normalizeBlogType(post?.type, getBlogCategory(post).key);
    const types = getBlogTypes();
    return types.find(type => type.key === key) || types[0];
}

function getBlogContent(post) {
    return String(post?.contentMarkdown || post?.content || post?.desc || '').trim();
}

function getBlogSlug(post) {
    return normalizeBlogSlug(post?.slug, post?.title || post?.id || 'beitrag');
}

function getBlogTags(post) {
    return normalizeBlogTags(post?.tags, post?.tag);
}

function formatBlogDate(post) {
    const publishedAt = normalizeBlogPublishedAt(post?.publishedAt);
    if (!publishedAt) return getBlogUiContent().noDateLabel;
    const date = new Date(`${publishedAt}T12:00:00`);
    if (Number.isNaN(date.getTime())) return publishedAt;
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function getBlogYear(post) {
    const publishedAt = normalizeBlogPublishedAt(post?.publishedAt);
    return publishedAt ? publishedAt.slice(0, 4) : getBlogUiContent().archiveYearLabel;
}

function getBlogReadingMinutes(post) {
    const text = `${post?.excerpt || ''} ${getBlogContent(post)}`.replace(/[#>*_`[\]()]/g, ' ').trim();
    const words = text ? text.split(/\s+/u).filter(Boolean).length : 0;
    return Math.max(1, Math.ceil(words / 200));
}

function getBlogExcerpt(post) {
    const source = String(post?.excerpt || getBlogContent(post) || '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[*_`>]/g, '')
        .trim();
    return source.length <= 230 ? source : `${source.slice(0, 227).trimEnd()}…`;
}

function getBlogSequence(post) {
    const chronological = [...getBlogPosts({ includeDrafts: true })].reverse();
    const index = chronological.findIndex(item => String(item.id) === String(post?.id));
    return String(Math.max(1, index + 1)).padStart(2, '0');
}

function renderBlogMeta(post, { compact = false } = {}) {
    const content = getBlogUiContent();
    return `
        <span>${escapeHtml(formatBlogDate(post))}</span>
        <span aria-hidden="true">/</span>
        <span>${escapeHtml(getBlogCategory(post).label)}</span>
        ${compact ? '' : `<span aria-hidden="true">/</span><span>${escapeHtml(getBlogType(post).label)}</span>`}
        <span aria-hidden="true">/</span>
        <span>${getBlogReadingMinutes(post)} ${escapeHtml(content.minutesLabel)}</span>
        ${post?.status === 'draft' ? `<span class="blog-draft-badge">${escapeHtml(content.draftLabel)}</span>` : ''}
    `;
}

function renderBlogAdminActions(post, { inArchive = false } = {}) {
    if (!isAdmin) return '';
    const id = encodeInlineId(post?.id);
    return `
        <div class="blog-admin-actions${inArchive ? ' is-archive' : ''} admin-only">
            <button type="button" onclick="event.stopPropagation(); openBlogAdmin({ itemId: decodeURIComponent('${id}'), tabId: 'posts' }); playClickSound();" aria-label="Beitrag im Admin Studio bearbeiten"><i data-lucide="edit-2" aria-hidden="true"></i></button>
        </div>
    `;
}

function renderBlogCover(post, className = 'blog-featured-cover') {
    const id = encodeInlineId(post.id);
    const cover = getSafeImageUrl(post.cover || post.img);
    const category = getBlogCategory(post);
    const title = escapeHtml(post.title || 'Beitrag');
    if (cover) {
        return `
            <button type="button" class="${className} blog-cover has-image" onclick="openBlogPost(decodeURIComponent('${id}')); playClickSound();" aria-label="${title} lesen">
                <img src="${escapeHtml(cover)}" alt="${escapeHtml(post.coverAlt || '')}" width="960" height="720" loading="lazy" decoding="async">
                <span class="blog-cover-shade" aria-hidden="true"></span>
                <span class="blog-cover-code">${escapeHtml(category.label)} / ${getBlogSequence(post)}</span>
            </button>
        `;
    }
    return `
        <button type="button" class="${className} blog-cover is-poster" data-blog-tone="${escapeHtml(category.key)}" onclick="openBlogPost(decodeURIComponent('${id}')); playClickSound();" aria-label="${title} lesen">
            <span class="blog-poster-grid" aria-hidden="true"></span>
            <span class="blog-poster-code">${escapeHtml(getBlogUiContent().posterLabel)} / ${getBlogSequence(post)}</span>
            <span class="blog-poster-category">${escapeHtml(category.label)}</span>
            <span class="blog-poster-mark" aria-hidden="true">${getBlogSequence(post)}</span>
        </button>
    `;
}

function renderFeaturedBlogPost(post) {
    const content = getBlogUiContent();
    if (!post) {
        return `
            <article class="blog-featured is-empty">
                <div class="blog-featured-cover blog-cover is-poster" aria-hidden="true">
                    <span class="blog-poster-grid"></span>
                    <span class="blog-poster-category">${escapeHtml(content.emptyKicker)}</span><span class="blog-poster-mark">01</span>
                </div>
                <div class="blog-featured-copy">
                    <span class="blog-featured-label">${escapeHtml(content.emptyKicker)}</span>
                    <h3>${escapeHtml(content.emptyTitle)}</h3>
                    <p>${escapeHtml(content.emptyText)}</p>
                </div>
            </article>
        `;
    }
    const id = encodeInlineId(post.id);
    return `
        <article class="blog-featured">
            ${renderBlogAdminActions(post)}
            ${renderBlogCover(post)}
            <div class="blog-featured-copy">
                <span class="blog-featured-label">${escapeHtml(content.currentPostLabel)}</span>
                <div class="blog-meta">${renderBlogMeta(post)}</div>
                <button type="button" class="blog-featured-title" onclick="openBlogPost(decodeURIComponent('${id}')); playClickSound();">${escapeHtml(post.title || 'Beitrag')}</button>
                <p>${escapeHtml(getBlogExcerpt(post))}</p>
                <button type="button" class="blog-read-link" onclick="openBlogPost(decodeURIComponent('${id}')); playClickSound();"><span>${escapeHtml(content.readPostLabel)}</span><i data-lucide="arrow-up-right" aria-hidden="true"></i></button>
            </div>
        </article>
    `;
}

function renderBlogThemePanel(posts) {
    const content = getBlogUiContent();
    const categories = getBlogCategories();
    const categoryButtons = categories.map((category, index) => {
        const count = posts.filter(post => getBlogCategory(post).key === category.key).length;
        return `
            <button type="button" class="blog-theme-button" onclick="openBlogArchive('${category.key}'); playClickSound();" ${count ? '' : 'disabled'}>
                <span class="blog-theme-number">${String(index + 1).padStart(2, '0')}</span>
                <span class="blog-theme-copy"><strong>${escapeHtml(category.label)}</strong><span>${escapeHtml(category.description)}</span></span>
                <span class="blog-theme-count">${String(count).padStart(2, '0')}</span><i data-lucide="arrow-up-right" aria-hidden="true"></i>
            </button>
        `;
    }).join('');
    return `
        <aside class="blog-theme-panel" aria-labelledby="blog-themes-title">
            <header><div><span>${escapeHtml(content.orientationLabel)}</span><h3 id="blog-themes-title">${escapeHtml(content.themesTitle)}</h3></div><span>${String(categories.length).padStart(2, '0')}</span></header>
            <div class="blog-theme-list">${categoryButtons}</div>
            <button type="button" class="blog-archive-summary" onclick="openBlogArchive('all'); playClickSound();" ${posts.length ? '' : 'disabled'}>
                <span><small>${escapeHtml(content.archiveSummaryLabel)}</small><strong>${String(posts.length).padStart(2, '0')} ${escapeHtml(posts.length === 1 ? content.archiveSingular : content.archivePlural)}</strong></span>
                <i data-lucide="arrow-right" aria-hidden="true"></i>
            </button>
        </aside>
    `;
}

function renderRecentBlogPost(post) {
    const id = encodeInlineId(post.id);
    return `
        <article class="blog-latest-item">
            ${renderBlogAdminActions(post)}
            <button type="button" onclick="openBlogPost(decodeURIComponent('${id}')); playClickSound();" aria-label="${escapeHtml(post.title || 'Beitrag')} lesen">
                <span class="blog-latest-index">${getBlogSequence(post)}</span>
                <span class="blog-latest-copy"><span>${escapeHtml(formatBlogDate(post))} · ${escapeHtml(getBlogType(post).label)}</span><strong>${escapeHtml(post.title || 'Beitrag')}</strong></span>
                <i data-lucide="arrow-up-right" aria-hidden="true"></i>
            </button>
        </article>
    `;
}

function renderBlogLatest(posts) {
    if (!posts.length) return '';
    const content = getBlogUiContent();
    return `
        <section class="blog-latest" aria-labelledby="blog-latest-title">
            <header><span>${escapeHtml(content.latestKicker)}</span><h3 id="blog-latest-title">${escapeHtml(content.latestTitle)}</h3></header>
            <div class="blog-latest-grid">${posts.map(renderRecentBlogPost).join('')}</div>
        </section>
    `;
}

function renderBlog() {
    const container = document.getElementById('blog-container');
    if (!container) return;
    renderBlogStaticContent();
    const content = getBlogUiContent();
    const categories = getBlogCategories();
    const posts = getBlogPosts();
    const featured = getFeaturedBlogPost(posts);
    const recent = posts.filter(post => post !== featured).slice(0, 3);
    container.innerHTML = `
        <div class="blog-purpose">
            <p>${escapeHtml(content.purposeText)}</p>
            <nav class="blog-topic-nav" aria-label="Blogthemen">
                ${categories.map(category => {
                    const count = posts.filter(post => getBlogCategory(post).key === category.key).length;
                    return `<button type="button" onclick="openBlogArchive('${category.key}'); playClickSound();" ${count ? '' : 'disabled'}>${escapeHtml(category.label)}</button>`;
                }).join('<span aria-hidden="true">/</span>')}
            </nav>
        </div>
        <div class="blog-overview-grid">${renderFeaturedBlogPost(featured)}${renderBlogThemePanel(posts)}</div>
        ${renderBlogLatest(recent)}
    `;
    const openAllButton = document.getElementById('blog-open-all');
    if (openAllButton) {
        openAllButton.hidden = posts.length === 0 && !isAdmin;
        openAllButton.setAttribute('aria-label', `Alle Blogbeiträge öffnen (${posts.length})`);
    }
    renderBlogArchive();
    bindBlogUi();
    refreshIcons();
}

function setBlogCategory(category) {
    activeBlogCategory = getBlogCategories().some(item => item.key === category) ? category : 'all';
    blogArchiveVisibleLimit = BLOG_ARCHIVE_PAGE_SIZE;
    renderBlogArchive();
}

function setBlogYear(year) {
    activeBlogYear = year || 'all';
    blogArchiveVisibleLimit = BLOG_ARCHIVE_PAGE_SIZE;
    renderBlogArchive();
}

function setBlogType(type) {
    activeBlogType = getBlogTypes().some(item => item.key === type) ? type : 'all';
    blogArchiveVisibleLimit = BLOG_ARCHIVE_PAGE_SIZE;
    renderBlogArchive();
}

function renderBlogFilterButton({ label, count = null, active = false, action }) {
    return `<button type="button" class="blog-filter${active ? ' is-active' : ''}" onclick="${action}; playClickSound();" aria-pressed="${active}">${escapeHtml(label)}${count === null ? '' : `<span>${count}</span>`}</button>`;
}

function renderBlogArchiveRow(post) {
    const id = encodeInlineId(post.id);
    const category = getBlogCategory(post);
    const type = getBlogType(post);
    const content = getBlogUiContent();
    return `
        <article class="blog-archive-row">
            <button type="button" class="blog-archive-open" onclick="openBlogPost(decodeURIComponent('${id}')); playClickSound();">
                <span class="blog-archive-date">${escapeHtml(formatBlogDate(post))}</span>
                <span class="blog-archive-copy">
                    <small>${escapeHtml(category.label)} / ${escapeHtml(type.label)}${post.status === 'draft' ? ` / ${escapeHtml(content.draftLabel)}` : ''}</small>
                    <strong>${escapeHtml(post.title || 'Beitrag')}</strong><span>${escapeHtml(getBlogExcerpt(post))}</span>
                </span>
                <span class="blog-archive-meta">${getBlogReadingMinutes(post)} ${escapeHtml(content.minutesLabel)}<br>${getBlogTags(post).slice(0, 2).map(tag => `#${escapeHtml(tag)}`).join(' ')}</span>
                <i data-lucide="arrow-up-right" aria-hidden="true"></i>
            </button>
            ${renderBlogAdminActions(post, { inArchive: true })}
        </article>
    `;
}

function renderBlogArchive() {
    const container = document.getElementById('blog-archive-container');
    const categoryFilters = document.getElementById('blog-filter-container');
    const yearFilters = document.getElementById('blog-year-filter-container');
    const typeFilters = document.getElementById('blog-type-filter-container');
    const empty = document.getElementById('blog-archive-empty');
    const loadMore = document.getElementById('blog-load-more');
    const search = document.getElementById('blog-search-input');
    const archiveCount = document.getElementById('blog-archive-count');
    if (!container || !categoryFilters || !yearFilters || !typeFilters || !empty || !loadMore) return;

    const content = getBlogUiContent();
    const categories = getBlogCategories();
    const types = getBlogTypes();
    const posts = getBlogPosts();
    const hasAdvancedTools = posts.length >= 12;
    const searchLabel = search?.closest('.blog-search');
    if (searchLabel) searchLabel.hidden = !hasAdvancedTools;
    yearFilters.hidden = !hasAdvancedTools;
    typeFilters.hidden = !hasAdvancedTools;
    if (!hasAdvancedTools) {
        blogSearchQuery = '';
        activeBlogYear = 'all';
        activeBlogType = 'all';
        if (search) search.value = '';
    }
    if (activeBlogCategory !== 'all' && !posts.some(post => getBlogCategory(post).key === activeBlogCategory)) activeBlogCategory = 'all';

    categoryFilters.innerHTML = [
        renderBlogFilterButton({ label: content.allFilterLabel, count: posts.length, active: activeBlogCategory === 'all', action: "setBlogCategory('all')" }),
        ...categories.map(category => ({ ...category, count: posts.filter(post => getBlogCategory(post).key === category.key).length }))
            .filter(category => category.count > 0)
            .map(category => renderBlogFilterButton({ label: category.label, count: category.count, active: activeBlogCategory === category.key, action: `setBlogCategory('${category.key}')` }))
    ].join('');

    const years = [...new Set(posts.map(getBlogYear))].sort((a, b) => String(b).localeCompare(String(a)));
    yearFilters.innerHTML = [
        renderBlogFilterButton({ label: content.allYearsLabel, active: activeBlogYear === 'all', action: "setBlogYear('all')" }),
        ...years.map(year => renderBlogFilterButton({ label: year, active: activeBlogYear === year, action: `setBlogYear('${encodeInlineId(year)}')` }))
    ].join('');

    const usedTypes = types.filter(type => posts.some(post => getBlogType(post).key === type.key));
    typeFilters.innerHTML = [
        renderBlogFilterButton({ label: content.allFormatsLabel, active: activeBlogType === 'all', action: "setBlogType('all')" }),
        ...usedTypes.map(type => renderBlogFilterButton({ label: type.label, active: activeBlogType === type.key, action: `setBlogType('${type.key}')` }))
    ].join('');

    const normalizedQuery = blogSearchQuery.trim().toLocaleLowerCase('de-DE');
    const visiblePosts = posts.filter(post => {
        if (activeBlogCategory !== 'all' && getBlogCategory(post).key !== activeBlogCategory) return false;
        if (activeBlogYear !== 'all' && getBlogYear(post) !== activeBlogYear) return false;
        if (activeBlogType !== 'all' && getBlogType(post).key !== activeBlogType) return false;
        if (!normalizedQuery) return true;
        const searchable = [post.title, post.excerpt, getBlogContent(post), getBlogCategory(post).label, getBlogType(post).label, ...getBlogTags(post)]
            .map(value => String(value || '').toLocaleLowerCase('de-DE')).join(' ');
        return searchable.includes(normalizedQuery);
    });

    const pagedPosts = visiblePosts.slice(0, blogArchiveVisibleLimit);
    const groups = new Map();
    pagedPosts.forEach(post => {
        const year = getBlogYear(post);
        if (!groups.has(year)) groups.set(year, []);
        groups.get(year).push(post);
    });
    container.innerHTML = [...groups.entries()].map(([year, yearPosts]) => `
        <section class="blog-year-group" aria-labelledby="blog-year-${escapeHtml(year)}">
            <header><h4 id="blog-year-${escapeHtml(year)}">${escapeHtml(year)}</h4><span>${String(yearPosts.length).padStart(2, '0')}</span></header>
            <div>${yearPosts.map(renderBlogArchiveRow).join('')}</div>
        </section>
    `).join('');

    if (archiveCount) archiveCount.textContent = posts.length
        ? `${posts.length} ${posts.length === 1 ? content.archiveSingular : content.archivePlural}`
        : content.archiveKicker;
    empty.textContent = content.emptyArchive;
    const loadMoreLabel = loadMore.querySelector('span');
    if (loadMoreLabel) loadMoreLabel.textContent = content.loadMoreLabel;
    empty.hidden = visiblePosts.length > 0;
    loadMore.hidden = pagedPosts.length >= visiblePosts.length;
    refreshIcons();
}

function openBlogArchive(category = 'all') {
    setBlogArchiveOpen(true, { category });
}

function getBlogArchiveDrawer() {
    const drawer = document.getElementById('blog-archive-drawer');
    if (drawer && drawer.parentElement !== document.body) document.body.appendChild(drawer);
    return drawer;
}

function getBlogPostDrawer() {
    const drawer = document.getElementById('blog-post-drawer');
    if (drawer && drawer.parentElement !== document.body) document.body.appendChild(drawer);
    return drawer;
}

function syncBlogBodyLock() {
    document.body.classList.toggle('blog-overlay-open', blogArchiveOpen || blogPostOpen);
}

function setBlogArchiveOpen(open, { immediate = false, category = 'all' } = {}) {
    const drawer = getBlogArchiveDrawer();
    const toggle = document.getElementById('blog-open-all');
    if (!drawer) return;
    clearTimeout(blogArchiveCloseTimer);
    blogArchiveOpen = Boolean(open);
    if (toggle) toggle.setAttribute('aria-expanded', String(blogArchiveOpen));
    drawer.setAttribute('aria-hidden', String(!blogArchiveOpen));
    if (blogArchiveOpen) {
        if (typeof setLibraryDrawerOpen === 'function') setLibraryDrawerOpen(false, { immediate: true });
        if (typeof setDocumentsDrawerOpen === 'function') setDocumentsDrawerOpen(false, { immediate: true });
        if (typeof setProjectsDrawerOpen === 'function') setProjectsDrawerOpen(false, { immediate: true });
        blogArchiveReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : toggle;
        blogSearchQuery = '';
        activeBlogCategory = getBlogCategories().some(item => item.key === category) ? category : 'all';
        activeBlogYear = 'all';
        activeBlogType = 'all';
        blogArchiveVisibleLimit = BLOG_ARCHIVE_PAGE_SIZE;
        const search = document.getElementById('blog-search-input');
        if (search) search.value = '';
        renderBlogArchive();
        drawer.hidden = false;
        syncBlogBodyLock();
        requestAnimationFrame(() => {
            drawer.classList.add('is-open');
            drawer.querySelector('.blog-archive-close')?.focus({ preventScroll: true });
        });
        return;
    }
    drawer.classList.remove('is-open');
    const finishClose = () => {
        if (blogArchiveOpen) return;
        drawer.hidden = true;
        syncBlogBodyLock();
        if (blogArchiveReturnFocus && document.contains(blogArchiveReturnFocus)) blogArchiveReturnFocus.focus({ preventScroll: true });
        blogArchiveReturnFocus = null;
    };
    if (immediate) finishClose();
    else blogArchiveCloseTimer = setTimeout(finishClose, 340);
}

function renderBlogInline(value) {
    return escapeHtml(value)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(new RegExp('\\*\\*([^*]+)\\*\\*', 'g'), '<strong>$1</strong>');
}

function renderBlogContent(value) {
    const source = String(value || '').trim();
    const wordCount = source.replace(/[#>*_`[\]()]/g, ' ').split(/\s+/u).filter(Boolean).length;
    const headings = [];
    const usedHeadingIds = new Set();
    const blocks = source.split(/\n{2,}/).map(block => block.trim()).filter(Boolean);
    const html = blocks.map(block => {
        const lines = block.split('\n').map(line => line.trimEnd());
        const headingMatch = lines.length === 1 ? lines[0].match(/^(##|###)\s+(.+)$/) : null;
        if (headingMatch) {
            const level = headingMatch[1].length;
            const label = headingMatch[2].trim();
            const baseId = `blog-heading-${normalizeBlogSlug(label, 'abschnitt')}`;
            let id = baseId;
            let suffix = 2;
            while (usedHeadingIds.has(id)) {
                id = `${baseId}-${suffix}`;
                suffix += 1;
            }
            usedHeadingIds.add(id);
            headings.push({ id, label, level });
            return `<h${level} id="${escapeHtml(id)}">${renderBlogInline(label)}</h${level}>`;
        }
        if (lines.every(line => /^[-*]\s+/.test(line))) return `<ul>${lines.map(line => `<li>${renderBlogInline(line.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`;
        if (lines.every(line => /^\d+\.\s+/.test(line))) return `<ol>${lines.map(line => `<li>${renderBlogInline(line.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
        if (lines.every(line => /^>\s?/.test(line))) return `<blockquote>${lines.map(line => renderBlogInline(line.replace(/^>\s?/, ''))).join('<br>')}</blockquote>`;
        return `<p>${lines.map(renderBlogInline).join('<br>')}</p>`;
    }).join('');
    return { html, headings, wordCount };
}

function scrollBlogHeading(headingId) {
    const scroll = document.getElementById('blog-post-scroll');
    const heading = document.getElementById(headingId);
    if (!scroll || !heading) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroll.scrollTo({ top: Math.max(0, heading.offsetTop - 96), behavior: reduceMotion ? 'auto' : 'smooth' });
}

function renderBlogRelatedPosts(post) {
    const content = getBlogUiContent();
    const related = getBlogPosts()
        .filter(item => String(item.id) !== String(post.id) && getBlogCategory(item).key === getBlogCategory(post).key)
        .slice(0, 2);
    if (!related.length) return '';
    return `
        <section class="blog-related" aria-labelledby="blog-related-title">
            <span>${escapeHtml(content.relatedKicker)}</span><h2 id="blog-related-title">${escapeHtml(content.relatedTitle)}</h2>
            <div>${related.map(item => {
                const id = encodeInlineId(item.id);
                return `<button type="button" onclick="openBlogPost(decodeURIComponent('${id}')); playClickSound();"><small>${escapeHtml(getBlogType(item).label)} · ${getBlogReadingMinutes(item)} ${escapeHtml(content.minutesLabel)}</small><strong>${escapeHtml(item.title || 'Beitrag')}</strong><i data-lucide="arrow-up-right" aria-hidden="true"></i></button>`;
            }).join('')}</div>
        </section>
    `;
}

function renderBlogPost(post) {
    const cover = getSafeImageUrl(post.cover || post.img);
    const content = renderBlogContent(getBlogContent(post));
    const category = getBlogCategory(post);
    const type = getBlogType(post);
    const showToc = content.headings.length > 0 && (content.headings.length >= 4 || content.wordCount >= 1600);
    const tags = getBlogTags(post);
    const uiContent = getBlogUiContent();
    const outcome = post.result || post.nextStep ? `
        <section class="blog-post-outcome" aria-label="Ergebnis und nächster Schritt">
            ${post.result ? `<div><span>${escapeHtml(uiContent.resultLabel)}</span><p>${escapeHtml(post.result)}</p></div>` : ''}
            ${post.nextStep ? `<div><span>${escapeHtml(uiContent.nextStepLabel)}</span><p>${escapeHtml(post.nextStep)}</p></div>` : ''}
        </section>
    ` : '';
    return `
        <article class="blog-post-article">
            <header class="blog-post-hero">
                <div class="blog-post-meta">${renderBlogMeta(post)}</div>
                <p class="blog-post-kicker">${escapeHtml(category.label)} / ${escapeHtml(type.label)}</p>
                <h1 id="blog-post-title">${escapeHtml(post.title || 'Beitrag')}</h1>
                ${post.excerpt ? `<p class="blog-post-lead">${escapeHtml(post.excerpt)}</p>` : ''}
                ${tags.length ? `<div class="blog-post-tags">${tags.map(tag => `<span>#${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
            </header>
            ${cover ? `<figure class="blog-post-image"><img src="${escapeHtml(cover)}" alt="${escapeHtml(post.coverAlt || '')}" width="1200" height="800" decoding="async"></figure>` : ''}
            <div class="blog-post-reading-layout${showToc ? ' has-toc' : ''}">
                <div class="blog-post-body">${content.html || `<p>${escapeHtml(uiContent.emptyPostText)}</p>`}</div>
                ${showToc ? `
                    <aside class="blog-post-toc" aria-labelledby="blog-toc-title">
                        <span id="blog-toc-title">${escapeHtml(uiContent.tocTitle)}</span>
                        ${content.headings.map((heading, index) => `<button type="button" class="${heading.level === 3 ? 'is-subheading' : ''}" onclick="scrollBlogHeading(decodeURIComponent('${encodeInlineId(heading.id)}'))"><small>${String(index + 1).padStart(2, '0')}</small><span>${escapeHtml(heading.label)}</span></button>`).join('')}
                    </aside>
                ` : ''}
            </div>
            ${outcome}
            ${renderBlogRelatedPosts(post)}
        </article>
    `;
}

function updateBlogReadingProgress() {
    const scroll = document.getElementById('blog-post-scroll');
    const progress = document.getElementById('blog-reading-progress');
    if (!scroll || !progress) return;
    const scrollableDistance = scroll.scrollHeight - scroll.clientHeight;
    const value = scrollableDistance <= 1 ? 1 : Math.max(0, Math.min(1, scroll.scrollTop / scrollableDistance));
    progress.style.transform = `scaleX(${value})`;
}

function upsertBlogMeta(selector, attributes, content) {
    let element = document.head.querySelector(selector);
    if (!element) {
        element = document.createElement('meta');
        Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
        element.dataset.blogDynamic = 'true';
        document.head.appendChild(element);
    }
    element.setAttribute('content', content);
}

function updateBlogDocumentHead(post) {
    const title = `${post.title || 'Beitrag'} | ${state.data.profile?.name || 'Ivan'}`;
    const description = getBlogExcerpt(post);
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    upsertBlogMeta('meta[property="og:title"]', { property: 'og:title' }, title);
    upsertBlogMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    upsertBlogMeta('meta[property="og:type"]', { property: 'og:type' }, 'article');
    const structuredData = document.createElement('script');
    structuredData.id = 'blog-post-structured-data';
    structuredData.type = 'application/ld+json';
    const cover = getSafeImageUrl(post.cover || post.img);
    structuredData.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title || 'Beitrag',
        description,
        datePublished: normalizeBlogPublishedAt(post.publishedAt) || undefined,
        dateModified: post.updatedAt || normalizeBlogPublishedAt(post.publishedAt) || undefined,
        author: { '@type': 'Person', name: state.data.profile?.name || 'Ivan' },
        image: cover ? new URL(cover, window.location.href).href : undefined,
        url: window.location.href
    });
    document.getElementById('blog-post-structured-data')?.remove();
    document.head.appendChild(structuredData);
}

function restoreBlogDocumentHead() {
    document.title = BLOG_BASE_TITLE;
    document.querySelector('meta[name="description"]')?.setAttribute('content', BLOG_BASE_DESCRIPTION);
    document.querySelectorAll('meta[data-blog-dynamic="true"]').forEach(element => element.remove());
    document.getElementById('blog-post-structured-data')?.remove();
}

function getBlogPostByIdentifier(identifier) {
    const value = String(identifier ?? '');
    return getBlogPosts({ includeDrafts: isAdmin }).find(post => String(post.id) === value || getBlogSlug(post) === value) || null;
}

function getBlogSlugFromHash() {
    const match = window.location.hash.match(/^#blog\/(.+)$/);
    if (!match) return '';
    try { return decodeURIComponent(match[1]); } catch (error) { return ''; }
}

function openBlogPost(identifier, { updateRoute = true } = {}) {
    const post = getBlogPostByIdentifier(identifier);
    const drawer = getBlogPostDrawer();
    const content = document.getElementById('blog-post-content');
    const scroll = document.getElementById('blog-post-scroll');
    const toolbarMeta = document.getElementById('blog-post-toolbar-meta');
    if (!post || !drawer || !content || !scroll || (post.status === 'draft' && !isAdmin)) return;
    if (blogArchiveOpen) setBlogArchiveOpen(false, { immediate: true });
    clearTimeout(blogPostCloseTimer);
    if (!blogPostOpen) blogPostReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : document.getElementById('blog-open-all');
    activeBlogPostId = post.id;
    content.innerHTML = renderBlogPost(post);
    if (toolbarMeta) toolbarMeta.innerHTML = `<span>${escapeHtml(getBlogCategory(post).label)}</span><span>${escapeHtml(formatBlogDate(post))}</span><span>${getBlogReadingMinutes(post)} ${escapeHtml(getBlogUiContent().minutesLabel)}</span>`;
    scroll.scrollTop = 0;
    blogPostOpen = true;
    drawer.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    syncBlogBodyLock();
    if (updateRoute) {
        const nextHash = `#blog/${encodeURIComponent(getBlogSlug(post))}`;
        if (window.location.hash !== nextHash) window.history.pushState({ blogPost: post.id }, '', nextHash);
    }
    updateBlogDocumentHead(post);
    requestAnimationFrame(() => {
        drawer.classList.add('is-open');
        updateBlogReadingProgress();
        drawer.querySelector('[data-blog-post-close]')?.focus({ preventScroll: true });
    });
    refreshIcons();
}

function setBlogPostOpen(open, { immediate = false, preserveRoute = false } = {}) {
    const drawer = getBlogPostDrawer();
    if (!drawer) return;
    clearTimeout(blogPostCloseTimer);
    blogPostOpen = Boolean(open);
    drawer.setAttribute('aria-hidden', String(!blogPostOpen));
    if (blogPostOpen) return;
    drawer.classList.remove('is-open');
    if (!preserveRoute && getBlogSlugFromHash()) window.history.replaceState(null, '', '#blog');
    restoreBlogDocumentHead();
    const finishClose = () => {
        if (blogPostOpen) return;
        drawer.hidden = true;
        activeBlogPostId = null;
        syncBlogBodyLock();
        if (blogPostReturnFocus && document.contains(blogPostReturnFocus)) blogPostReturnFocus.focus({ preventScroll: true });
        blogPostReturnFocus = null;
    };
    if (immediate) finishClose();
    else blogPostCloseTimer = setTimeout(finishClose, 360);
}

function syncBlogRouteFromHash() {
    const slug = getBlogSlugFromHash();
    if (slug) {
        const post = getBlogPostByIdentifier(slug);
        if (post && (!blogPostOpen || String(activeBlogPostId) !== String(post.id))) openBlogPost(post.id, { updateRoute: false });
        return;
    }
    if (blogPostOpen) setBlogPostOpen(false, { immediate: true, preserveRoute: true });
}

function trapBlogFocus(event) {
    if (document.body.classList.contains('admin-studio-open')) return;
    if (event.key !== 'Tab' || (!blogArchiveOpen && !blogPostOpen)) return;
    const panel = blogPostOpen ? document.querySelector('.blog-post-panel') : document.querySelector('.blog-drawer-panel');
    if (!panel) return;
    const focusable = [...panel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(element => element.offsetParent !== null);
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

function bindBlogUi() {
    const archiveDrawer = getBlogArchiveDrawer();
    const postDrawer = getBlogPostDrawer();
    const openButton = document.getElementById('blog-open-all');
    const search = document.getElementById('blog-search-input');
    const loadMore = document.getElementById('blog-load-more');
    if (openButton && !openButton.dataset.blogBound) {
        openButton.dataset.blogBound = 'true';
        openButton.addEventListener('click', () => { openBlogArchive('all'); playClickSound(); });
    }
    if (archiveDrawer && !archiveDrawer.dataset.blogBound) {
        archiveDrawer.dataset.blogBound = 'true';
        archiveDrawer.querySelectorAll('[data-blog-archive-close]').forEach(button => button.addEventListener('click', () => setBlogArchiveOpen(false)));
    }
    if (postDrawer && !postDrawer.dataset.blogBound) {
        postDrawer.dataset.blogBound = 'true';
        postDrawer.querySelectorAll('[data-blog-post-close]').forEach(button => button.addEventListener('click', () => setBlogPostOpen(false)));
        document.getElementById('blog-post-scroll')?.addEventListener('scroll', updateBlogReadingProgress, { passive: true });
    }
    if (search && !search.dataset.blogBound) {
        search.dataset.blogBound = 'true';
        search.addEventListener('input', event => {
            blogSearchQuery = event.target.value;
            blogArchiveVisibleLimit = BLOG_ARCHIVE_PAGE_SIZE;
            renderBlogArchive();
        });
    }
    if (loadMore && !loadMore.dataset.blogBound) {
        loadMore.dataset.blogBound = 'true';
        loadMore.addEventListener('click', () => {
            blogArchiveVisibleLimit += BLOG_ARCHIVE_PAGE_SIZE;
            renderBlogArchive();
            playClickSound();
        });
    }
    if (!document.documentElement.dataset.blogKeyboardBound) {
        document.documentElement.dataset.blogKeyboardBound = 'true';
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && blogPostOpen) {
                event.preventDefault();
                setBlogPostOpen(false);
                return;
            }
            if (event.key === 'Escape' && blogArchiveOpen) {
                event.preventDefault();
                setBlogArchiveOpen(false);
                return;
            }
            trapBlogFocus(event);
        });
    }
    if (!document.documentElement.dataset.blogRouteBound) {
        document.documentElement.dataset.blogRouteBound = 'true';
        window.addEventListener('hashchange', syncBlogRouteFromHash);
        requestAnimationFrame(syncBlogRouteFromHash);
    }
}
