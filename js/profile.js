// js/profile.js
import { auth, db } from "./firebase-config.js";
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { openAnimeDetailsModal, initModalListeners } from "./anime-modal.js";

// --- CONFIGURAÇÃO DOS EMBLEMAS ---
const BADGES_CONFIG = [
    { 
        id: 'newbie', 
        image: 'img/badges/Studio Ghibli Burn Sticker by TeaBag.gif',
        label: 'Novato', 
        desc: 'Bem-vindo ao portal!',
        check: (stats) => true 
    },
    { 
        id: 'watcher_10', 
        image: 'img/badges/46bd7a7982a61c3fd9d64bc468deb498.gif', 
        label: 'Observador', 
        desc: 'Assistiu 10 animes',
        check: (stats) => stats.watchedCount >= 10 
    },
    { 
        id: 'otaku_50', 
        image: 'img/badges/Pokemon Eating GIF.gif', 
        label: 'Hardcore', 
        desc: 'Assistiu 50 animes',
        check: (stats) => stats.watchedCount >= 50 
    },
    { 
        id: 'collector', 
        image: 'img/badges/55b81a4194565a56b10d41c29482c744.gif', 
        label: 'Colecionador', 
        desc: 'Tem 20 animes na biblioteca',
        check: (stats) => stats.totalLibrary >= 20
    },
    { 
        id: 'pioneer', 
        image: 'img/badges/Pokemon GIF.gif',
        label: 'Pioneiro', 
        desc: 'Um dos primeiros usuários!',
        check: (stats) => true 
    },
    {
        id: 'euyela',
        image: 'img/badges/studio ghibli hug GIF.gif',
        label: '',
        desc: 'secreto',
        check: (stats) => false
    },
];

// Variáveis Globais
let selectedFavorites = [];
let fullLibrary = [];
let currentUser = null;
let currentBadgeId = null; // Emblema selecionado atualmente

// Utils
function getBase64(file) { return new Promise((r, j) => { const rd = new FileReader(); rd.readAsDataURL(file); rd.onload = () => r(rd.result); rd.onerror = j; }); }
function formatTime(min) { if(!min) return "0h"; const d=Math.floor(min/1440), h=Math.floor((min%1440)/60), m=min%60; let p=[]; if(d>0)p.push(`${d}d`); if(h>0)p.push(`${h}h`); if(m>0&&d===0)p.push(`${m}m`); return p.join(' ') + " (" + min.toLocaleString() + " min)"; }
function applyTheme(t) { document.body.className = `${t}-theme`; const s = document.getElementById('themeSwitcher'); if(s) s.value = t; }

// Database
async function getUserData(uid) { const d = await getDoc(doc(db, "users", uid)); return d.exists() ? d.data() : null; }
async function getUserLibrary(uid) { const s = await getDocs(collection(db, "users", uid, "library")); return s.docs.map(d => d.data()); }
async function saveUserData(d) { if(!currentUser) return alert("Login!"); await setDoc(doc(db, "users", currentUser.uid), d, {merge:true}); renderProfileHeader(); renderFavorites(); }

// --- RENDERIZAÇÃO ---

async function renderProfileHeader() {
    const data = await getUserData(currentUser.uid);
    const usernameDisplay = document.getElementById("profileUsername");
    const badgeDisplay = document.getElementById("profileBadge"); // Elemento do Emblema

    // Nome
    if (usernameDisplay) usernameDisplay.childNodes[0].nodeValue = (data && data.username) || currentUser.displayName || "Usuário ";
    
    // Imagens
    if (data) {
        if (data.avatar) document.querySelector(".profile-avatar").src = data.avatar;
        if (data.banner) document.querySelector(".banner-image").src = data.banner;
        selectedFavorites = data.favorites || [];
        currentBadgeId = data.selectedBadge || null;
    }

    // Renderizar Emblema ao lado do nome
if (badgeDisplay) {
        badgeDisplay.innerHTML = "";
        if (currentBadgeId) {
            const badgeConfig = BADGES_CONFIG.find(b => b.id === currentBadgeId);
            if (badgeConfig) {
                badgeDisplay.innerHTML = `<img src="${badgeConfig.image}" alt="${badgeConfig.label}" title="${badgeConfig.label}">`;
            }
        }
    }
}

