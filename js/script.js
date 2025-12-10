import { auth, db } from "./firebase-config.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- Variáveis Globais de Elementos ---
const heroCarouselEl = document.getElementById('heroCarousel');
const popularAnimesCarouselEl = document.getElementById('popularAnimesCarousel');
const mostRecentAnimesCarouselEl = document.getElementById('mostRecentAnimesCarousel');
const settingsModal = document.getElementById('settingsModal');
const settingsLink = document.getElementById('settingsLink');
const settingsLinkMobile = document.getElementById('settingsLinkMobile');
const closeSettingsModalBtn = document.getElementById('closeSettingsModal');
const themeSwitcher = document.getElementById('themeSwitcher');
const saveSettingsBtn = document.getElementById('saveSettings');
const searchInput = document.getElementById('searchInput');
const searchResultsPreview = document.getElementById('searchResultsPreview');
const mobileMenuButton = document.getElementById('mobileMenuButton');
const mobileSidebarOverlay = document.getElementById('mobileSidebarOverlay');
const mobileSidebar = document.getElementById('mobileSidebar');
const closeMobileSidebarBtn = document.getElementById('closeMobileSidebar');
const animeDetailsModal = document.getElementById('animeDetailsModal');
const animeDetailsModalTitle = document.getElementById('animeDetailsModalTitle');
const animeDetailsModalImage = document.getElementById('animeDetailsModalImage');
const closeAnimeDetailsModalBtn = document.getElementById('closeAnimeDetailsModal');
const animeSynopsisArea = document.getElementById('animeSynopsisArea');

// Variável para guardar o anime atual aberto no modal
let currentModalAnime = null;

// --- Funções Utilitárias ---
function getThemeColor(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
function getDefaultImageOnError(e) { e.target.src = `https://placehold.co/180x270?text=Erro`; }
function getSearchPreviewImageOnError(e) { e.target.src = `https://placehold.co/40x60?text=X`; }
function debounce(func, delay = 500) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), delay); }; }

function parseDuration(durationString) {
    const numbers = durationString.match(/\d+/g);
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

// --- Transformação de Dados da API ---
const transformApiData = (apiAnime) => ({
    id: apiAnime.mal_id,
    title: apiAnime.title_english || apiAnime.title,
    imageUrl: apiAnime.images?.jpg?.large_image_url || apiAnime.images?.jpg?.image_url,
    genres: (apiAnime.genres || []).map(g => g.name).join(', '),
    miniSynopsis: (apiAnime.synopsis || "Sinopse não disponível.").substring(0, 250) + '...',
    fullSynopsis: apiAnime.synopsis || "Sinopse não disponível.",
    score: apiAnime.score || "N/A",
    rank: apiAnime.rank || "N/A",
    season: apiAnime.season ? `${apiAnime.season.charAt(0).toUpperCase() + apiAnime.season.slice(1)} ${apiAnime.year}` : "Desconhecido",
    episodes: apiAnime.episodes || 0,
    duration: apiAnime.duration || "24 min",
    durationParsed: parseDuration(apiAnime.duration || "24 min")
});

// --- Lógica de Modais ---
async function openAnimeDetailsModal(anime) {
    if (!animeDetailsModal) return;
    currentModalAnime = anime;

    animeDetailsModalTitle.textContent = anime.title;
    animeDetailsModalImage.src = anime.imageUrl;
    animeSynopsisArea.innerHTML = `<p>${anime.fullSynopsis || anime.miniSynopsis}</p>`;

    document.getElementById('animeDetailsModalScore').textContent = anime.score;
    document.getElementById('animeDetailsModalRank').textContent = anime.rank;
    document.getElementById('animeDetailsModalSeason').textContent = anime.season;
    document.getElementById('animeDetailsModalGenres').textContent = anime.genres;
    document.getElementById('animeDetailsModalUsers').textContent = anime.users || 'N/A';

    animeDetailsModal.classList.remove('hidden');

    // --- Lógica de Biblioteca e Nota ---
    const actionsDiv = document.getElementById('userAnimeActions');
    const loginWarning = document.getElementById('loginWarning');
    const statusSelect = document.getElementById('animeStatusSelect');
    const episodesInput = document.getElementById('episodesInput');
    const totalDisplay = document.getElementById('episodesTotalDisplay');
    const countDisplay = document.getElementById('episodesCountDisplay');
    const scoreInput = document.getElementById('animeScoreInput'); // Input de Nota

    // Reset visual
    totalDisplay.textContent = anime.episodes || "?";
    episodesInput.max = anime.episodes || 9999;
    
    const user = auth.currentUser;
    if (user) {
        actionsDiv.classList.remove('hidden');
        loginWarning.classList.add('hidden');

        try {
            const docRef = doc(db, "users", user.uid, "library", anime.id.toString());
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                statusSelect.value = data.status || "plan_to_watch";
                episodesInput.value = data.watched_episodes || 0;
                countDisplay.textContent = data.watched_episodes || 0;
                if(scoreInput) scoreInput.value = data.personal_score || ""; // Carrega nota
            } else {
                statusSelect.value = "plan_to_watch";
                episodesInput.value = 0;
                countDisplay.textContent = 0;
                if(scoreInput) scoreInput.value = "";
            }
        } catch (e) {
            console.error("Erro ao buscar dados do anime:", e);
        }
    } else {
        actionsDiv.classList.add('hidden');
        loginWarning.classList.remove('hidden');
    }

    episodesInput.oninput = () => countDisplay.textContent = episodesInput.value;
}

