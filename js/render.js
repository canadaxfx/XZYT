// === VIDEO MODAL REGISTRY ===
window._vmVideos = {};
window._vmCounter = 0;

function _regVideo(title, ytUrl, r2Url) {
    var key = 'v' + (window._vmCounter++);
    window._vmVideos[key] = { title: title, ytUrl: ytUrl || null, r2Url: r2Url || null };
    return key;
}

function _getYtId(url) {
    if (!url) return null;
    var m = url.match(/[?&]v=([^&]+)/);
    if (m) return m[1];
    m = url.match(/\/embed\/([^?&]+)/);
    if (m) return m[1];
    return null;
}

// Derive R2 thumbnail from video URL using the autosync convention:
// https://domain/full/filename.mp4  →  https://domain/thumbs/filename_m.jpg
function _getR2Thumb(r2Url) {
    if (!r2Url) return null;
    try {
        var u = new URL(r2Url);
        var basename = u.pathname.split('/').pop().replace(/\.[^.]+$/, '');
        return u.origin + '/thumbs/' + basename + '_m.jpg';
    } catch(e) { return null; }
}

// === EPISODE PAGINATION ===
window._dramaEps = {};  // dramaId → episodes[]
window._epPages  = {};  // dramaId → currentPage

var EP_PER_PAGE   = 24;
var EP_PREVIEW    = 6;   // shown in the horizontal strip

function renderEpisodesPage(dramaId, page) {
    var eps = window._dramaEps[dramaId] || [];
    var totalPages = Math.ceil(eps.length / EP_PER_PAGE);
    page = Math.max(0, Math.min(page, totalPages - 1));
    window._epPages[dramaId] = page;

    var start   = page * EP_PER_PAGE;
    var pageEps = eps.slice(start, start + EP_PER_PAGE);

    var grid = document.getElementById(dramaId + '-grid');
    if (grid) grid.innerHTML = pageEps.map(function(ep) { return createEpisodePreview(ep); }).join('');

    var navHtml = totalPages <= 1 ? '' :
        '<div class="ep-page-controls">' +
            '<button class="ep-page-btn" onclick="renderEpisodesPage(\'' + dramaId + '\',' + (page - 1) + ')" ' + (page === 0 ? 'disabled' : '') + '>‹ Prev</button>' +
            '<span class="ep-page-info">Page ' + (page + 1) + ' of ' + totalPages + ' &nbsp;·&nbsp; ' + eps.length + ' videos</span>' +
            '<button class="ep-page-btn" onclick="renderEpisodesPage(\'' + dramaId + '\',' + (page + 1) + ')" ' + (page >= totalPages - 1 ? 'disabled' : '') + '>Next ›</button>' +
        '</div>';

    var topEl = document.getElementById(dramaId + '-pag-top');
    var botEl = document.getElementById(dramaId + '-pag-bot');
    if (topEl) topEl.innerHTML = navHtml;
    if (botEl) botEl.innerHTML = navHtml;
}

// Called by the toggle handler in index.html on first expand
function initEpisodePagination(dramaId) {
    if (!window._epPages.hasOwnProperty(dramaId)) {
        window._epPages[dramaId] = 0;
        renderEpisodesPage(dramaId, 0);
    }
}

