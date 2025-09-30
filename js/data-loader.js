async function loadAllData() {
    try {
        // Load all JSON files
        const [dramasData, performancesData, varietyData] = await Promise.all([
            fetch('data/dramas.json').then(r => r.json()),
            fetch('data/performances.json').then(r => r.json()),
            fetch('data/variety.json').then(r => r.json())
        ]);

        // Render Dramas Tab
        renderDramas(dramasData.dramas);

        // Render Performances Tab
        renderPerformances(performancesData);

        // Render Variety Tab
        renderVariety(varietyData);

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function renderDramas(dramas) {
    const container = document.getElementById('drama-cards-container');
    if (!container) return;
    
    container.innerHTML = dramas.map(drama => createDramaCard(drama)).join('');
}

function renderPerformances(data) {
    const container = document.getElementById('performances-container');
    if (!container) return;

    const playlistsHTML = `
        <div class="drama-cards">
            ${data.playlists.map(playlist => createPlaylistCard(playlist)).join('')}
        </div>
    `;

    const dividerHTML = createSectionDivider(
        'Featured Performance Videos',
        'Watch selected performances directly through embedded videos below. <br>See the playlist cards above for all shows.<br> 本页浏览可直接点击以下视频卡，更全站外视频集请点击上方播放列表'
    );

    const videosHTML = `
        <div class="video-grid">
            ${data.featuredVideos.map(video => createFeaturedVideo(video)).join('')}
        </div>
    `;

    container.innerHTML = playlistsHTML + dividerHTML + videosHTML;
}

function renderVariety(data) {
    const container = document.getElementById('variety-container');
    if (!container) return;

    const playlistsHTML = `
        <div class="drama-cards">
            ${data.playlists.map(playlist => createPlaylistCard(playlist)).join('')}
        </div>
    `;

    const dividerHTML = createSectionDivider(
        'Featured Variety Shows Videos',
        'Watch selected variety shows directly through embedded videos below. <br>See the playlist cards above for all shows.<br> 本页浏览可直接点击以下视频卡，更全站外视频集请点击上方播放列表'
    );

    const videosHTML = `
        <div class="video-grid">
            ${data.featuredVideos.map(video => createFeaturedVideo(video)).join('')}
        </div>
    `;

    container.innerHTML = playlistsHTML + dividerHTML + videosHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', loadAllData);