if (closeAnimeDetailsModalBtn) closeAnimeDetailsModalBtn.addEventListener('click', () => animeDetailsModal.classList.add('hidden'));
if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

// --- Lógica de Carrossel ---
function createAnimeCard(anime) {
    const slideItem = document.createElement('div');
    slideItem.innerHTML = `<div class="anime-item-wrapper"><img src="${anime.imageUrl}" alt="${anime.title}" class="anime-image-display" onerror="getDefaultImageOnError(event)"><h3 class="anime-title-display" title="${anime.title}">${anime.title}</h3></div>`;
    slideItem.querySelector('.anime-item-wrapper').addEventListener('click', () => openAnimeDetailsModal(anime));
    return slideItem;
}

function populateCarousel(element, animes) {
    if (!element) return;
    if ($(element).hasClass('slick-initialized')) $(element).slick('unslick');
    element.innerHTML = '';
    animes.forEach(anime => element.appendChild(createAnimeCard(anime)));
}

function initializeSlickCarousel(selector) {
    $(selector).slick({ dots: true, infinite: true, speed: 300, slidesToShow: 5, slidesToScroll: 5, responsive: [{ breakpoint: 1380, settings: { slidesToShow: 4, slidesToScroll: 4 } }, { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 3 } }, { breakpoint: 768, settings: { slidesToShow: 2, slidesToScroll: 2, dots: false } }, { breakpoint: 480, settings: { slidesToShow: 2, slidesToScroll: 2, dots: false } }] });
}

// --- Lógica do Hero Carousel ---
function createHeroSlide(anime) {
    const slide = document.createElement('div');
    slide.className = 'hero-slide';
    slide.innerHTML = `
        <div class="hero-background-image" style="background-image: url('${anime.imageUrl}')"></div>
        <div class="hero-overlay"></div>
        <div class="hero-content">
            <div class="hero-poster">
                <img src="${anime.imageUrl}" alt="Poster de ${anime.title}" onerror="getDefaultImageOnError(event)">
            </div>
            <div class="hero-info">
                <h2>${anime.title}</h2>
                <p class="genres">${anime.genres}</p>
                <p class="synopsis">${anime.miniSynopsis}</p>
            </div>
        </div>
    `;
    slide.addEventListener('click', () => openAnimeDetailsModal(anime));
    return slide;
}

function populateHeroCarousel(animes) {
    if (!heroCarouselEl) return;
    heroCarouselEl.innerHTML = '';
    animes.forEach(anime => heroCarouselEl.appendChild(createHeroSlide(anime)));
}

function initializeHeroCarousel() {
    if (!heroCarouselEl || $(heroCarouselEl).hasClass('slick-initialized')) return;
    $(heroCarouselEl).slick({ dots: true, arrows: true, infinite: true, speed: 500, fade: true, cssEase: 'linear', autoplay: true, autoplaySpeed: 5000 });
}

// --- Lógica de Fetch ---
async function fetchAndDisplayData() {
    showLoadingState(true);
    try {
        const popularPromise = fetch("https://api.jikan.moe/v4/top/anime?limit=15");
        const recentPromise = fetch("https://api.jikan.moe/v4/seasons/now?limit=15");
        const [popularResponse, recentResponse] = await Promise.all([popularPromise, recentPromise]);
        
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

    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    } finally {
        showLoadingState(false);
    }
}

