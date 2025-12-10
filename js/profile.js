// js/profile.js
import { auth, db } from "./firebase-config.js";
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- Variáveis Globais ---
let selectedFavorites = [];
let fullLibrary = [];
let currentUser = null;

// --- Utils ---
function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function formatTime(totalMinutes) {
    if (!totalMinutes) return "0h assistidas";
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    
    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') + " (" + totalMinutes.toLocaleString() + " min)";
}

// --- Funções de UI (Tema, Sidebar) ---
function applyTheme(theme) {
    document.body.className = `${theme}-theme`;
    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) themeSwitcher.value = theme;
}

// --- Funções de Banco de Dados ---
async function getUserData(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
}

async function getUserLibrary(uid) {
    const libRef = collection(db, "users", uid, "library");
    const snapshot = await getDocs(libRef);
    return snapshot.docs.map(doc => doc.data());
}

async function saveUserData(data) {
    if (!currentUser) return alert("Faça login!");
    try {
        await setDoc(doc(db, "users", currentUser.uid), data, { merge: true });
        renderProfileHeader(); 
        renderFavorites();     
    } catch (e) {
        console.error("Erro ao salvar:", e);
    }
}

// --- Renderização ---
async function renderProfileHeader() {
    const data = await getUserData(currentUser.uid);
    const usernameDisplay = document.getElementById("profileUsername");
    
    if (usernameDisplay) usernameDisplay.textContent = (data && data.username) || currentUser.displayName || "Usuário";
    
    if (data) {
        if (data.avatar) document.querySelector(".profile-avatar").src = data.avatar;
        if (data.banner) document.querySelector(".banner-image").src = data.banner;
        selectedFavorites = data.favorites || [];
    }
}

