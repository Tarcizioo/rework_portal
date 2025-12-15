import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { openAnimeDetailsModal, initModalListeners } from "./anime-modal.js";

const heroCarouselEl = document.getElementById('heroCarousel');
const popularAnimesCarouselEl = document.getElementById('popularAnimesCarousel');
const mostRecentAnimesCarouselEl = document.getElementById('mostRecentAnimesCarousel');
const actionAnimesCarouselEl = document.getElementById('actionAnimesCarousel');
const romanceAnimesCarouselEl = document.getElementById('romanceAnimesCarousel');
const dramaAnimesCarouselEl = document.getElementById('dramaAnimesCarousel');

const settingsModal = document.getElementById('settingsModal');
const settingsLink = document.getElementById('settingsLink');
const settingsLinkMobile = document.getElementById('settingsLinkMobile');
const closeSettingsModalBtn = document.getElementById('closeSettingsModal');
const themeSwitcher = document.getElementById('themeSwitcher');
const saveSettingsBtn = document.getElementById('saveSettings');
const searchInput = document.getElementById('searchInput');
const searchResultsPreview = document.getElementById('searchResultsPreview');

function getDefaultImageOnError(e) { e.target.src = `https://placehold.co/180x270?text=Erro`; }
function getSearchPreviewImageOnError(e) { e.target.src = `https://placehold.co/40x60?text=X`; }
function debounce(func, delay = 500) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), delay); }; }
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function parseDuration(durationString) {
    const numbers = durationString?.match(/\d+/g);
    if (!numbers) return 24;
    let minutes = 0;
    if (durationString.includes("hr")) { 
        minutes += parseInt(numbers[0]) * 60; 
        if (numbers[1]) minutes += parseInt(numbers[1]); 
    } else { 
        minutes = parseInt(numbers[0]); 
    }
    return minutes || 24;
}

function showLoadingSkeleton(element) {
    if (!element) return;
    if ($(element).hasClass('slick-initialized')) $(element).slick('unslick');
    
    element.innerHTML = `
        <div class="skeleton-wrapper">
            ${Array(5).fill(0).map(() => `
                <div class="skeleton-card">
                    <div class="skeleton-image"></div>
                    <div class="skeleton-text"></div>
                </div>
            `).join('')}
        </div>
    `;
}

const transformApiData = (apiAnime) => ({
    id: apiAnime.mal_id,
    title: apiAnime.title_english || apiAnime.title,
    imageUrl: apiAnime.images?.jpg?.large_image_url || apiAnime.images?.jpg?.image_url,
    genres: (apiAnime.genres || []).map(g => g.name).join(', '),
    miniSynopsis: (apiAnime.synopsis || "Sinopse não disponível.").substring(0, 250) + '...',
    fullSynopsis: apiAnime.synopsis || "Sinopse não disponível.",
    score: apiAnime.score || "N/A", rank: apiAnime.rank || "N/A",
    season: apiAnime.season ? `${apiAnime.season.charAt(0).toUpperCase() + apiAnime.season.slice(1)} ${apiAnime.year}` : "Desconhecido",
    episodes: apiAnime.episodes || 0,
    duration: apiAnime.duration,
    durationParsed: parseDuration(apiAnime.duration),
    trailerUrl: apiAnime.trailer?.embed_url || null
});

function createAnimeCard(anime) {
    const slideItem = document.createElement('div');
    slideItem.innerHTML = `<div class="anime-item-wrapper"><img src="${anime.imageUrl}" class="anime-image-display" loading="lazy" onerror="getDefaultImageOnError(event)"><h3 class="anime-title-display">${anime.title}</h3></div>`;
    slideItem.querySelector('.anime-item-wrapper').addEventListener('click', () => openAnimeDetailsModal(anime));
    return slideItem;
}

function populateCarousel(element, animes) {
    if (!element) return;
    element.innerHTML = ''; 
    animes.forEach(anime => element.appendChild(createAnimeCard(anime)));
}

