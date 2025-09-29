// ======================
// DRAMA TEMPLATES
// ======================
function createDramaCard(drama) {
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
                        ${drama.previewEpisodes.map(ep => createEpisodePreview(ep)).join('')}
                    </div>
                    ${drama.allEpisodes.length > 0 ? `
                        <span class="toggle-episodes-btn" data-drama-id="${drama.id}">
                            <span class="view-text">View All Episodes 展开全集</span>
                            <span class="close-text">Hide Episodes 收起全集</span>
                        </span>
                        <div class="all-episodes-container" id="${drama.id}-episodes">
                            <div class="all-episodes-grid">
                                ${drama.allEpisodes.map(ep => createEpisodePreview(ep)).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function createEpisodePreview(episode) {
    return `
        <a href="${episode.url}" target="_blank" class="episode-preview">
            <div class="episode-thumbnail">
                <img src="${episode.thumbnail}" alt="${episode.title}">
                <span class="episode-number">${episode.title}</span>
            </div>
        </a>
    `;
}

// ======================
// PLAYLIST CARD TEMPLATE
// ======================
function createPlaylistCard(playlist) {
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
                        ${playlist.previewEpisodes.map(ep => createEpisodePreview(ep)).join('')}
                    </div>
                    ${playlist.allEpisodes.length > 0 ? `
                        <span class="toggle-episodes-btn" data-drama-id="${playlist.id}">
                            <span class="view-text">View All Episodes 展开全集</span>
                            <span class="close-text">Hide Episodes 收起全集</span>
                        </span>
                        <div class="all-episodes-container" id="${playlist.id}-episodes">
                            <div class="all-episodes-grid">
                                ${playlist.allEpisodes.map(ep => createEpisodePreview(ep)).join('')}
                            </div>
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
    return `
        <div class="video-item">
            <div class="video-container">
                <iframe src="${video.embedUrl}" title="${video.title.replace(/<br>/g, ' ')}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowfullscreen loading="lazy"></iframe>
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