import { auth, db } from "./firebase-config.js";
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { openAnimeDetailsModal, initModalListeners } from "./anime-modal.js";

let selectedFavorites = []; let fullLibrary = []; let currentUser = null;

function getBase64(file) { return new Promise((r, j) => { const rd = new FileReader(); rd.readAsDataURL(file); rd.onload = () => r(rd.result); rd.onerror = j; }); }
function formatTime(min) { if(!min) return "0h"; const d=Math.floor(min/1440), h=Math.floor((min%1440)/60), m=min%60; let p=[]; if(d>0)p.push(`${d}d`); if(h>0)p.push(`${h}h`); if(m>0&&d===0)p.push(`${m}m`); return p.join(' ') + " (" + min.toLocaleString() + " min)"; }
function applyTheme(t) { document.body.className = `${t}-theme`; const s = document.getElementById('themeSwitcher'); if(s) s.value = t; }

async function getUserData(uid) { const d = await getDoc(doc(db, "users", uid)); return d.exists() ? d.data() : null; }
async function getUserLibrary(uid) { const s = await getDocs(collection(db, "users", uid, "library")); return s.docs.map(d => d.data()); }
async function saveUserData(d) { if(!currentUser) return alert("Login!"); await setDoc(doc(db, "users", currentUser.uid), d, {merge:true}); renderProfileHeader(); renderFavorites(); }

async function renderProfileHeader() {
    const data = await getUserData(currentUser.uid);
    const n = document.getElementById("profileUsername"); if(n) n.textContent = (data && data.username) || currentUser.displayName || "Usuário";
    if (data) { if(data.avatar) document.querySelector(".profile-avatar").src = data.avatar; if(data.banner) document.querySelector(".banner-image").src = data.banner; selectedFavorites = data.favorites || []; }
}

async function renderLibraryAndStats() {
    fullLibrary = await getUserLibrary(currentUser.uid);
    let tm = 0, te = 0; fullLibrary.forEach(a => { const e = parseInt(a.watched_episodes)||0; te+=e; tm+=(e*(parseInt(a.duration_minutes)||24)); });
    const s = document.getElementById("profileStats"); if(s) { const ic = typeof lucide!=='undefined'; s.innerHTML = `${ic?'<i data-lucide="tv" style="width:1rem;vertical-align:middle"></i>':'📺'} ${te} eps <br>${ic?'<i data-lucide="clock" style="width:1rem;vertical-align:middle"></i>':'⏰'} ${formatTime(tm)}`; if(ic) lucide.createIcons(); }
    filterAndRenderLibrary(document.querySelector('.library-tab.active')?.dataset.status || 'all');
}

function filterAndRenderLibrary(status) {
    const c = document.getElementById("libraryContainer"); if(!c) return; c.innerHTML = "";
    let f = fullLibrary; if (status !== 'all') f = fullLibrary.filter(a => a.status === status);
    if (f.length === 0) { c.innerHTML = "<p style='color:var(--text-secondary);width:100%;text-align:center;'>Vazio.</p>"; return; }
    f.forEach(a => {
        const d = document.createElement("div"); d.className = "anime-item-wrapper"; d.addEventListener('click', () => openAnimeDetailsModal(a));
        const sc = a.personal_score ? `<div style="position:absolute;bottom:5px;left:5px;background:rgba(0,0,0,0.8);color:#FFD700;padding:2px 6px;border-radius:4px;font-size:0.7rem;font-weight:bold;">★ ${a.personal_score}</div>` : '';
        d.innerHTML = `<div style="position:relative;"><img src="${a.imageUrl}" class="anime-image-display"><span style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.8);color:white;padding:2px 6px;border-radius:4px;font-size:0.7rem;">${a.watched_episodes||0}/${a.total_episodes||'?'}</span>${sc}</div><h3 class="anime-title-display">${a.title}</h3>`;
        c.appendChild(d);
    });
}

function renderFavorites() {
    const c = document.getElementById("favoritesContainer"); if(!c) return; c.innerHTML = "";
    if (selectedFavorites.length > 0) selectedFavorites.forEach(a => { const d = document.createElement("div"); d.className = "anime-item-wrapper"; d.addEventListener('click', () => openAnimeDetailsModal(a)); d.innerHTML = `<img src="${a.imageUrl}" class="anime-image-display"><h3 class="anime-title-display">${a.title}</h3>`; c.appendChild(d); });
    else c.innerHTML = "<p>Sem favoritos.</p>";
}