async function renderLibraryAndStats() {
    fullLibrary = await getUserLibrary(currentUser.uid);
    
    // Calcular Estatísticas para os Emblemas
    let totalMinutes = 0;
    let totalEpisodes = 0;
    let watchedCount = 0;

    fullLibrary.forEach(anime => {
        const eps = parseInt(anime.watched_episodes) || 0;
        const dur = parseInt(anime.duration_minutes) || 24;
        totalEpisodes += eps;
        totalMinutes += (eps * dur);
        
        // Conta como "assistido" se tiver status 'completed' ou mais de 0 eps
        if (anime.status === 'completed' || eps > 0) watchedCount++;
    });

    // Guardamos estatísticas globais para usar na checagem de emblemas
    window.userStats = {
        watchedCount: watchedCount,
        totalLibrary: fullLibrary.length,
        totalEpisodes: totalEpisodes
    };

    const statsEl = document.getElementById("profileStats");
    if(statsEl) {
        const iconTv = typeof lucide !== 'undefined' ? '<i data-lucide="tv" style="width:1rem;vertical-align:middle"></i>' : '📺';
        const iconClock = typeof lucide !== 'undefined' ? '<i data-lucide="clock" style="width:1rem;vertical-align:middle"></i>' : '⏰';
        statsEl.innerHTML = `${iconTv} ${totalEpisodes} eps <br>${iconClock} ${formatTime(totalMinutes)}`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    filterAndRenderLibrary(document.querySelector('.library-tab.active')?.dataset.status || 'all');
}

function filterAndRenderLibrary(status) {
    const container = document.getElementById("libraryContainer");
    if(!container) return;
    container.innerHTML = "";
    let filtered = fullLibrary;
    if (status !== 'all') filtered = fullLibrary.filter(anime => anime.status === status);
    if (filtered.length === 0) { container.innerHTML = "<p style='color:var(--text-secondary);width:100%;text-align:center;'>Vazio.</p>"; return; }
    filtered.forEach(a => {
        const d = document.createElement("div"); d.className = "anime-item-wrapper"; d.addEventListener('click', () => openAnimeDetailsModal(a));
        const sc = a.personal_score ? `<div style="position:absolute;bottom:5px;left:5px;background:rgba(0,0,0,0.8);color:#FFD700;padding:2px 6px;border-radius:4px;font-size:0.7rem;font-weight:bold;">★ ${a.personal_score}</div>` : '';
        d.innerHTML = `<div style="position:relative;"><img src="${a.imageUrl}" class="anime-image-display"><span style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.8);color:white;padding:2px 6px;border-radius:4px;font-size:0.7rem;">${a.watched_episodes||0}/${a.total_episodes||'?'}</span>${sc}</div><h3 class="anime-title-display">${a.title}</h3>`;
        container.appendChild(d);
    });
}

function renderFavorites() {
    const c = document.getElementById("favoritesContainer"); if(!c) return; c.innerHTML = "";
    if (selectedFavorites.length > 0) selectedFavorites.forEach(a => { const d = document.createElement("div"); d.className = "anime-item-wrapper"; d.addEventListener('click', () => openAnimeDetailsModal(a)); d.innerHTML = `<img src="${a.imageUrl}" class="anime-image-display"><h3 class="anime-title-display">${a.title}</h3>`; c.appendChild(d); });
    else c.innerHTML = "<p>Sem favoritos.</p>";
}

// --- LOGICA DE MODAIS ---

// Renderizar Grid de Emblemas no Modal
function renderBadgesGrid() {
    const container = document.getElementById('badgesGrid');
    if (!container) return;
    container.innerHTML = '';

    const stats = window.userStats || { watchedCount: 0, totalLibrary: 0 };

    BADGES_CONFIG.forEach(badge => {
        const isUnlocked = badge.check(stats);
        const isSelected = badge.id === currentBadgeId;

        const item = document.createElement('div');
        item.className = `badge-item ${isUnlocked ? 'unlocked' : ''} ${isSelected ? 'selected' : ''}`;
        
        // Renderiza IMAGEM
        item.innerHTML = `
            <img src="${badge.image}" class="badge-icon-img" alt="${badge.label}">
            <span class="badge-name">${badge.label}</span>
            <span class="badge-desc" style="${isUnlocked ? 'display:block' : ''}">${isUnlocked ? badge.desc : 'Bloqueado'}</span>
        `;

        if (isUnlocked) {
            item.onclick = () => {
                document.querySelectorAll('.badge-item').forEach(b => b.classList.remove('selected'));
                item.classList.add('selected');
                document.getElementById('editProfileModal').dataset.tempBadge = badge.id;
            };
        }

        container.appendChild(item);
    });
}

// Salvar Perfil (Info + Emblema)
async function saveProfile() {
    const username = document.getElementById('profileNameInput').value;
    const avatarFile = document.getElementById('profileAvatarInput').files[0];
    const bannerFile = document.getElementById('profileBannerInput').files[0];
    
    // Pega o emblema selecionado temporariamente
    const tempBadge = document.getElementById('editProfileModal').dataset.tempBadge;

    let profileData = { 
        username: username || (currentUser ? currentUser.displayName : "Usuário")
    };
    
    // Se escolheu um emblema novo, salva. Se não, mantém o atual.
    if (tempBadge) {
        profileData.selectedBadge = tempBadge;
    }

    if (avatarFile) profileData.avatar = await getBase64(avatarFile);
    if (bannerFile) profileData.banner = await getBase64(bannerFile);

    await saveUserData(profileData);
    document.getElementById('editProfileModal').classList.add('hidden');
}

// ... (searchFavorites, addFavorite, removeFavorite iguais) ...
async function searchFavorites(q) {
    const r = document.getElementById("favoritesSearchResults"); if(q.length<3){r.classList.add("hidden");return;} r.classList.remove("hidden");
    try { const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=5`); const d = await res.json(); r.innerHTML = ""; d.data.forEach(a => { const i = document.createElement("div"); i.className = "search-preview-item"; i.innerHTML = `<img src="${a.images.jpg.image_url}" class="search-preview-image"><div><h4>${a.title}</h4></div>`; i.onclick = () => addFavorite({id:a.mal_id, title:a.title, imageUrl:a.images.jpg.image_url}); r.appendChild(i); }); } catch(e){}
}
function addFavorite(a) { if(selectedFavorites.length>=3) return alert("Max 3!"); if(!selectedFavorites.find(f=>f.id===a.id)){selectedFavorites.push(a);renderSelectedFavoritesPreview();} }
window.removeFavorite = function(id) { selectedFavorites = selectedFavorites.filter(f=>f.id!==id); renderSelectedFavoritesPreview(); }
function renderSelectedFavoritesPreview() {
    const container = document.getElementById("selectedFavorites");
    container.innerHTML = "";
    
    if (selectedFavorites.length === 0) {
        // Caixa pontilhada se vazio
        container.innerHTML = `
            <div style="grid-column: 1/-1; display:flex; flex-direction:column; align-items:center; justify-content:center; border: 2px dashed var(--border-color); border-radius: 0.75rem; color: var(--text-secondary); height: 200px;">
                <p>Nenhum favorito selecionado.</p>
                <p style="font-size: 0.8rem; margin-top:0.5rem;">Use a busca acima para adicionar.</p>
            </div>
        `;
        return;
    }

    selectedFavorites.forEach(anime => {
        const div = document.createElement('div');
        div.className = "anime-item-wrapper"; // Classe padrão
        
        // Estrutura simples: Botão + Imagem + Título
        div.innerHTML = `
            <button onclick="window.removeFavorite(${anime.id})" title="Remover">✕</button>
            <img src="${anime.imageUrl}" class="anime-image-display" alt="${anime.title}">
            <h5>${anime.title}</h5>
        `;
        container.appendChild(div);
    });
}
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    applyTheme(localStorage.getItem('animeSiteTheme') || 'dark');
    initModalListeners(); 
    window.addEventListener('libraryUpdated', () => {
        renderLibraryAndStats(); // Atualiza stats para desbloquear emblemas em tempo real
    });

    const sidebar = document.getElementById('sidebar'); const toggle = document.getElementById('toggleSidebarBtn'); if(toggle) toggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    
    // Auth
    onAuthStateChanged(auth, async (u) => {
        if(u) { currentUser=u; await renderProfileHeader(); renderFavorites(); renderLibraryAndStats(); }
        else window.location.href="index.html";
    });

    // Lógica das Abas do Modal de Edição
    const tabEditInfo = document.getElementById('tabEditInfo');
    const tabEditBadges = document.getElementById('tabEditBadges');
    const contentEditInfo = document.getElementById('editInfoContent');
    const contentEditBadges = document.getElementById('editBadgesContent');

    if(tabEditInfo && tabEditBadges) {
        tabEditInfo.onclick = () => {
            tabEditInfo.classList.add('active'); tabEditBadges.classList.remove('active');
            contentEditInfo.classList.remove('hidden'); contentEditBadges.classList.add('hidden');
        };
        tabEditBadges.onclick = () => {
            tabEditBadges.classList.add('active'); tabEditInfo.classList.remove('active');
            contentEditBadges.classList.remove('hidden'); contentEditInfo.classList.add('hidden');
            renderBadgesGrid(); // Renderiza ao abrir a aba
        };
    }

    // Settings
    const settingsModal=document.getElementById('settingsModal'); const closeSettings=document.getElementById('closeSettingsModal'); const saveSettings=document.getElementById('saveSettings'); const themeS=document.getElementById('themeSwitcher');
    if(document.getElementById('settingsLink')) document.getElementById('settingsLink').addEventListener('click',(e)=>{e.preventDefault();settingsModal.classList.remove('hidden');});
    if(closeSettings) { const nc = closeSettings.cloneNode(true); closeSettings.parentNode.replaceChild(nc, closeSettings); nc.addEventListener('click', ()=>settingsModal.classList.add('hidden')); }
    if(saveSettings) saveSettings.addEventListener('click', ()=>{ if(themeS){const t=themeS.value;document.body.className=`${t}-theme`;localStorage.setItem('animeSiteTheme',t);} settingsModal.classList.add('hidden'); });

    // Library Tabs
    const tabs=document.querySelectorAll('.library-tab'); tabs.forEach(t=>{ t.addEventListener('click',()=>{ tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active'); filterAndRenderLibrary(t.dataset.status); }); });

    // Modals Open
    document.getElementById("editProfileBtn")?.addEventListener("click",async()=>{ 
        const d=await getUserData(currentUser.uid); 
        if(d)document.getElementById('profileNameInput').value=d.username||''; 
        // Reset abas para Info
        if(tabEditInfo) tabEditInfo.click();
        document.getElementById("editProfileModal").classList.remove("hidden"); 
    });

    document.getElementById("closeEditProfileModal")?.addEventListener("click",()=>document.getElementById("editProfileModal").classList.add("hidden"));
    document.getElementById("saveProfileBtn")?.addEventListener("click", saveProfile);
    
    // Favorites Modal
    document.getElementById("chooseFavoritesBtn")?.addEventListener("click",()=>{renderSelectedFavoritesPreview();document.getElementById("favoritesModal").classList.remove("hidden");});
    document.getElementById("closeFavoritesModal")?.addEventListener("click",()=>document.getElementById("favoritesModal").classList.add("hidden"));
    document.getElementById("saveFavoritesBtn")?.addEventListener("click",async()=>{await saveUserData({favorites:selectedFavorites});document.getElementById("favoritesModal").classList.add("hidden");});
    document.getElementById("favoritesSearchInput")?.addEventListener("input",(e)=>searchFavorites(e.target.value));
    
    document.querySelectorAll('.sidebar-logout a, .logout-link').forEach(b => b.addEventListener('click', async(e)=>{e.preventDefault(); await signOut(auth); window.location.href="index.html";}));
});