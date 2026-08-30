// === PLAYLIST STATE (must load before any cards render) ===
var PL_KEY = 'xzytPlaylist';
var playlist = [];

function plLoad() {
    try { playlist = JSON.parse(localStorage.getItem(PL_KEY) || '[]'); } catch (e) { playlist = []; }
}
function plSave() { localStorage.setItem(PL_KEY, JSON.stringify(playlist)); }
function plId(v) { return v.ytUrl || v.r2Url || v.title; }

// 循环播放 — when on, the queue wraps at both ends (auto-advance past the last item loops
// back to the first; Prev/Next wrap too). Read by _vmAutoAdvance/_vmNext/_vmPrev in index.html.
var _plLoop = false;
try { _plLoop = localStorage.getItem('xzytPlaylistLoop') === '1'; } catch (e) {}
function _plSyncLoopBtn() {
    var b = document.getElementById('plLoopBtn');
    if (!b) return;
    b.classList.toggle('on', _plLoop);
    b.setAttribute('aria-pressed', _plLoop ? 'true' : 'false');
    b.title = _plLoop ? '循环播放：开 Loop on' : '循环播放：关 Loop off';
}
function plToggleLoop() {
    _plLoop = !_plLoop;
    try { localStorage.setItem('xzytPlaylistLoop', _plLoop ? '1' : '0'); } catch (e) {}
    _plSyncLoopBtn();
    if (typeof _vmUpdateFooter === 'function') {
        var m = document.getElementById('videoModal');
        if (m && m._curData) _vmUpdateFooter(m);   // refresh Prev/Next disabled state
    }
}

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

// Whether every video in `list` is already queued — the drama/playlist card's batch
// button toggles between add-all/remove-all based on this.
function _plAllIn(list) {
    return list.length > 0 && list.every(function (v) {
        var id = plId(v);
        return playlist.some(function (p) { return plId(p) === id; });
    });
}

// Looks up a drama/playlist card's full episode list (not just the preview strip) and
// converts it to the same {title,ytUrl,r2Url} shape used everywhere else in the playlist.
function _plEpsFor(dramaId) {
    var eps = window._dramaEps[dramaId] || [];
    return eps.map(function (ep) { return { title: ep.title, ytUrl: ep.url || null, r2Url: ep.r2_url || null }; });
}

