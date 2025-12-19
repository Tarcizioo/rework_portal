// js/profile.js
import { auth, db } from "./firebase-config.js";
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { openAnimeDetailsModal, initModalListeners } from "./anime-modal.js";

// --- CONFIGURAÇÃO DOS EMBLEMAS ---
const BADGES_CONFIG = [
    { id: 'newbie', image: 'img/badges/Studio Ghibli Burn Sticker by TeaBag.gif', label: 'Novato', desc: 'Bem-vindo!', check: () => true },
    { id: 'watcher_10', image: 'img/badges/46bd7a7982a61c3fd9d64bc468deb498.gif', label: 'Observador', desc: 'Assistiu 10 animes', check: (s) => s.watchedCount >= 10 },
    { id: 'otaku_50', image: 'img/badges/Pokemon Eating GIF.gif', label: 'Hardcore', desc: 'Assistiu 50 animes', check: (s) => s.watchedCount >= 50 },
    { id: 'collector', image: 'img/badges/55b81a4194565a56b10d41c29482c744.gif', label: 'Colecionador', desc: 'Tem 20 animes na biblioteca', check: (s) => s.totalLibrary >= 20 },
    { id: 'pioneer', image: 'img/badges/Pokemon GIF.gif', label: 'Pioneiro', desc: 'Usuário antigo', check: () => true },
    { id: 'euyela', image: 'img/badges/studio ghibli hug GIF.gif', label: '', desc: 'secreto', check: () => false },
];

let selectedFavorites = [];
let fullLibrary = [];
let currentUser = null;
let currentBadgeId = null;

// Utils
function getBase64(file) { 
    return new Promise((resolve, reject) => { 
        const reader = new FileReader(); 
        reader.readAsDataURL(file); 
        reader.onload = () => resolve(reader.result); 
        reader.onerror = error => reject(error); 
    }); 
}

function formatTime(min) { if(!min) return "0h"; const d=Math.floor(min/1440), h=Math.floor((min%1440)/60), m=min%60; let p=[]; if(d>0)p.push(`${d}d`); if(h>0)p.push(`${h}h`); if(m>0&&d===0)p.push(`${m}m`); return p.join(' ') + " (" + min.toLocaleString() + " min)"; }

function applyTheme(t) { 
    document.body.className = `${t}-theme`; 
    const s = document.getElementById('themeSwitcher'); 
    if(s) s.value = t; 
}

async function getUserData(uid) { const d = await getDoc(doc(db, "users", uid)); return d.exists() ? d.data() : null; }
async function getUserLibrary(uid) { const s = await getDocs(collection(db, "users", uid, "library")); return s.docs.map(d => d.data()); }

// --- RENDER ---
async function renderProfileHeader() {
    if (!currentUser) return;
    try {
        const data = await getUserData(currentUser.uid);
        const usernameDisplay = document.getElementById("profileUsername");
        const bioDisplay = document.getElementById("profileBio");
        const badgeDisplay = document.getElementById("profileBadge");

        if (usernameDisplay) usernameDisplay.childNodes[0].nodeValue = (data && data.username) || currentUser.displayName || "Usuário ";
        
        if (bioDisplay) {
            bioDisplay.textContent = (data && data.bio) ? data.bio : "Sem bio ainda...";
        }

        if (data) {
            if (data.avatar) document.querySelector(".profile-avatar").src = data.avatar;
            if (data.banner) document.querySelector(".banner-image").src = data.banner;
            
            // CORREÇÃO: Carrega a variável E desenha os favoritos imediatamente
            selectedFavorites = data.favorites || [];
            renderFavorites(); // <--- AQUI ESTAVA O PROBLEMA ANTES (Faltava chamar aqui)

            currentBadgeId = data.selectedBadge || null;
        }

        if (badgeDisplay) {
            badgeDisplay.innerHTML = "";
            if (currentBadgeId) {
                const badgeConfig = BADGES_CONFIG.find(b => b.id === currentBadgeId);
                if (badgeConfig) badgeDisplay.innerHTML = `<img src="${badgeConfig.image}" alt="${badgeConfig.label}" title="${badgeConfig.label}">`;
            }
        }
    } catch (e) { console.error("Erro header:", e); }
}