function initializeSlickCarousel(selector) {
    if (!document.querySelector(selector) || document.querySelector(selector).children.length === 0) return;
    
    $(selector).slick({ 
        dots: true, infinite: true, speed: 300, slidesToShow: 5, slidesToScroll: 5, 
        responsive: [
            { breakpoint: 1380, settings: { slidesToShow: 4, slidesToScroll: 4 } }, 
            { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 3 } }, 
            { breakpoint: 768, settings: { slidesToShow: 2, slidesToScroll: 2, dots: false } }, 
            { breakpoint: 480, settings: { slidesToShow: 2, slidesToScroll: 2, dots: false } }
        ] 
    });
}

function createHeroSlide(anime) {
    const slide = document.createElement('div');
    slide.className = 'hero-slide';
    slide.innerHTML = `<div class="hero-background-image" style="background-image: url('${anime.imageUrl}')"></div><div class="hero-overlay"></div><div class="hero-content"><div class="hero-poster"><img src="${anime.imageUrl}" onerror="getDefaultImageOnError(event)"></div><div class="hero-info"><h2>${anime.title}</h2><p class="genres">${anime.genres}</p><p class="synopsis">${anime.miniSynopsis}</p></div></div>`;
    slide.addEventListener('click', () => openAnimeDetailsModal(anime));
    return slide;
}
function populateHeroCarousel(animes) { if (!heroCarouselEl) return; heroCarouselEl.innerHTML = ''; animes.forEach(anime => heroCarouselEl.appendChild(createHeroSlide(anime))); }
function initializeHeroCarousel() { if (!heroCarouselEl || $(heroCarouselEl).hasClass('slick-initialized')) return; $(heroCarouselEl).slick({ dots: true, arrows: true, infinite: true, speed: 500, fade: true, cssEase: 'linear', autoplay: true, autoplaySpeed: 5000 }); }

async function fetchByGenre(genreId, containerId, orderBy = 'score', excludeIds = '') {
    const container = document.getElementById(containerId);
    if(!container) return;

    let url = `https://api.jikan.moe/v4/anime?genres=${genreId}&limit=15&order_by=${orderBy}&sort=desc&type=tv`;
    if (excludeIds) {
        url += `&genres_exclude=${excludeIds}`;
    }

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        
        const json = await res.json();
        const animes = json.data.map(transformApiData);
        populateCarousel(container, animes);
        initializeSlickCarousel(`#${containerId}`);
    } catch (error) {
        console.error(`Erro ao carregar genero ${genreId}:`, error);
        container.innerHTML = '<p style="text-align:center; padding:1rem; opacity:0.7;">Não foi possível carregar no momento.</p>';
    }
}

async function fetchAndDisplayData() {
    showLoadingSkeleton(popularAnimesCarouselEl);
    showLoadingSkeleton(mostRecentAnimesCarouselEl);
    showLoadingSkeleton(actionAnimesCarouselEl);
    showLoadingSkeleton(romanceAnimesCarouselEl);
    showLoadingSkeleton(dramaAnimesCarouselEl);

    try {
        const [popularResponse, recentResponse] = await Promise.all([
            fetch("https://api.jikan.moe/v4/top/anime?limit=15"), 
            fetch("https://api.jikan.moe/v4/seasons/now?limit=15")
        ]);
        
        const popularData = await popularResponse.json(); 
        const recentData = await recentResponse.json();
        
        const popularAnimes = popularData.data.map(transformApiData); 
        const recentAnimes = recentData.data.map(transformApiData);
        
        populateHeroCarousel(popularAnimes.slice(0, 5)); 
        initializeHeroCarousel();
        
        populateCarousel(popularAnimesCarouselEl, popularAnimes); 
        initializeSlickCarousel('#popularAnimesCarousel');
        
        populateCarousel(mostRecentAnimesCarouselEl, recentAnimes); 
        initializeSlickCarousel('#mostRecentAnimesCarousel');

        await delay(800); 
        await fetchByGenre(1, 'actionAnimesCarousel', 'members', '15');

        await delay(1200); 
        await fetchByGenre(22, 'romanceAnimesCarousel', 'favorites', '1'); 

        await delay(1200); 
        await fetchByGenre(8, 'dramaAnimesCarousel', 'score', '1,2'); 

    } catch (error) { 
        console.error("Erro geral de carregamento:", error); 
    } 
}