// ======================
// DRAMA TEMPLATES
// ======================
function createDramaCard(drama) {
    var eps     = drama.episodes || [];
    var preview = eps.slice(0, EP_PREVIEW);
    window._dramaEps[drama.id] = eps;

    return `
        <div class="drama-card" data-year="${drama.year}" data-title="${drama.title}" data-role="${drama.role}">
            <div class="drama-poster">
                <img src="${drama.poster}" alt="${drama.titleShort}">
                <div class="episode-count">${drama.episodeCount}</div>
                <div class="year-label">${drama.year}</div>
                <div class="watch-now-overlay">
                    <a href="${drama.playlistUrl}" target="_blank" class="watch-button">Watch Series</a>
                </div>
            </div>
            <div class="drama-info">
                <h3 class="drama-title">${drama.title}</h3>
                <p class="drama-role">Role: ${drama.role}</p>
                <div class="drama-description">
                    <p>${drama.description}</p>
                </div>
                <div class="drama-episodes">
                    <div class="episodes-preview">
                        ${preview.map(ep => createEpisodePreview(ep)).join('')}
                    </div>
                    ${eps.length > 0 ? `
                        <span class="toggle-episodes-btn" data-drama-id="${drama.id}">
                            <span class="view-text">View All ${eps.length} Episodes 展开全集</span>
                            <span class="close-text">Hide Episodes 收起全集</span>
                        </span>
                        <div class="all-episodes-container" id="${drama.id}-episodes">
                            <div id="${drama.id}-pag-top"></div>
                            <div class="all-episodes-grid" id="${drama.id}-grid"></div>
                            <div id="${drama.id}-pag-bot"></div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function createEpisodePreview(episode) {
    var ytUrl = episode.url || null;
    var r2Url = episode.r2_url || null;
    var key   = _regVideo(episode.title, ytUrl, r2Url);
    var ytId  = _getYtId(ytUrl);
    var thumb = episode.thumbnail || (ytId ? 'https://i.ytimg.com/vi/' + ytId + '/mqdefault.jpg' : _getR2Thumb(r2Url) || '');
    return `
        <div class="episode-preview" onclick="openVideoModal('${key}')" role="button" tabindex="0"
             onkeydown="if(event.key==='Enter')openVideoModal('${key}')">
            <div class="episode-thumbnail">
                <img src="${thumb}" alt="${episode.title}" loading="lazy">
                <span class="episode-number">${episode.title}</span>
                <span class="ep-play-overlay"></span>
            </div>
        </div>
    `;
}

// ======================
// PLAYLIST CARD TEMPLATE
// ======================
function createPlaylistCard(playlist) {
    var eps     = playlist.episodes || [];
    var preview = eps.slice(0, EP_PREVIEW);
    window._dramaEps[playlist.id] = eps;

    return `
        <div class="drama-card" data-year="${playlist.year}" data-title="${playlist.title}" data-role="Xiao Zhan">
            <div class="drama-poster">
                <img src="${playlist.poster}" alt="${playlist.title}">
                <div class="episode-count">${playlist.episodeCount}</div>
                <div class="year-label">${playlist.year}</div>
                <div class="watch-now-overlay">
                    <a href="${playlist.playlistUrl}" target="_blank" class="watch-button">Watch Series</a>
                </div>
            </div>
            <div class="drama-info">
                <h3 class="drama-title">${playlist.title}</h3>
                <div class="drama-episodes">
                    <div class="episodes-preview">
                        ${preview.map(ep => createEpisodePreview(ep)).join('')}
                    </div>
                    ${eps.length > 0 ? `
                        <span class="toggle-episodes-btn" data-drama-id="${playlist.id}">
                            <span class="view-text">View All ${eps.length} Videos 展开全集</span>
                            <span class="close-text">Hide 收起全集</span>
                        </span>
                        <div class="all-episodes-container" id="${playlist.id}-episodes">
                            <div id="${playlist.id}-pag-top"></div>
                            <div class="all-episodes-grid" id="${playlist.id}-grid"></div>
                            <div id="${playlist.id}-pag-bot"></div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// ======================
// FEATURED VIDEO TEMPLATE
// ======================
function createFeaturedVideo(video) {
    var ytId  = _getYtId(video.embedUrl);
    var r2Url = video.r2_url || null;
    var thumb = ytId ? 'https://i.ytimg.com/vi/' + ytId + '/hqdefault.jpg' : (_getR2Thumb(r2Url) || '');
    var key   = _regVideo(video.title.replace(/<br>/g, ' '), video.embedUrl, r2Url);
    return `
        <div class="video-item" data-title="${video.title.replace(/<br>/g, ' ')}">
            <div class="video-facade" onclick="openVideoModal('${key}')">
                <img src="${thumb}" alt="${video.title.replace(/<br>/g, ' ')}" loading="lazy">
                <div class="facade-play"><div class="facade-yt-btn"></div></div>
            </div>
            <div class="video-info">
                <h3 class="video-title">${video.title}</h3>
                <p class="video-description">${video.description}</p>
            </div>
        </div>
    `;
}

// ======================
// SECTION DIVIDER TEMPLATE
// ======================
function createSectionDivider(heading, text) {
    return `
        <div class="section-divider">
            <h2 class="divider-heading">${heading}</h2>
            <p class="divider-text">${text}</p>
        </div>
    `;
}