async function renderLibraryAndStats() {
    fullLibrary = await getUserLibrary(currentUser.uid);
    let totalMinutes = 0, totalEpisodes = 0, watchedCount = 0;
    const counts = { all: fullLibrary.length, watching: 0, completed: 0, plan_to_watch: 0, dropped: 0 };

    fullLibrary.forEach(anime => {
        const eps = parseInt(anime.watched_episodes) || 0;
        const dur = parseInt(anime.duration_minutes) || 24;
        totalEpisodes += eps; totalMinutes += (eps * dur);
        if (anime.status === 'completed' || eps > 0) watchedCount++;
        if (counts.hasOwnProperty(anime.status)) counts[anime.status]++;
    });

    updateTabCounts(counts);
    window.userStats = { watchedCount, totalLibrary: fullLibrary.length, totalEpisodes };

    const statsEl = document.getElementById("profileStats");
    if(statsEl) {
        statsEl.innerHTML = `📺 ${totalEpisodes} eps <span style="margin-left:10px">⏰ ${formatTime(totalMinutes)}</span>`;
    }
    filterAndRenderLibrary(document.querySelector('.library-tab.active')?.dataset.status || 'all');
}

function updateTabCounts(counts) {
    const labels = { all: "Todos", watching: "Assistindo", completed: "Completos", plan_to_watch: "Planejo", dropped: "Desistidos" };
    document.querySelectorAll('.library-tab').forEach(tab => {
        const status = tab.dataset.status;
        const count = counts[status] || 0;
        const label = labels[status] || status; 
        tab.textContent = `${label} (${count})`;
    });
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

// --- SALVAMENTO ---
async function saveProfile() {
    const saveBtn = document.getElementById("saveProfileBtn");
    try {
        saveBtn.textContent = "Salvando..."; saveBtn.disabled = true;

        const username = document.getElementById('profileNameInput').value;
        const bio = document.getElementById('profileBioInput').value;
        const avatarFile = document.getElementById('profileAvatarInput').files[0];
        const bannerFile = document.getElementById('profileBannerInput').files[0];
        const tempBadge = document.getElementById('editProfileModal').dataset.tempBadge;

        let profileData = { username: username || (currentUser ? currentUser.displayName : "Usuário"), bio: bio };
        if (tempBadge) profileData.selectedBadge = tempBadge;
        if (avatarFile) profileData.avatar = await getBase64(avatarFile);
        if (bannerFile) profileData.banner = await getBase64(bannerFile);

        await setDoc(doc(db, "users", currentUser.uid), profileData, { merge: true });
        
        // Recarrega o header (que agora chama o renderFavorites automaticamente)
        await renderProfileHeader();
        
        document.getElementById('editProfileModal').classList.add('hidden');
        if(window.showToast) window.showToast("Perfil atualizado!", "success");
    } catch (error) {
        console.error("Erro salvar:", error); alert("Erro ao salvar: " + error.message);
    } finally {
        saveBtn.textContent = "Salvar"; saveBtn.disabled = false;
    }
}

async function saveUserData(d) { 
    if(!currentUser) return; 
    try { 
        await setDoc(doc(db, "users", currentUser.uid), d, {merge:true}); 
        await renderProfileHeader(); // Atualiza tudo
    } 
    catch(e) { console.error(e); alert("Erro ao salvar dados."); }
}

function renderBadgesGrid() {
    const container = document.getElementById('badgesGrid'); if (!container) return; container.innerHTML = '';
    const stats = window.userStats || { watchedCount: 0, totalLibrary: 0 };
    BADGES_CONFIG.forEach(badge => {
        const isUnlocked = badge.check(stats);
        const item = document.createElement('div');
        item.className = `badge-item ${isUnlocked ? 'unlocked' : ''} ${badge.id === currentBadgeId ? 'selected' : ''}`;
        item.innerHTML = `<img src="${badge.image}" class="badge-icon-img"><span class="badge-name">${badge.label}</span><span class="badge-desc" style="${isUnlocked ? 'display:block' : ''}">${isUnlocked ? badge.desc : 'Bloqueado'}</span>`;
        if (isUnlocked) { item.onclick = () => { document.querySelectorAll('.badge-item').forEach(b => b.classList.remove('selected')); item.classList.add('selected'); document.getElementById('editProfileModal').dataset.tempBadge = badge.id; }; }
        container.appendChild(item);
    });
}

async function searchFavorites(q) {
    const r = document.getElementById("favoritesSearchResults"); if(q.length<3){r.classList.add("hidden");return;} r.classList.remove("hidden");
    try { const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=5`); const d = await res.json(); r.innerHTML = ""; d.data.forEach(a => { const i = document.createElement("div"); i.className = "search-preview-item"; i.innerHTML = `<img src="${a.images.jpg.image_url}" class="search-preview-image"><div><h4>${a.title}</h4></div>`; i.onclick = () => addFavorite({id:a.mal_id, title:a.title, imageUrl:a.images.jpg.image_url}); r.appendChild(i); }); } catch(e){}
}
function addFavorite(a) { if(selectedFavorites.length>=3) return alert("Max 3!"); if(!selectedFavorites.find(f=>f.id===a.id)){selectedFavorites.push(a);renderSelectedFavoritesPreview();} }
window.removeFavorite = function(id) { selectedFavorites = selectedFavorites.filter(f=>f.id!==id); renderSelectedFavoritesPreview(); }
function renderSelectedFavoritesPreview() {
    const container = document.getElementById("selectedFavorites"); container.innerHTML = "";
    if (selectedFavorites.length === 0) { container.innerHTML = `<p style="grid-column:1/-1;text-align:center;">Vazio.</p>`; return; }
    selectedFavorites.forEach(anime => { const div = document.createElement('div'); div.className = "anime-item-wrapper"; div.innerHTML = `<button onclick="window.removeFavorite(${anime.id})" title="Remover">✕</button><img src="${anime.imageUrl}" class="anime-image-display" alt="${anime.title}"><h5>${anime.title}</h5>`; container.appendChild(div); });
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    applyTheme(localStorage.getItem('animeSiteTheme') || 'dark');
    initModalListeners(); 
    window.addEventListener('libraryUpdated', () => renderLibraryAndStats());

    const sidebar = document.getElementById('sidebar'); const toggle = document.getElementById('toggleSidebarBtn'); if(toggle) toggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    
    // Auth & Loader
    onAuthStateChanged(auth, async (u) => {
        if(u) { 
            currentUser = u;
            const loader = document.getElementById('profileLoader');
            const content = document.getElementById('profileContent');
            if(loader) loader.classList.remove('hidden');

            // CORREÇÃO: Removemos renderFavorites() daqui pois agora ele é chamado DENTRO de renderProfileHeader
            await Promise.all([
                renderProfileHeader(), 
                renderLibraryAndStats()
            ]);
            
            if(loader) { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 500); }
            if(content) { content.style.opacity = '1'; }
        }
        else window.location.href="index.html";
    });

    // Abas e Menu
    const tabEditInfo = document.getElementById('tabEditInfo'); const tabEditBadges = document.getElementById('tabEditBadges');
    if(tabEditInfo && tabEditBadges) {
        tabEditInfo.onclick = () => { tabEditInfo.classList.add('active'); tabEditBadges.classList.remove('active'); document.getElementById('editInfoContent').classList.remove('hidden'); document.getElementById('editBadgesContent').classList.add('hidden'); };
        tabEditBadges.onclick = () => { tabEditBadges.classList.add('active'); tabEditInfo.classList.remove('active'); document.getElementById('editBadgesContent').classList.remove('hidden'); document.getElementById('editInfoContent').classList.add('hidden'); renderBadgesGrid(); };
    }

    // Modal Editar
    const editModal = document.getElementById("editProfileModal");
    if(document.getElementById("editProfileBtn")) document.getElementById("editProfileBtn").addEventListener("click", async () => { 
        if(!editModal) return;
        const d = await getUserData(currentUser.uid);
        if(d) { 
            if(document.getElementById('profileNameInput')) document.getElementById('profileNameInput').value = d.username || ''; 
            if(document.getElementById('profileBioInput')) document.getElementById('profileBioInput').value = d.bio || ''; 
        }
        if(tabEditInfo) tabEditInfo.click();
        editModal.classList.remove("hidden"); 
    });
    if(document.getElementById("closeEditProfileModal")) document.getElementById("closeEditProfileModal").addEventListener("click", () => editModal.classList.add("hidden"));
    if(document.getElementById("saveProfileBtn")) document.getElementById("saveProfileBtn").addEventListener("click", saveProfile);

    // Modal Favoritos
    document.getElementById("chooseFavoritesBtn")?.addEventListener("click",()=>{renderSelectedFavoritesPreview();document.getElementById("favoritesModal").classList.remove("hidden");});
    document.getElementById("closeFavoritesModal")?.addEventListener("click",()=>document.getElementById("favoritesModal").classList.add("hidden"));
    document.getElementById("saveFavoritesBtn")?.addEventListener("click",async()=>{
        const btn = document.getElementById("saveFavoritesBtn");
        btn.textContent = "Salvando...";
        await saveUserData({favorites:selectedFavorites});
        btn.textContent = "Salvar Favoritos";
        document.getElementById("favoritesModal").classList.add("hidden");
    });
    document.getElementById("favoritesSearchInput")?.addEventListener("input",(e)=>searchFavorites(e.target.value));

    // Configurações
    const settingsModal = document.getElementById('settingsModal'); 
    if(document.getElementById('settingsLink')) document.getElementById('settingsLink').addEventListener('click',(e)=>{e.preventDefault();settingsModal.classList.remove('hidden');});
    if(document.getElementById('closeSettingsModal')) document.getElementById('closeSettingsModal').addEventListener('click', ()=>settingsModal.classList.add('hidden'));
    if(document.getElementById('saveSettings')) document.getElementById('saveSettings').addEventListener('click', ()=>{ 
        const select = document.getElementById('themeSwitcher');
        if(select) {
            const newTheme = select.value;
            applyTheme(newTheme);
            localStorage.setItem('animeSiteTheme', newTheme);
        }
        settingsModal.classList.add('hidden'); 
    });
    
    // Tabs e Menu Mobile
    document.querySelectorAll('.library-tab').forEach(t=>{ t.addEventListener('click',()=>{ document.querySelectorAll('.library-tab').forEach(x=>x.classList.remove('active')); t.classList.add('active'); filterAndRenderLibrary(t.dataset.status); }); });
    const mobileMenuBtn = document.getElementById('mobileMenuButton'); const mobileSidebar = document.getElementById('mobileSidebar'); const overlay = document.getElementById('mobileSidebarOverlay'); const closeMenu = document.getElementById('closeMobileSidebar');
    const toggleMenu = () => { if(overlay) overlay.classList.toggle('hidden'); if(mobileSidebar) setTimeout(() => mobileSidebar.classList.toggle('open'), 10); };
    if(mobileMenuBtn) mobileMenuBtn.onclick = toggleMenu; if(closeMenu) closeMenu.onclick = toggleMenu; if(overlay) overlay.onclick = (e) => { if(e.target === overlay) toggleMenu(); };
    
    document.querySelectorAll('.sidebar-logout a, .logout-link').forEach(b => b.addEventListener('click', async(e)=>{e.preventDefault(); await signOut(auth); window.location.href="index.html";}));
});