function showLoadingState(isLoading) {
const carousels = [popularAnimesCarouselEl, mostRecentAnimesCarouselEl];
    
    // HTML do Skeleton (5 cards fantasmas)
    const skeletonHTML = `
        <div class="skeleton-wrapper">
            ${Array(5).fill('').map(() => `
                <div class="skeleton-card">
                    <div class="skeleton-image"></div>
                    <div class="skeleton-text"></div>
                </div>
            `).join('')}
        </div>
    `;

    carousels.forEach(carousel => {
        if (!carousel) return;
        
        if (isLoading) {
            // Se já tiver slick inicializado, destruir para mostrar o loading limpo
            if ($(carousel).hasClass('slick-initialized')) {
                $(carousel).slick('unslick');
            }
            carousel.innerHTML = skeletonHTML;
        } else {
            // Quando parar de carregar, o populateCarousel vai limpar o HTML, 
            // então não precisamos remover explicitamente o skeleton aqui,
            // apenas garantir que não haja "lixo" se estiver vazio.
            const skeletonWrapper = carousel.querySelector('.skeleton-wrapper');
            if (skeletonWrapper) skeletonWrapper.remove();
        }
    });

    // Loading específico para o Hero (apenas um bloco grande)
    if (heroCarouselEl && isLoading) {
        if ($(heroCarouselEl).hasClass('slick-initialized')) $(heroCarouselEl).slick('unslick');
        heroCarouselEl.innerHTML = `
            <div style="height: 350px; width: 100%; background: var(--bg-tertiary); position: relative; overflow: hidden; border-radius: 20px;">
                <div style="position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent); animation: shimmer 1.5s infinite;"></div>
                <div style="position: absolute; bottom: 40px; left: 40px; height: 30px; width: 200px; background: var(--bg-secondary); border-radius: 4px;"></div>
            </div>`;
    }
}