// The drama/playlist card's batch button — adds every episode that isn't already queued,
// or (once all of them are) removes all of them, mirroring the individual "+"/"✓" toggle.
function plToggleAll(dramaId) {
    var list = _plEpsFor(dramaId);
    if (_plAllIn(list)) {
        list.forEach(function (v) {
            var id = plId(v);
            playlist = playlist.filter(function (p) { return plId(p) !== id; });
        });
        plSave();
        plSyncAllCards();
        plRenderPanel();
        plToast('Removed ' + list.length + ' from playlist<br>已移除 ' + list.length + ' 个视频');
    } else {
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
}

// Renders the batch button's initial label/state at card-creation time (matches whatever
// plSyncAllCards() would compute, so a page reload with episodes already queued shows the
// correct "Remove all" state immediately, not just after the next playlist mutation).
function plAddAllBtnHtml(dramaId, count) {
    var allIn = _plAllIn(_plEpsFor(dramaId));
    return '<button class="pl-add-all-btn' + (allIn ? ' pl-added' : '') + '" data-drama-id="' + _plEscAttr(dramaId) + '" ' +
        'onclick="plToggleAll(\'' + dramaId + '\')">' +
        (allIn ? '✓ Remove all ' + count + ' from Playlist' : '＋ Add all ' + count + ' to Playlist') +
        '</button>';
}

function plSyncAllCards() {
    document.querySelectorAll('.pl-card-add').forEach(function (btn) {
        var id = btn.getAttribute('data-plid');
        var inList = playlist.some(function (p) { return plId(p) === id; });
        btn.classList.toggle('pl-added', inList);
        btn.innerHTML = inList ? '✓' : '+';
        btn.title = inList ? 'Remove from Playlist' : 'Add to Playlist';
    });
    document.querySelectorAll('.pl-add-all-btn[data-drama-id]').forEach(function (btn) {
        var dramaId = btn.getAttribute('data-drama-id');
        var list = _plEpsFor(dramaId);
        var allIn = _plAllIn(list);
        btn.classList.toggle('pl-added', allIn);
        btn.textContent = allIn ? ('✓ Remove all ' + list.length + ' from Playlist') : ('＋ Add all ' + list.length + ' to Playlist');
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
    if (!panel.classList.contains('hidden')) { plRenderPanel(); setTimeout(plPositionPanel, 0); }
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
    _plSyncLoopBtn();
    if (!list) return;
    if (!playlist.length) {
        list.innerHTML = '<div class="pl-empty">Your playlist is empty<br>播放列表是空的</div>';
        return;
    }
    var nowId = (typeof _vmQueue !== 'undefined' && _vmQueue && _vmQueue[_vmQueueIndex]) ? plId(_vmQueue[_vmQueueIndex]) : null;
    list.innerHTML = playlist.map(function (p, i) {
        var ytId = _getYtId(p.ytUrl);
        var thumb = ytId ? 'https://i.ytimg.com/vi/' + ytId + '/mqdefault.jpg' : (_getR2Thumb(p.r2Url) || '');
        var now = nowId && plId(p) === nowId;
        return '<div class="pl-item' + (now ? ' pl-item-now' : '') + '" onclick="plPlayFrom(' + i + ')">' +
            '<img src="' + thumb + '" alt="" onerror="this.style.display=\'none\'">' +
            '<div class="pl-item-title">' + (now ? '<span class="pl-item-now-tag">▶ Now playing 正在播放</span>' : '') + p.title + '</div>' +
            '<button class="pl-item-remove" onclick="event.stopPropagation();plRemoveAt(' + i + ')" title="Remove">×</button>' +
            '</div>';
    }).join('');
    var nowEl = list.querySelector('.pl-item-now');
    if (nowEl) nowEl.scrollIntoView({ block: 'nearest' });
}

// Opens the on-site modal in continuous-playback (queue) mode.
// _vmOpenQueue is defined in index.html's inline script (loaded after this file);
// by the time these are actually called (a user click), it's guaranteed to exist.
function plPlayFrom(i) {
    _vmOpenQueue(playlist.slice(), i);
}
// Entries have no dates, so this is purely list order vs. its reverse:
//   "▶ Play All"     = play the queue as listed (episode 1 → N, drama order as added)
//   "▶ Play Reverse" = same queue, flipped
// The label predicts what the NEXT press plays; pressing plays that, then flips the label.
var _plRev = false;
function plPlayAll() {
    if (!playlist.length) return;
    var q = playlist.slice();
    if (_plRev) q.reverse();          // "Play Reverse" flips the list order
    _vmOpenQueue(q, 0);
    _plRev = !_plRev;
    var b = document.getElementById('plDirBtn');
    if (b) b.textContent = _plRev ? '▶ Play Reverse' : '▶ Play All';
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

// === PLAY SERIES / PLAY FROM EPISODE N ===
// Plays a drama/playlist card's OWN episode list as a throwaway queue (independent of
// the user's hand-built playlist — same non-mutating pattern as plPlayFrom/plShufflePlay).
// `fromIndex` (from the card's episode-start picker) is where playback begins.
function plPlayDrama(dramaId, fromIndex) {
    var eps = _plEpsFor(dramaId);
    if (!eps.length) return;
    var i = Math.max(0, Math.min(parseInt(fromIndex, 10) || 0, eps.length - 1));
    _vmOpenQueue(eps, i);
}

// "<position> · <title>" — position prefix keeps a usable handle even when titles
// aren't numbered (specials, variety, free-form names); title is truncated for display.
function _epPickerLabel(ep, i) {
    var t = (ep && ep.title ? String(ep.title) : '').trim();
    if (t.length > 44) t = t.slice(0, 43) + '…';
    return (i + 1) + (t ? ' · ' + t : '');
}

// The "▶ Play from 从此播放  [ 1 · … ⌄ ]" control under a card's action row.
// The right half is a CUSTOM dropdown (not a native <select>) — a native <select>
// on a phone opens a full-screen OS picker, unusable for an 80+ episode drama.
// Omitted for single-episode collections (nothing to pick a start point in).
function plEpPickerHtml(dramaId) {
    var eps = window._dramaEps[dramaId] || [];
    if (eps.length < 2) return '';
    var did = _plEscAttr(dramaId);
    return '<div class="ep-play-group" data-drama-id="' + did + '">' +
        '<button type="button" class="ep-play-btn" onclick="plPlayDramaFromWidget(this)">▶ Play from 从此播放</button>' +
        '<button type="button" class="ep-dd-trigger" data-i="0" aria-haspopup="listbox" aria-expanded="false" ' +
            'aria-label="Play series starting from / 从此集开始播放" onclick="epddToggle(this)">' +
            '<span class="ep-dd-cur">' + _plEscAttr(_epPickerLabel(eps[0], 0)) + '</span>' +
            '<span class="ep-dd-caret" aria-hidden="true"></span>' +
        '</button>' +
        '</div>';
}

function plPlayDramaFromWidget(btn) {
    var g = btn.closest('.ep-play-group');
    if (!g) return;
    var trig = g.querySelector('.ep-dd-trigger');
    var i = trig ? (parseInt(trig.getAttribute('data-i'), 10) || 0) : 0;
    plPlayDrama(g.getAttribute('data-drama-id'), i);
}

// ---- custom episode-start dropdown (one shared panel, appended to <body> so it
//      escapes the drama card's overflow:hidden / :hover transform containing block) ----
var _epddTrig = null;      // trigger button of the open dropdown, or null
var _epddScrollY = 0;
var _epddVW = 0;

function _epddPanel() {
    var p = document.getElementById('epddPanel');
    if (p) return p;
    p = document.createElement('div');
    p.id = 'epddPanel';
    p.className = 'ep-dd';
    p.setAttribute('hidden', '');
    p.innerHTML =
        '<input type="text" class="ep-dd-filter" placeholder="Number or name… 输入编号或名称" aria-label="Filter by episode number or name">' +
        '<ul class="ep-dd-list" role="listbox" tabindex="-1"></ul>' +
        '<div class="ep-dd-empty" hidden>No match 无结果</div>';
    document.body.appendChild(p);
    p.querySelector('.ep-dd-filter').addEventListener('input', function () {
        epddApplyFilter(this.value);
        epddPosition();
    });
    p.addEventListener('click', function (e) {
        var li = e.target.closest('.ep-dd-opt');
        if (li) epddPick(li);
    });
    return p;
}

function epddToggle(trig) {
    var wasOpen = (_epddTrig === trig);
    epddClose();
    if (wasOpen) return;
    var group = trig.closest('.ep-play-group');
    var dramaId = group.getAttribute('data-drama-id');
    var eps = (window._dramaEps && window._dramaEps[dramaId]) || [];
    if (eps.length < 2) return;
    var panel = _epddPanel();
    var curI = parseInt(trig.getAttribute('data-i'), 10) || 0;
    panel.querySelector('.ep-dd-list').innerHTML = eps.map(function (ep, i) {
        var lbl = _epPickerLabel(ep, i);
        return '<li role="option" class="ep-dd-opt' + (i === curI ? ' ep-dd-cur-opt' : '') +
            '" data-i="' + i + '" data-label="' + _plEscAttr(lbl.toLowerCase()) +
            '" aria-selected="' + (i === curI ? 'true' : 'false') + '">' + _plEscAttr(lbl) + '</li>';
    }).join('');
    var filter = panel.querySelector('.ep-dd-filter');
    filter.value = '';
    epddApplyFilter('');
    _epddTrig = trig;
    _epddScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    _epddVW = document.documentElement.clientWidth;
    trig.setAttribute('aria-expanded', 'true');
    group.classList.add('ep-dd-on');
    panel.removeAttribute('hidden');
    epddPosition();
    var cur = panel.querySelector('.ep-dd-opt[data-i="' + curI + '"]');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) {
        setTimeout(function () { filter.focus(); }, 0);
    }
}

function epddClose() {
    if (!_epddTrig) return;
    var panel = document.getElementById('epddPanel');
    if (panel) panel.setAttribute('hidden', '');
    var group = _epddTrig.closest('.ep-play-group');
    if (group) group.classList.remove('ep-dd-on');
    _epddTrig.setAttribute('aria-expanded', 'false');
    _epddTrig = null;
}

function epddApplyFilter(q) {
    var panel = document.getElementById('epddPanel');
    if (!panel) return;
    q = (q || '').trim().toLowerCase();
    var any = false;
    panel.querySelectorAll('.ep-dd-opt').forEach(function (li) {
        var show = !q || li.getAttribute('data-label').indexOf(q) >= 0;
        li.hidden = !show;
        if (show) any = true;
        li.classList.remove('ep-dd-active');
    });
    panel.querySelector('.ep-dd-empty').hidden = any;
}

function epddPosition() {
    var panel = document.getElementById('epddPanel');
    if (!panel || !_epddTrig) return;
    var r = _epddTrig.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var vh = document.documentElement.clientHeight;
    var w = Math.min(Math.max(r.width, 240), vw - 16);
    panel.style.width = w + 'px';
    panel.style.left = Math.max(8, Math.min(r.left, vw - w - 8)) + 'px';
    panel.style.top = '-9999px';
    var ph = panel.offsetHeight;
    var below = vh - r.bottom - 8;
    if (below >= ph || below >= r.top - 8) panel.style.top = (r.bottom + 6) + 'px';
    else panel.style.top = Math.max(8, r.top - 6 - ph) + 'px';
}

function epddPick(li) {
    if (!_epddTrig) return;
    var i = parseInt(li.getAttribute('data-i'), 10) || 0;
    var group = _epddTrig.closest('.ep-play-group');
    _epddTrig.setAttribute('data-i', i);
    var cur = group && group.querySelector('.ep-dd-cur');
    if (cur) cur.textContent = li.textContent;
    var t = _epddTrig;
    epddClose();
    t.focus();
}

function _epddInit() {
    document.addEventListener('click', function (e) {
        if (!_epddTrig) return;
        if (e.target.closest('.ep-dd') || e.target.closest('.ep-dd-trigger')) return;
        epddClose();
    });
    document.addEventListener('keydown', function (e) {
        if (!_epddTrig) return;
        var panel = document.getElementById('epddPanel');
        if (e.key === 'Escape') { var t = _epddTrig; epddClose(); t.focus(); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            var opts = Array.prototype.filter.call(panel.querySelectorAll('.ep-dd-opt'), function (o) { return !o.hidden; });
            if (!opts.length) return;
            var act = panel.querySelector('.ep-dd-opt.ep-dd-active');
            var idx = opts.indexOf(act);
            idx = e.key === 'ArrowDown' ? Math.min(opts.length - 1, idx + 1) : Math.max(0, idx < 0 ? 0 : idx - 1);
            if (act) act.classList.remove('ep-dd-active');
            opts[idx].classList.add('ep-dd-active');
            opts[idx].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            var a = panel.querySelector('.ep-dd-opt.ep-dd-active');
            if (a) { e.preventDefault(); epddPick(a); }
        }
    });
    window.addEventListener('scroll', function () {
        if (!_epddTrig) return;
        var y = window.scrollY || document.documentElement.scrollTop || 0;
        if (Math.abs(y - _epddScrollY) > 36) epddClose(); else epddPosition();
    }, true);
    window.addEventListener('resize', function () {
        if (!_epddTrig) return;
        if (document.documentElement.clientWidth !== _epddVW) epddClose(); else epddPosition();
    });
}
document.addEventListener('DOMContentLoaded', _epddInit);

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
                            ${plAddAllBtnHtml(drama.id, eps.length)}
                        </div>
                        ${plEpPickerHtml(drama.id)}
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
                            ${plAddAllBtnHtml(playlistData.id, eps.length)}
                        </div>
                        ${plEpPickerHtml(playlistData.id)}
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
