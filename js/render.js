// === PLAYLIST STATE (must load before any cards render) ===
var PL_KEY = 'xzytPlaylist';
var playlist = [];

function plLoad() {
    try { playlist = JSON.parse(localStorage.getItem(PL_KEY) || '[]'); } catch (e) { playlist = []; }
}
function plSave() { localStorage.setItem(PL_KEY, JSON.stringify(playlist)); }
function plId(v) { return v.ytUrl || v.r2Url || v.title; }

// HTML-escape for a plain attribute value (data-plid)
function _plEscAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// JSON-for-onclick-attribute helper (double quotes -> &quot; so it survives inside onclick="...")
function jq(v) { return JSON.stringify(v).replace(/"/g, '&quot;'); }

var _plToastTimer = null;
// `msg` is always a static, controlled string built in this file (never user input) —
// innerHTML (not textContent) so the English/Chinese <br> split below actually renders.
function plToast(msg) {
    var el = document.getElementById('plToast');
    if (!el) return;
    el.innerHTML = msg;
    el.classList.add('show');
    clearTimeout(_plToastTimer);
    _plToastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
}

function plToggle(v) {
    var id = plId(v);
    var inList = playlist.some(function (p) { return plId(p) === id; });
    if (inList) {
        playlist = playlist.filter(function (p) { return plId(p) !== id; });
        plToast('Removed from playlist<br>已移除');
    } else {
        playlist.push(v);
        plToast('Added to playlist<br>已加入播放列表');
    }
    plSave();
    plSyncAllCards();
    plRenderPanel();
}

// Adds every video in `list` that isn't already queued (used by the drama/playlist
// card's "+ Add all to Playlist" button).
function plAddAll(list) {
    var added = 0;
    list.forEach(function (v) {
        var id = plId(v);
        if (!playlist.some(function (p) { return plId(p) === id; })) { playlist.push(v); added++; }
    });
    plSave();
    plSyncAllCards();
    plRenderPanel();
    plToast(added ? ('+' + added + ' added to playlist<br>已加入 ' + added + ' 个视频') : 'Already all in playlist<br>已全部在播放列表中');
}

function plSyncAllCards() {
    document.querySelectorAll('.pl-card-add').forEach(function (btn) {
        var id = btn.getAttribute('data-plid');
        var inList = playlist.some(function (p) { return plId(p) === id; });
        btn.classList.toggle('pl-added', inList);
        btn.innerHTML = inList ? '✓' : '+';
        btn.title = inList ? 'Remove from Playlist' : 'Add to Playlist';
    });
}

function plAddBtnHtml(v) {
    var id = plId(v);
    var inList = playlist.some(function (p) { return plId(p) === id; });
    return '<button class="pl-card-add' + (inList ? ' pl-added' : '') + '" data-plid="' + _plEscAttr(id) + '" ' +
        'onclick="event.stopPropagation();plToggle(' + jq(v) + ')" ' +
        'title="' + (inList ? 'Remove from Playlist' : 'Add to Playlist') + '">' + (inList ? '✓' : '+') + '</button>';
}

function plRemoveAt(i) {
    playlist.splice(i, 1);
    plSave();
    plSyncAllCards();
    plRenderPanel();
}

function plClearAll() {
    if (!playlist.length) return;
    if (!confirm('Clear the entire playlist? 清空播放列表？')) return;
    playlist = [];
    plSave();
    plSyncAllCards();
    plRenderPanel();
}

function plTogglePanel() {
    var panel = document.getElementById('plPanel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) setTimeout(plPositionPanel, 0);
}

// Anchors the playlist panel next to #floatBtnGroup, wherever the user has dragged it.
function plPositionPanel() {
    var group = document.getElementById('floatBtnGroup');
    var panel = document.getElementById('plPanel');
    if (!group || !panel || panel.classList.contains('hidden')) return;
    var rect = group.getBoundingClientRect();
    var gap = 10;
    panel.style.left = 'auto';
    panel.style.bottom = 'auto';
    panel.style.right = (window.innerWidth - rect.left + gap) + 'px';
    var panelH = panel.offsetHeight || 400;
    panel.style.top = Math.max(10, Math.min(rect.top, window.innerHeight - panelH - 10)) + 'px';
}

// Playlist button + back-to-top button, joined in one vertically-draggable group
// (ported from the galleries' #floatBtnGroup pattern).
function setupFloatGroup() {
    var group = document.getElementById('floatBtnGroup');
    var topBtn = document.getElementById('backToTopFloat');
    if (!group || !topBtn) return;
    var margin = 10;
    var FG_KEY = 'xzytFloatGroupTop';

    window.addEventListener('scroll', function () {
        topBtn.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });

    var saved = localStorage.getItem(FG_KEY);
    if (saved) {
        try {
            var top = parseFloat(saved);
            var h = group.offsetHeight || 130;
            var safeTop = Math.max(margin, Math.min(top, window.innerHeight - h - margin));
            group.style.top = safeTop + 'px';
            group.style.bottom = 'auto';
            group.style.transform = 'none';
        } catch (e) { localStorage.removeItem(FG_KEY); }
    }

    var dragging = false, startY, startTop, moved;
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function convertToPixelTop() {
        if (!group.style.top) {
            var rect = group.getBoundingClientRect();
            group.style.top = rect.top + 'px';
            group.style.bottom = 'auto';
            group.style.transform = 'none';
        }
    }
    // Suppress the click (open playlist / scroll-to-top) that would otherwise fire right after a drag
    group.addEventListener('click', function (e) {
        if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);
    function pointerStart(e) {
        var p = e.touches ? e.touches[0] : e;
        convertToPixelTop();
        startY = p.clientY;
        startTop = parseFloat(group.style.top);
        dragging = true; moved = false;
    }
    function pointerMove(e) {
        if (!dragging) return;
        var p = e.touches ? e.touches[0] : e;
        var dy = p.clientY - startY;
        if (Math.abs(dy) > 4) moved = true;
        group.style.top = clamp(startTop + dy, margin, window.innerHeight - group.offsetHeight - margin) + 'px';
        e.preventDefault();
    }
    function pointerEnd() {
        if (!dragging) return;
        dragging = false;
        if (moved) {
            localStorage.setItem(FG_KEY, parseFloat(group.style.top));
            plPositionPanel();
        }
    }
    group.addEventListener('mousedown', pointerStart);
    group.addEventListener('touchstart', pointerStart, { passive: false });
    document.addEventListener('mousemove', pointerMove);
    document.addEventListener('touchmove', pointerMove, { passive: false });
    document.addEventListener('mouseup', pointerEnd);
    document.addEventListener('touchend', pointerEnd);
}

document.addEventListener('DOMContentLoaded', setupFloatGroup);

function plRenderPanel() {
    var badge = document.getElementById('plFabBadge');
    var countEl = document.getElementById('plPanelCount');
    var list = document.getElementById('plList');
    if (badge) { badge.textContent = playlist.length; badge.style.display = playlist.length ? 'flex' : 'none'; }
    if (countEl) countEl.textContent = playlist.length;
    if (!list) return;
    if (!playlist.length) {
        list.innerHTML = '<div class="pl-empty">Your playlist is empty<br>播放列表是空的</div>';
        return;
    }
    list.innerHTML = playlist.map(function (p, i) {
        var ytId = _getYtId(p.ytUrl);
        var thumb = ytId ? 'https://i.ytimg.com/vi/' + ytId + '/mqdefault.jpg' : (_getR2Thumb(p.r2Url) || '');
        return '<div class="pl-item" onclick="plPlayFrom(' + i + ')">' +
            '<img src="' + thumb + '" alt="" onerror="this.style.display=\'none\'">' +
            '<div class="pl-item-title">' + p.title + '</div>' +
            '<button class="pl-item-remove" onclick="event.stopPropagation();plRemoveAt(' + i + ')" title="Remove">×</button>' +
            '</div>';
    }).join('');
}

// Opens the on-site modal in continuous-playback (queue) mode.
// _vmOpenQueue is defined in index.html's inline script (loaded after this file);
// by the time these are actually called (a user click), it's guaranteed to exist.
function plPlayFrom(i) {
    _vmOpenQueue(playlist.slice(), i);
}
function plPlayAll() {
    if (!playlist.length) return;
    _vmOpenQueue(playlist.slice(), 0);
}
function plShufflePlay() {
    if (!playlist.length) return;
    var shuffled = playlist.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
    }
    _vmOpenQueue(shuffled, 0);
}

plLoad();
plRenderPanel();

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
    m = url.match(/\/shorts\/([^?&]+)/);
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
    var allEpsData = eps.map(function (ep) { return { title: ep.title, ytUrl: ep.url || null, r2Url: ep.r2_url || null }; });

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
                        <div class="ep-actions-row">
                            <span class="toggle-episodes-btn" data-drama-id="${drama.id}">
                                <span class="view-text">View All ${eps.length} Episodes 展开全集</span>
                                <span class="close-text">Hide Episodes 收起全集</span>
                            </span>
                            <button class="pl-add-all-btn" onclick="plAddAll(${jq(allEpsData)})">＋ Add all ${eps.length} to Playlist</button>
                        </div>
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
    var vData = { title: episode.title, ytUrl: ytUrl, r2Url: r2Url };
    return `
        <div class="episode-preview" onclick="openVideoModal('${key}')" role="button" tabindex="0"
             onkeydown="if(event.key==='Enter')openVideoModal('${key}')">
            <div class="episode-thumbnail">
                <img src="${thumb}" alt="${episode.title}" loading="lazy">
                <span class="episode-number">${episode.title}</span>
                <span class="ep-play-overlay"></span>
                ${plAddBtnHtml(vData)}
            </div>
        </div>
    `;
}

// ======================
// PLAYLIST CARD TEMPLATE
// ======================
function createPlaylistCard(playlistData) {
    var eps     = playlistData.episodes || [];
    var preview = eps.slice(0, EP_PREVIEW);
    window._dramaEps[playlistData.id] = eps;
    var allEpsData = eps.map(function (ep) { return { title: ep.title, ytUrl: ep.url || null, r2Url: ep.r2_url || null }; });

    return `
        <div class="drama-card" data-year="${playlistData.year}" data-title="${playlistData.title}" data-role="Xiao Zhan">
            <div class="drama-poster">
                <img src="${playlistData.poster}" alt="${playlistData.title}">
                <div class="episode-count">${playlistData.episodeCount}</div>
                <div class="year-label">${playlistData.year}</div>
                <div class="watch-now-overlay">
                    <a href="${playlistData.playlistUrl}" target="_blank" class="watch-button">Watch Series</a>
                </div>
            </div>
            <div class="drama-info">
                <h3 class="drama-title">${playlistData.title}</h3>
                <div class="drama-episodes">
                    <div class="episodes-preview">
                        ${preview.map(ep => createEpisodePreview(ep)).join('')}
                    </div>
                    ${eps.length > 0 ? `
                        <div class="ep-actions-row">
                            <span class="toggle-episodes-btn" data-drama-id="${playlistData.id}">
                                <span class="view-text">View All ${eps.length} Videos 展开全集</span>
                                <span class="close-text">Hide 收起全集</span>
                            </span>
                            <button class="pl-add-all-btn" onclick="plAddAll(${jq(allEpsData)})">＋ Add all ${eps.length} to Playlist</button>
                        </div>
                        <div class="all-episodes-container" id="${playlistData.id}-episodes">
                            <div id="${playlistData.id}-pag-top"></div>
                            <div class="all-episodes-grid" id="${playlistData.id}-grid"></div>
                            <div id="${playlistData.id}-pag-bot"></div>
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
    var plainTitle = video.title.replace(/<br>/g, ' ');
    var key   = _regVideo(plainTitle, video.embedUrl, r2Url);
    var vData = { title: plainTitle, ytUrl: video.embedUrl, r2Url: r2Url };
    return `
        <div class="video-item" data-title="${plainTitle}">
            <div class="video-facade" onclick="openVideoModal('${key}')">
                <img src="${thumb}" alt="${plainTitle}" loading="lazy">
                <div class="facade-play"><div class="facade-yt-btn"></div></div>
                ${plAddBtnHtml(vData)}
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