const handleSearch = async (searchTerm) => {
    if (searchTerm.length < 3) { searchResultsPreview.classList.add('hidden'); return; }
    searchResultsPreview.innerHTML = `<p style="padding:0.75rem;text-align:center;">A pesquisar...</p>`; searchResultsPreview.classList.remove('hidden');
    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTerm)}&limit=5&order_by=members&sort=desc&sfw=true`);
        const searchData = await response.json(); searchResultsPreview.innerHTML = ''; 
        if (searchData.data && searchData.data.length > 0) {
            searchData.data.forEach(animeData => {
                const anime = transformApiData(animeData);
                const item = document.createElement('div'); item.className = 'search-preview-item';
                item.innerHTML = `<img src="${anime.imageUrl}" class="search-preview-image"><div class="search-preview-info"><h4 class="search-preview-title">${anime.title}</h4></div>`;
                item.addEventListener('click', () => { openAnimeDetailsModal(anime); searchResultsPreview.classList.add('hidden'); searchInput.value = ''; });
                searchResultsPreview.appendChild(item);
            });
        } else { searchResultsPreview.innerHTML = `<p style="padding:0.75rem;text-align:center;">Nenhum resultado.</p>`; }
    } catch (e) { searchResultsPreview.innerHTML = `<p>Erro.</p>`; }
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    const currentTheme = localStorage.getItem('animeSiteTheme') || 'dark';
    document.body.className = `${currentTheme}-theme`;
    if(themeSwitcher) themeSwitcher.value = currentTheme;
    
    initModalListeners();
    fetchAndDisplayData();

    if (searchInput) {
        const debouncedSearch = debounce(handleSearch);
        searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value.trim()));
        document.addEventListener('click', (e) => { if (searchInput.parentElement && !searchInput.parentElement.contains(e.target)) searchResultsPreview.classList.add('hidden'); });
    }
    
    const authModal = document.getElementById('authModal');
    const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
    const loginForm = document.getElementById('loginForm'); const registerForm = document.getElementById('registerForm'); const resetPasswordForm = document.getElementById('resetPasswordForm');
    const authTabsContainer = document.getElementById('authTabsContainer'); const authModalTitle = document.getElementById('authModalTitle');
    const loginTabBtn = document.getElementById('loginTabButton'); const registerTabBtn = document.getElementById('registerTabButton');
    const userGreeting = document.getElementById('userGreeting'); const logoutButtons = document.querySelectorAll('.sidebar-logout a'); const profileLinks = document.querySelectorAll('nav a[href="profile.html"]');

    const mobileMenuButton = document.getElementById('mobileMenuButton'); const mobileSidebarOverlay = document.getElementById('mobileSidebarOverlay'); const mobileSidebar = document.getElementById('mobileSidebar'); const closeMobileSidebarBtn = document.getElementById('closeMobileSidebar');
    function openMobileNav() { if (mobileSidebarOverlay) mobileSidebarOverlay.classList.remove('hidden'); if (mobileSidebar) setTimeout(() => mobileSidebar.classList.add('open'), 10); }
    function closeMobileNav() { if (mobileSidebar) mobileSidebar.classList.remove('open'); if (mobileSidebarOverlay) setTimeout(() => mobileSidebarOverlay.classList.add('hidden'), 300); }
    if (mobileMenuButton) mobileMenuButton.addEventListener('click', openMobileNav);
    if (closeMobileSidebarBtn) closeMobileSidebarBtn.addEventListener('click', closeMobileNav);
    if (mobileSidebarOverlay) mobileSidebarOverlay.addEventListener('click', (e) => { if (e.target === mobileSidebarOverlay) closeMobileNav(); });

    function openSettings(e) { if(e) e.preventDefault(); if(settingsModal) settingsModal.classList.remove('hidden'); closeMobileNav(); }
    function closeSettings() { if(settingsModal) settingsModal.classList.add('hidden'); }
    if(settingsLink) settingsLink.addEventListener('click', openSettings);
    if(settingsLinkMobile) settingsLinkMobile.addEventListener('click', openSettings);
    if(closeSettingsModalBtn) { const newClose = closeSettingsModalBtn.cloneNode(true); closeSettingsModalBtn.parentNode.replaceChild(newClose, closeSettingsModalBtn); newClose.addEventListener('click', closeSettings); }
    if(saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
        if(themeSwitcher) { const t = themeSwitcher.value; document.body.className = `${t}-theme`; localStorage.setItem('animeSiteTheme', t); }
        closeSettings();
    });

    const sidebar = document.getElementById('sidebar'); const toggleBtn = document.getElementById('toggleSidebarBtn');
    if(toggleBtn) toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

    if(closeAuthModalBtn) closeAuthModalBtn.addEventListener('click', () => authModal.classList.add('hidden'));
    function showLoginForm() { loginTabBtn.classList.add('active'); registerTabBtn.classList.remove('active'); loginForm.classList.add('active'); registerForm.classList.remove('active'); resetPasswordForm.classList.remove('active'); authTabsContainer.classList.remove('hidden'); authModalTitle.textContent = "Aceder à Conta"; }
    if(loginTabBtn && registerTabBtn) {
        loginTabBtn.addEventListener('click', showLoginForm);
        registerTabBtn.addEventListener('click', () => { loginTabBtn.classList.remove('active'); registerTabBtn.classList.add('active'); loginForm.classList.remove('active'); registerForm.classList.add('active'); resetPasswordForm.classList.remove('active'); authTabsContainer.classList.remove('hidden'); authModalTitle.textContent = "Criar Nova Conta"; });
    }
    const forgotLink = document.getElementById('forgotPasswordLink'); const backLogin = document.getElementById('backToLoginBtn');
    if(forgotLink) forgotLink.addEventListener('click', (e)=>{e.preventDefault(); loginForm.classList.remove('active'); registerForm.classList.remove('active'); resetPasswordForm.classList.add('active'); authTabsContainer.classList.add('hidden'); authModalTitle.textContent="Recuperar Senha";});
    if(backLogin) backLogin.addEventListener('click', (e)=>{e.preventDefault(); showLoginForm();});

    onAuthStateChanged(auth, (user) => {
        if (user) {
            const v = !user.emailVerified ? `<span style="color:#ef4444;font-size:0.8rem;margin-left:0.5rem;" title="Verifique seu email">(Verifique email!)</span>` : "";
            if(userGreeting) userGreeting.innerHTML = `Olá, <span style="color:var(--text-accent);">${user.displayName || "Visitante"}</span>${v}!!`;
            profileLinks.forEach(l => l.onclick = null); logoutButtons.forEach(b => b.parentElement.style.display = 'block');
        } else {
            if(userGreeting) userGreeting.textContent = "Olá, Visitante!!";
            profileLinks.forEach(l => l.onclick = (e) => { e.preventDefault(); authModal.classList.remove('hidden'); }); logoutButtons.forEach(b => b.parentElement.style.display = 'none');
        }
    });

    if (loginForm) loginForm.addEventListener('submit', async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPassword').value); authModal.classList.add('hidden'); } catch (e) { document.getElementById('loginErrorMessage').classList.remove('hidden'); document.getElementById('loginErrorMessage').textContent = "Erro: " + e.message; } });
    if (registerForm) registerForm.addEventListener('submit', async (e) => { e.preventDefault(); try { const c = await createUserWithEmailAndPassword(auth, document.getElementById('registerEmail').value, document.getElementById('registerPassword').value); await updateProfile(c.user, {displayName: document.getElementById('registerUsername').value}); await sendEmailVerification(c.user); authModal.classList.add('hidden'); alert("Verifique seu email!"); } catch (e) { document.getElementById('registerErrorMessage').classList.remove('hidden'); document.getElementById('registerErrorMessage').textContent = e.message; } });
    if (resetPasswordForm) resetPasswordForm.addEventListener('submit', async (e) => { e.preventDefault(); try { await sendPasswordResetEmail(auth, document.getElementById('resetEmail').value); document.getElementById('resetMessage').classList.remove('hidden'); document.getElementById('resetMessage').textContent = "Link enviado!"; } catch (e) { document.getElementById('resetErrorMessage').classList.remove('hidden'); document.getElementById('resetErrorMessage').textContent = e.message; } });
    logoutButtons.forEach(btn => btn.addEventListener('click', async (e) => { e.preventDefault(); await signOut(auth); window.location.href = "index.html"; }));
});