// --- Lógica de Pesquisa ---
const handleSearch = async (searchTerm) => {
    if (searchTerm.length < 3) { searchResultsPreview.classList.add('hidden'); return; }
    searchResultsPreview.innerHTML = `<p style="padding: 0.75rem; text-align: center;">A pesquisar...</p>`;
    searchResultsPreview.classList.remove('hidden');
    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTerm)}&limit=5`);
        const searchData = await response.json();
        searchResultsPreview.innerHTML = ''; 
        if (searchData.data && searchData.data.length > 0) {
            searchData.data.forEach(animeData => {
                const anime = transformApiData(animeData);
                const item = document.createElement('div');
                item.className = 'search-preview-item';
                item.innerHTML = `<img src="${anime.imageUrl}" class="search-preview-image" onerror="getSearchPreviewImageOnError(event)"><div class="search-preview-info"><h4 class="search-preview-title">${anime.title}</h4><p class="search-preview-synopsis">${anime.miniSynopsis}</p></div>`;
                item.addEventListener('click', () => { openAnimeDetailsModal(anime); searchResultsPreview.classList.add('hidden'); searchInput.value = ''; });
                searchResultsPreview.appendChild(item);
            });
        } else { searchResultsPreview.innerHTML = `<p style="padding: 0.75rem; text-align: center;">Nenhum resultado.</p>`; }
    } catch (error) { console.error("Erro na busca:", error); searchResultsPreview.innerHTML = `<p style="padding: 0.75rem; text-align: center;">Erro ao buscar.</p>`; }
};

// --- Inicialização e Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    const currentTheme = localStorage.getItem('animeSiteTheme') || 'dark';
    document.body.className = `${currentTheme}-theme`;
    if(themeSwitcher) themeSwitcher.value = currentTheme;
    
    fetchAndDisplayData();

    if (searchInput) {
        const debouncedSearch = debounce(handleSearch);
        searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value.trim()));
        document.addEventListener('click', (e) => { if (searchInput.parentElement && !searchInput.parentElement.contains(e.target)) searchResultsPreview.classList.add('hidden'); });
    }
    
    // Auth & Sidebar Mobile
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const closeMobileSidebarBtn = document.getElementById('closeMobileSidebar');
    const mobileSidebarOverlay = document.getElementById('mobileSidebarOverlay');
    const mobileSidebar = document.getElementById('mobileSidebar');
    
    function openMobileNav() { if (mobileSidebarOverlay) mobileSidebarOverlay.classList.remove('hidden'); if (mobileSidebar) setTimeout(() => mobileSidebar.classList.add('open'), 10); }
    function closeMobileNav() { if (mobileSidebar) mobileSidebar.classList.remove('open'); if (mobileSidebarOverlay) setTimeout(() => mobileSidebarOverlay.classList.add('hidden'), 300); }
    if (mobileMenuButton) mobileMenuButton.addEventListener('click', openMobileNav);
    if (closeMobileSidebarBtn) closeMobileSidebarBtn.addEventListener('click', closeMobileNav);
    if (mobileSidebarOverlay) mobileSidebarOverlay.addEventListener('click', (e) => { if (e.target === mobileSidebarOverlay) closeMobileNav(); });

    // Settings
    if (settingsLink) settingsLink.addEventListener('click', (e) => { e.preventDefault(); if(settingsModal) settingsModal.classList.remove('hidden'); });
    if (settingsLinkMobile) settingsLinkMobile.addEventListener('click', (e) => { e.preventDefault(); closeMobileNav(); if(settingsModal) settingsModal.classList.remove('hidden'); });
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
        if(themeSwitcher) {
            const newTheme = themeSwitcher.value;
            document.body.className = `${newTheme}-theme`;
            localStorage.setItem('animeSiteTheme', newTheme);
        }
        if(settingsModal) settingsModal.classList.add('hidden');
    });

    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    if(toggleBtn) toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

    // --- AUTENTICAÇÃO ---
    const authModal = document.getElementById('authModal');
    const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const userGreeting = document.getElementById('userGreeting');
    const logoutButtons = document.querySelectorAll('.sidebar-logout a');
    const profileLinks = document.querySelectorAll('nav a[href="profile.html"]');

    if(closeAuthModalBtn) closeAuthModalBtn.addEventListener('click', () => authModal.classList.add('hidden'));

    const loginTabBtn = document.getElementById('loginTabButton');
    const registerTabBtn = document.getElementById('registerTabButton');
    if(loginTabBtn && registerTabBtn) {
        loginTabBtn.addEventListener('click', () => {
            loginTabBtn.classList.add('active'); registerTabBtn.classList.remove('active');
            loginForm.classList.add('active'); registerForm.classList.remove('active');
            document.getElementById('authModalTitle').textContent = "Aceder à Conta";
        });
        registerTabBtn.addEventListener('click', () => {
            registerTabBtn.classList.add('active'); loginTabBtn.classList.remove('active');
            registerForm.classList.add('active'); loginForm.classList.remove('active');
            document.getElementById('authModalTitle').textContent = "Criar Nova Conta";
        });
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            const nome = user.displayName || "Visitante";
            if(userGreeting) userGreeting.innerHTML = `Olá, <span style="color: var(--text-accent);">${nome}</span>!!`;
            profileLinks.forEach(link => link.onclick = null);
            logoutButtons.forEach(btn => btn.parentElement.style.display = 'block');
        } else {
            if(userGreeting) userGreeting.textContent = "Olá, Visitante!!";
            profileLinks.forEach(link => { link.onclick = (e) => { e.preventDefault(); authModal.classList.remove('hidden'); }; });
            logoutButtons.forEach(btn => btn.parentElement.style.display = 'none');
        }
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            try { await signInWithEmailAndPassword(auth, email, password); authModal.classList.add('hidden'); } 
            catch (e) { document.getElementById('loginErrorMessage').classList.remove('hidden'); document.getElementById('loginErrorMessage').textContent = "Erro no login: " + e.message; }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const username = document.getElementById('registerUsername').value;
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                if(username) await updateProfile(cred.user, { displayName: username });
                authModal.classList.add('hidden');
                if(userGreeting) userGreeting.innerHTML = `Olá, <span style="color: var(--text-accent);">${username}</span>!!`;
            } catch (e) { document.getElementById('registerErrorMessage').classList.remove('hidden'); document.getElementById('registerErrorMessage').textContent = "Erro: " + e.message; }
        });
    }

    logoutButtons.forEach(btn => btn.addEventListener('click', async (e) => { e.preventDefault(); await signOut(auth); window.location.href = "index.html"; }));

    // --- SALVAR NA BIBLIOTECA (Listener Completo) ---
    const saveToLibraryBtn = document.getElementById('saveToLibraryBtn');
    if (saveToLibraryBtn) {
        saveToLibraryBtn.addEventListener('click', async () => {
            if (!auth.currentUser || !currentModalAnime) return;

            const status = document.getElementById('animeStatusSelect').value;
            const watched = parseInt(document.getElementById('episodesInput').value) || 0;
            const scoreElement = document.getElementById('animeScoreInput');
            
            // Verifica se o elemento existe antes de pegar o valor
            const score = scoreElement ? scoreElement.value : null;

            const originalText = saveToLibraryBtn.textContent;
            saveToLibraryBtn.textContent = "Salvando...";
            saveToLibraryBtn.disabled = true;

            try {
                const libraryItem = {
                    id: currentModalAnime.id,
                    title: currentModalAnime.title,
                    imageUrl: currentModalAnime.imageUrl,
                    total_episodes: currentModalAnime.episodes || 0,
                    duration_minutes: currentModalAnime.durationParsed || 24,
                    status: status,
                    watched_episodes: watched,
                    personal_score: score ? parseFloat(score) : null,
                    last_updated: new Date()
                };

                await setDoc(doc(db, "users", auth.currentUser.uid, "library", currentModalAnime.id.toString()), libraryItem);
                
                saveToLibraryBtn.textContent = "Salvo!";
            } catch (e) {
                console.error("Erro ao salvar:", e);
                saveToLibraryBtn.textContent = "Erro :(";
            }

            setTimeout(() => {
                saveToLibraryBtn.textContent = originalText;
                saveToLibraryBtn.disabled = false;
            }, 2000);
        });
    }
});