import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { openAnimeDetailsModal, initModalListeners } from "./anime-modal.js";

// State
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let currentParams = {};

// DOM Elements
const grid = document.getElementById('catalogGrid');
const sentinel = document.getElementById('loadingSentinel');
const titleEl = document.getElementById('pageTitle');
const subtitleEl = document.getElementById('pageSubtitle');

// Utils
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        type: params.get('type') || 'genre', // 'top', 'season', 'genre'
        id: params.get('genre') || '',
        label: params.get('label') || 'Lista',
        order: params.get('order') || 'score',
        filter: params.get('filter') || ''
    };
}


function createCard(anime) {
    const div = document.createElement('div');
    div.className = 'anime-item-wrapper';
    
    const imageUrl = anime.images?.jpg?.large_image_url || 
                     anime.images?.jpg?.image_url || 
                     'https://placehold.co/225x320?text=Sem+Img';

    const score = anime.score || 'N/A';

    const imgStyle = `
        width: 100%;
        height: auto;
        aspect-ratio: 2 / 3;
        object-fit: cover;
        border-radius: 0.5rem;
        display: block;
    `;

    div.innerHTML = `
        <div style="position:relative; width: 100%;">
            <img src="${imageUrl}" class="anime-image-display" loading="lazy" alt="${anime.title}" style="${imgStyle}" onerror="this.src='https://placehold.co/225x320?text=Erro'">
            <div style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.7);color:white;padding:2px 6px;border-radius:4px;font-size:0.7rem;backdrop-filter:blur(2px);">⭐ ${score}</div>
        </div>
        <h3 class="anime-title-display" style="font-size: 0.85rem; margin-top: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${anime.title}</h3>
    `;

    // Preparar dados para o modal (mantém igual)
    div.onclick = () => openAnimeDetailsModal({
        id: anime.mal_id,
        title: anime.title,
        imageUrl: imageUrl,
        score: score,
        rank: anime.rank,
        episodes: anime.episodes,
        genres: (anime.genres || []).map(g => g.name).join(', '),
        fullSynopsis: anime.synopsis,
        trailerUrl: anime.trailer?.embed_url,
        duration: anime.duration,
        season: anime.season ? `${anime.season} ${anime.year || ''}` : ''
    });
    
    return div;
}

async function fetchData() {
    if (isLoading || !hasMore) return;
    isLoading = true;

    try {
        let url = `https://api.jikan.moe/v4`;
        
        if (currentParams.type === 'top') {
            url += `/top/anime?page=${currentPage}`;
        } else if (currentParams.type === 'season') {
            url += `/seasons/now?page=${currentPage}&order_by=${currentParams.order}&sort=desc&sfw=true`;
        } else {
            url += `/anime?genres=${currentParams.id}&page=${currentPage}&order_by=${currentParams.order}&sort=desc&sfw=true&type=tv`;
            if(currentParams.filter) url += `&genres_exclude=${currentParams.filter}`;
        }

        const res = await fetch(url);
        
        if (res.status === 429) {
            console.warn("Rate limit atingido. Tentando novamente em breve...");
            isLoading = false;
            return; 
        }

        const json = await res.json();
        
        if (!json.data || json.data.length === 0) {
            hasMore = false;
            sentinel.innerHTML = "<p style='color:var(--text-secondary); text-align:center; padding:1rem;'>Fim da lista.</p>";
            return;
        }

        json.data.forEach(anime => {
            if(anime.mal_id) {
                grid.appendChild(createCard(anime));
            }
        });

        currentPage++;
        
        if (!json.pagination || !json.pagination.has_next_page) {
            hasMore = false;
            sentinel.innerHTML = "<p style='color:var(--text-secondary); text-align:center; padding:1rem;'>Fim da lista.</p>";
        }

    } catch (error) {
        console.error("Erro ao buscar:", error);
        hasMore = false; 
        sentinel.innerHTML = "<p style='text-align:center; padding:1rem;'>Ocorreu um erro ao carregar. Atualize a página.</p>";
    } finally {
        isLoading = false;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    initModalListeners();
    
    // Tema
    const theme = localStorage.getItem('animeSiteTheme') || 'dark';
    document.body.className = `${theme}-theme`;

    // Configurar Página
    currentParams = getUrlParams();
    
    // Títulos Dinâmicos
    if (currentParams.type === 'top') {
        titleEl.textContent = "Animes Populares 🏆";
        subtitleEl.textContent = "Os melhores avaliados pela comunidade";
    } else if (currentParams.type === 'season') {
        titleEl.textContent = "Temporada Atual 🔥";
        subtitleEl.textContent = "O que está bombando agora";
    } else {
        titleEl.textContent = currentParams.label || "Gênero";
        subtitleEl.textContent = "Explorando coleção";
    }

    // Sidebar Desktop Toggle (IMPORTANTE: Estava faltando na versão anterior)
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    if(toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // Auth Listeners
    onAuthStateChanged(auth, (user) => {
        // Lógica de usuário se necessário
    });
    
    // Logout
    document.querySelectorAll('.logout-link').forEach(l => l.addEventListener('click', async (e) => {
        e.preventDefault(); await signOut(auth); window.location.href = "index.html";
    }));

    // Mobile Menu
    const mobileMenuBtn = document.getElementById('mobileMenuButton');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('mobileSidebarOverlay');
    const closeMenu = document.getElementById('closeMobileSidebar');
    
    const toggleMenu = () => {
        overlay.classList.toggle('hidden');
        setTimeout(() => mobileSidebar.classList.toggle('open'), 10);
    };
    
    if(mobileMenuBtn) mobileMenuBtn.onclick = toggleMenu;
    if(closeMenu) closeMenu.onclick = toggleMenu;
    if(overlay) overlay.onclick = (e) => { if(e.target === overlay) toggleMenu(); };

    // Infinite Scroll Observer
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            fetchData();
        }
    }, { rootMargin: '200px' });

    if(sentinel) observer.observe(sentinel);
    
    // Settings Modal
    const setModal = document.getElementById('settingsModal');
    document.getElementById('settingsLink')?.addEventListener('click', (e)=>{e.preventDefault(); setModal.classList.remove('hidden')});
    document.getElementById('settingsLinkMobile')?.addEventListener('click', (e)=>{e.preventDefault(); toggleMenu(); setModal.classList.remove('hidden')});
    document.getElementById('closeSettingsModal')?.addEventListener('click', ()=>setModal.classList.add('hidden'));
    document.getElementById('saveSettings')?.addEventListener('click', ()=>{
        const t = document.getElementById('themeSwitcher').value;
        document.body.className = `${t}-theme`;
        localStorage.setItem('animeSiteTheme', t);
        setModal.classList.add('hidden');
    });
});