// Event handlers
async function saveProfile() { const u = document.getElementById('profileNameInput').value; const a = document.getElementById('profileAvatarInput').files[0]; const b = document.getElementById('profileBannerInput').files[0]; let d = { username: u || currentUser.displayName }; if(a) d.avatar = await getBase64(a); if(b) d.banner = await getBase64(b); await saveUserData(d); document.getElementById('editProfileModal').classList.add('hidden'); }
async function searchFavorites(q) {
    const r = document.getElementById("favoritesSearchResults"); if(q.length<3){r.classList.add("hidden");return;} r.classList.remove("hidden");
    try { const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=5`); const d = await res.json(); r.innerHTML = ""; d.data.forEach(a => { const i = document.createElement("div"); i.className = "search-preview-item"; i.innerHTML = `<img src="${a.images.jpg.image_url}" class="search-preview-image"><div><h4>${a.title}</h4></div>`; i.onclick = () => addFavorite({id:a.mal_id, title:a.title, imageUrl:a.images.jpg.image_url}); r.appendChild(i); }); } catch(e){}
}
function addFavorite(a) { if(selectedFavorites.length>=3) return alert("Max 3!"); if(!selectedFavorites.find(f=>f.id===a.id)){selectedFavorites.push(a);renderSelectedFavoritesPreview();} }
window.removeFavorite = function(id) { selectedFavorites = selectedFavorites.filter(f=>f.id!==id); renderSelectedFavoritesPreview(); }
function renderSelectedFavoritesPreview() {
    const container = document.getElementById("selectedFavorites");
    container.innerHTML = "";
    
    // Se não tiver favoritos, mostra slots vazios para indicar que cabe 3
    if (selectedFavorites.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem; border: 2px dashed var(--border-color); border-radius: 0.75rem;">
                <p>Nenhum favorito selecionado.</p>
                <p style="font-size: 0.8rem;">Pesquise acima para adicionar (Máx. 3)</p>
            </div>
        `;
        return;
    }

    selectedFavorites.forEach(anime => {
        const div = document.createElement('div');
        div.className = "anime-item-wrapper";
        
        // Estrutura HTML limpa para o card do favorito
        div.innerHTML = `
            <button onclick="window.removeFavorite(${anime.id})" title="Remover">✕</button>
            <img src="${anime.imageUrl}" class="anime-image-display">
            <h5>${anime.title}</h5>
        `;
        container.appendChild(div);
    });
}
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    applyTheme(localStorage.getItem('animeSiteTheme') || 'dark');
    initModalListeners(); window.addEventListener('libraryUpdated', renderLibraryAndStats);

    const sidebar = document.getElementById('sidebar'); const toggle = document.getElementById('toggleSidebarBtn'); if(toggle) toggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    
    // Auth
    onAuthStateChanged(auth, async (u) => {
        if(u) { currentUser=u; await renderProfileHeader(); renderFavorites(); renderLibraryAndStats(); }
        else window.location.href="index.html";
    });

    // Settings
    const settingsModal=document.getElementById('settingsModal'); const closeSettings=document.getElementById('closeSettingsModal'); const saveSettings=document.getElementById('saveSettings'); const themeS=document.getElementById('themeSwitcher');
    if(document.getElementById('settingsLink')) document.getElementById('settingsLink').addEventListener('click',(e)=>{e.preventDefault();settingsModal.classList.remove('hidden');});
    if(closeSettings) { const nc = closeSettings.cloneNode(true); closeSettings.parentNode.replaceChild(nc, closeSettings); nc.addEventListener('click', ()=>settingsModal.classList.add('hidden')); }
    if(saveSettings) saveSettings.addEventListener('click', ()=>{ if(themeS){const t=themeS.value;document.body.className=`${t}-theme`;localStorage.setItem('animeSiteTheme',t);} settingsModal.classList.add('hidden'); });

    // Tabs
    const tabs=document.querySelectorAll('.library-tab'); tabs.forEach(t=>{ t.addEventListener('click',()=>{ tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active'); filterAndRenderLibrary(t.dataset.status); }); });

    // Modals
    document.getElementById("editProfileBtn")?.addEventListener("click",async()=>{ const d=await getUserData(currentUser.uid); if(d)document.getElementById('profileNameInput').value=d.username||''; document.getElementById("editProfileModal").classList.remove("hidden"); });
    document.getElementById("closeEditProfileModal")?.addEventListener("click",()=>document.getElementById("editProfileModal").classList.add("hidden"));
    document.getElementById("saveProfileBtn")?.addEventListener("click", saveProfile);
    document.getElementById("chooseFavoritesBtn")?.addEventListener("click",()=>{renderSelectedFavoritesPreview();document.getElementById("favoritesModal").classList.remove("hidden");});
    document.getElementById("closeFavoritesModal")?.addEventListener("click",()=>document.getElementById("favoritesModal").classList.add("hidden"));
    document.getElementById("saveFavoritesBtn")?.addEventListener("click",async()=>{await saveUserData({favorites:selectedFavorites});document.getElementById("favoritesModal").classList.add("hidden");});
    document.getElementById("favoritesSearchInput")?.addEventListener("input",(e)=>searchFavorites(e.target.value));
    
    // Logout
    document.querySelectorAll('.sidebar-logout a, .logout-link').forEach(b => b.addEventListener('click', async(e)=>{e.preventDefault(); await signOut(auth); window.location.href="index.html";}));
});