async function renderLibraryAndStats() {
    fullLibrary = await getUserLibrary(currentUser.uid);
    
    let totalMinutes = 0;
    let totalEpisodes = 0;

    fullLibrary.forEach(anime => {
        const eps = parseInt(anime.watched_episodes) || 0;
        const dur = parseInt(anime.duration_minutes) || 24;
        totalEpisodes += eps;
        totalMinutes += (eps * dur);
    });

    const statsEl = document.getElementById("profileStats");
    if(statsEl) {
        statsEl.innerHTML = `
            <i data-lucide="tv" style="width:1rem; vertical-align:middle"></i> ${totalEpisodes} eps <br>
            <i data-lucide="clock" style="width:1rem; vertical-align:middle"></i> ${formatTime(totalMinutes)}
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    filterAndRenderLibrary('all');
}

function filterAndRenderLibrary(status) {
    const container = document.getElementById("libraryContainer");
    if(!container) return;
    
    container.innerHTML = "";

    let filtered = fullLibrary;
    if (status !== 'all') {
        filtered = fullLibrary.filter(anime => anime.status === status);
    }

    if (filtered.length === 0) {
        container.innerHTML = "<p style='color: var(--text-secondary); width: 100%; text-align: center; margin-top: 1rem;'>Nenhum anime nesta lista.</p>";
        return;
    }

    filtered.forEach(anime => {
        const card = document.createElement("div");
        card.className = "anime-item-wrapper";
        const progress = `${anime.watched_episodes || 0}/${anime.total_episodes || '?'}`;
        
        const scoreBadge = anime.personal_score 
            ? `<div style="position: absolute; bottom: 5px; left: 5px; background: rgba(0,0,0,0.8); color: #FFD700; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">★ ${anime.personal_score}</div>` 
            : '';

        card.innerHTML = `
            <div style="position: relative;">
                <img src="${anime.imageUrl}" alt="${anime.title}" class="anime-image-display" 
                     onerror="this.src='https://placehold.co/150x225?text=Img'" 
                     style="margin-bottom: 0.25rem;">
                <span style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">
                    ${progress}
                </span>
                ${scoreBadge}
            </div>
            <h3 class="anime-title-display">${anime.title}</h3>
        `;
        container.appendChild(card);
    });
}

function renderFavorites() {
    const container = document.getElementById("favoritesContainer");
    if(!container) return;
    
    container.innerHTML = "";
    if (selectedFavorites.length > 0) {
        selectedFavorites.forEach(anime => {
            const card = document.createElement("div");
            card.className = "anime-item-wrapper";
            card.innerHTML = `
                <img src="${anime.imageUrl}" alt="${anime.title}" class="anime-image-display">
                <h3 class="anime-title-display">${anime.title}</h3>
            `;
            container.appendChild(card);
        });
    } else {
        container.innerHTML = "<p>Sem favoritos selecionados.</p>";
    }
}

// --- Funções de Modal (Salvar Perfil/Favoritos) ---
async function saveProfile() {
  const username = document.getElementById('profileNameInput').value;
  const avatarFile = document.getElementById('profileAvatarInput').files[0];
  const bannerFile = document.getElementById('profileBannerInput').files[0];

  let profileData = { username: username || (currentUser ? currentUser.displayName : "Usuário") };
  if (avatarFile) profileData.avatar = await getBase64(avatarFile);
  if (bannerFile) profileData.banner = await getBase64(bannerFile);

  await saveUserData(profileData);
  document.getElementById('editProfileModal').classList.add('hidden');
}

async function searchFavorites(query) {
    const favoritesSearchResults = document.getElementById("favoritesSearchResults");
    if (query.length < 3) { favoritesSearchResults.classList.add("hidden"); return; }
    favoritesSearchResults.classList.remove("hidden");
    favoritesSearchResults.innerHTML = "<p style='padding:0.5rem;'>Buscando...</p>";
    
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        favoritesSearchResults.innerHTML = "";
        data.data.forEach(anime => {
            const item = document.createElement("div");
            item.className = "search-preview-item";
            item.innerHTML = `
                <img src="${anime.images.jpg.image_url}" class="search-preview-image">
                <div class="search-preview-info"><h4>${anime.title}</h4></div>`;
            item.onclick = () => addFavorite({ id: anime.mal_id, title: anime.title, imageUrl: anime.images.jpg.image_url });
            favoritesSearchResults.appendChild(item);
        });
    } catch(e) { console.error(e); }
}

function addFavorite(anime) {
    if (selectedFavorites.length >= 3) return alert("Máximo 3!");
    if (!selectedFavorites.find(f => f.id === anime.id)) {
        selectedFavorites.push(anime);
        renderSelectedFavoritesPreview();
    }
}

window.removeFavorite = function(id) {
    selectedFavorites = selectedFavorites.filter(f => f.id !== id);
    renderSelectedFavoritesPreview();
}

function renderSelectedFavoritesPreview() {
    const container = document.getElementById("selectedFavorites");
    container.innerHTML = "";
    selectedFavorites.forEach(anime => {
        const div = document.createElement('div');
        div.className = "anime-item-wrapper";
        div.innerHTML = `
            <img src="${anime.imageUrl}" class="anime-image-display" style="width: 100px;">
            <h5 style="font-size:0.8rem; margin: 0.5rem 0;">${anime.title}</h5>
            <button class="button" style="padding: 0.2rem 0.5rem; font-size: 0.7rem;">Remover</button>
        `;
        div.querySelector('button').onclick = () => window.removeFavorite(anime.id);
        container.appendChild(div);
    });
}

// --- Inicialização e Event Listeners (DOM Ready) ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // 1. Aplicar Tema salvo
    const savedTheme = localStorage.getItem('animeSiteTheme') || 'dark';
    applyTheme(savedTheme);

    // 2. Configurar Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    if(toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // 3. Configurar Logout
    const logoutBtns = document.querySelectorAll('.sidebar-logout a, .logout-link'); // Tenta pegar qualquer link de logout
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            await signOut(auth);
            window.location.href = "index.html";
        });
    });

    // 4. Configurar Modal de Configurações (Tema)
    const settingsModal = document.getElementById('settingsModal');
    const settingsLink = document.getElementById('settingsLink');
    const closeSettingsModalBtn = document.getElementById('closeSettingsModal');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const themeSwitcher = document.getElementById('themeSwitcher');

    if(settingsLink) {
        settingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            if(settingsModal) settingsModal.classList.remove('hidden');
        });
    }
    if(closeSettingsModalBtn) {
        closeSettingsModalBtn.addEventListener('click', () => {
            if(settingsModal) settingsModal.classList.add('hidden');
        });
    }
    if(saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            if(themeSwitcher) {
                const newTheme = themeSwitcher.value;
                localStorage.setItem('animeSiteTheme', newTheme);
                applyTheme(newTheme);
            }
            if(settingsModal) settingsModal.classList.add('hidden');
        });
    }

    // 5. Configurar Abas da Biblioteca
    const tabs = document.querySelectorAll('.library-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterAndRenderLibrary(tab.dataset.status);
        });
    });

    // 6. Monitorar Autenticação (Carregar dados)
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await renderProfileHeader();
            renderFavorites();
            renderLibraryAndStats();
        } else {
            // Se não estiver logado, volta para home
            window.location.href = "index.html";
        }
    });

    // 7. Eventos dos Modais de Edição e Favoritos
    document.getElementById("editProfileBtn")?.addEventListener("click", async () => {
        const data = await getUserData(currentUser.uid);
        if(data) document.getElementById('profileNameInput').value = data.username || '';
        document.getElementById("editProfileModal").classList.remove("hidden");
    });
    
    document.getElementById("closeEditProfileModal")?.addEventListener("click", () => document.getElementById("editProfileModal").classList.add("hidden"));
    document.getElementById("saveProfileBtn")?.addEventListener("click", saveProfile);
    
    document.getElementById("chooseFavoritesBtn")?.addEventListener("click", () => {
        renderSelectedFavoritesPreview();
        document.getElementById("favoritesModal").classList.remove("hidden");
    });
    document.getElementById("closeFavoritesModal")?.addEventListener("click", () => document.getElementById("favoritesModal").classList.add("hidden"));
    
    document.getElementById("saveFavoritesBtn")?.addEventListener("click", async () => {
        await saveUserData({ favorites: selectedFavorites });
        document.getElementById("favoritesModal").classList.add("hidden");
    });

    document.getElementById("favoritesSearchInput")?.addEventListener("input", (e) => searchFavorites(e.target.value));
});