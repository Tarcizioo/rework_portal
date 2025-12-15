import { auth, db } from "./firebase-config.js";
// ADICIONADO: deleteDoc na importação
import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentModalAnime = null;

const toggleBodyScroll = (lock) => {
    document.body.style.overflow = lock ? 'hidden' : '';
};

function parseDuration(durationString) {
    if (!durationString || typeof durationString !== 'string') return 24;
    const numbers = durationString.match(/\d+/g);
    if (!numbers) return 24;

    let minutes = 0;
    if (durationString.toLowerCase().includes("hr")) {
        minutes += parseInt(numbers[0]) * 60;
        if (numbers[1]) minutes += parseInt(numbers[1]);
    } else {
        minutes = parseInt(numbers[0]);
    }
    return minutes || 24;
}

function populateModalUI(anime) {
    document.getElementById('animeDetailsModalTitle').textContent = anime.title;
    document.getElementById('animeDetailsModalImage').src = anime.imageUrl;
    
    document.getElementById('animeDetailsModalScore').textContent = anime.score || '-';
    document.getElementById('animeDetailsModalRank').textContent = anime.rank ? `#${anime.rank}` : '-';
    document.getElementById('animeDetailsModalSeason').textContent = anime.season || '-';
    document.getElementById('animeDetailsModalUsers').textContent = anime.users || '-';

    const genresContainer = document.getElementById('animeDetailsModalGenres');
    genresContainer.innerHTML = ''; 
    if (anime.genres) {
        const genresList = typeof anime.genres === 'string' ? anime.genres.split(', ') : anime.genres;
        genresList.forEach(genre => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = typeof genre === 'object' ? genre.name : genre;
            genresContainer.appendChild(span);
        });
    }

    const tabSynopsis = document.getElementById('tabSynopsis');
    const tabTrailer = document.getElementById('tabTrailer');
    const contentSynopsis = document.getElementById('animeSynopsisArea');
    const contentTrailer = document.getElementById('animeTrailerArea');

    tabSynopsis.classList.add('active');
    tabTrailer.classList.remove('active');
    contentSynopsis.classList.remove('hidden'); contentSynopsis.classList.add('active');
    contentTrailer.classList.add('hidden'); contentTrailer.classList.remove('active');
    contentTrailer.innerHTML = ""; 

    const synopsisText = anime.fullSynopsis || anime.synopsis || anime.miniSynopsis || "Sinopse indisponível.";
    contentSynopsis.innerHTML = `<p>${synopsisText}</p>`;

    if (anime.trailerUrl) {
        tabTrailer.style.display = 'inline-block';
        tabTrailer.onclick = () => {
            tabSynopsis.classList.remove('active'); tabTrailer.classList.add('active');
            contentSynopsis.classList.add('hidden'); contentTrailer.classList.remove('hidden');
            contentTrailer.innerHTML = `<iframe src="${anime.trailerUrl}?autoplay=0" allowfullscreen></iframe>`;
        };
        tabSynopsis.onclick = () => {
            tabTrailer.classList.remove('active'); tabSynopsis.classList.add('active');
            contentTrailer.classList.add('hidden'); contentSynopsis.classList.remove('hidden');
            contentTrailer.innerHTML = "";
        };
    } else {
        tabTrailer.style.display = 'none';
    }
}

export async function openAnimeDetailsModal(anime) {
    const modal = document.getElementById('animeDetailsModal');
    if (!modal) return;
    
    toggleBodyScroll(true);
    currentModalAnime = anime;
    populateModalUI(anime);
    modal.classList.remove('hidden');

    if (!anime.fullSynopsis || !anime.durationParsed) {
        try {
            const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.id}`);
            if(res.ok){
                const json = await res.json();
                const freshData = json.data;
                currentModalAnime = {
                    ...currentModalAnime,
                    fullSynopsis: freshData.synopsis,
                    trailerUrl: freshData.trailer?.embed_url,
                    rank: freshData.rank,
                    score: freshData.score,
                    episodes: freshData.episodes,
                    duration: freshData.duration,
                    durationParsed: parseDuration(freshData.duration)
                };
                populateModalUI(currentModalAnime);
                const totalDisplay = document.getElementById('episodesTotalDisplay');
                if(totalDisplay) totalDisplay.textContent = currentModalAnime.episodes || "?";
            }
        } catch (e) { console.warn("Erro update details:", e); }
    }
    
    await setupUserInputs(currentModalAnime);
}

async function setupUserInputs(anime) {
    const actionsDiv = document.getElementById('userAnimeActions');
    const loginWarning = document.getElementById('loginWarning');
    const statusSelect = document.getElementById('animeStatusSelect');
    const episodesInput = document.getElementById('episodesInput');
    const totalDisplay = document.getElementById('episodesTotalDisplay');
    const scoreInput = document.getElementById('animeScoreInput');
    
    let deleteBtn = document.getElementById('deleteFromLibraryBtn');
    
    const user = auth.currentUser;

    if (!user) {
        actionsDiv.classList.add('hidden');
        loginWarning.classList.remove('hidden');
        if(deleteBtn) deleteBtn.classList.add('hidden'); // Esconde delete se não logado
        return;
    }

    actionsDiv.classList.remove('hidden');
    loginWarning.classList.add('hidden');

    const totalEpisodes = anime.episodes || 0;
    totalDisplay.textContent = totalEpisodes || "?";
    episodesInput.max = totalEpisodes || 9999;

    statusSelect.value = "plan_to_watch";
    episodesInput.value = 0;
    if(scoreInput) scoreInput.value = "";
    
    if(deleteBtn) deleteBtn.classList.add('hidden');

    statusSelect.onchange = () => {
        if (statusSelect.value === 'completed' && totalEpisodes > 0) episodesInput.value = totalEpisodes;
    };
    episodesInput.oninput = () => {
        const val = parseInt(episodesInput.value) || 0;
        if (totalEpisodes > 0 && val >= totalEpisodes) statusSelect.value = 'completed';
    };

    try {
        const docRef = doc(db, "users", user.uid, "library", anime.id.toString());
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            statusSelect.value = data.status || "plan_to_watch";
            episodesInput.value = data.watched_episodes || 0;
            if(scoreInput) scoreInput.value = data.personal_score || "";
            
            // --- MOSTRAR BOTÃO DE DELETAR ---
            if(deleteBtn) deleteBtn.classList.remove('hidden');
        }
    } catch (e) { console.error(e); }
}

export function initModalListeners() {
    const modal = document.getElementById('animeDetailsModal');
    const closeBtn = document.getElementById('closeAnimeDetailsModal');
    const saveBtn = document.getElementById('saveToLibraryBtn');
    const actionsContainer = document.getElementById('userAnimeActions');

    // --- CRIAÇÃO DINÂMICA DO BOTÃO DE REMOVER ---
    // Verifica se já existe, se não, cria e adiciona
    if (actionsContainer && !document.getElementById('deleteFromLibraryBtn')) {
        const deleteBtn = document.createElement('button');
        deleteBtn.id = 'deleteFromLibraryBtn';
        deleteBtn.className = 'button button-danger hidden'; // Começa escondido
        deleteBtn.textContent = 'Remover da Biblioteca';
        actionsContainer.appendChild(deleteBtn);

        // Lógica de Exclusão
        deleteBtn.addEventListener('click', async () => {
            if (!auth.currentUser || !currentModalAnime) return;
            
            if (confirm(`Tem certeza que deseja remover "${currentModalAnime.title}" da sua biblioteca?`)) {
                deleteBtn.textContent = "Removendo...";
                deleteBtn.disabled = true;

                try {
                    await deleteDoc(doc(db, "users", auth.currentUser.uid, "library", currentModalAnime.id.toString()));
                    
                    // Feedback Visual
                    const toast = document.createElement('div');
                    toast.className = 'toast-notification show';
                    toast.innerHTML = `<i data-lucide="trash-2" style="color: #ef4444"></i> Removido!`;
                    document.body.appendChild(toast);
                    if(typeof lucide !== 'undefined') lucide.createIcons();
                    setTimeout(() => toast.remove(), 3000);

                    window.dispatchEvent(new Event('libraryUpdated')); // Atualiza o perfil
                    modal.classList.add('hidden'); // Fecha modal
                    toggleBodyScroll(false);

                } catch (e) {
                    console.error(e);
                    alert("Erro ao remover.");
                } finally {
                    deleteBtn.textContent = 'Remover da Biblioteca';
                    deleteBtn.disabled = false;
                }
            }
        });
    }

    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            toggleBodyScroll(false);
            document.getElementById('animeTrailerArea').innerHTML = ""; 
        });
    }

    if (saveBtn) {
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        
        newBtn.addEventListener('click', async () => {
            if (!auth.currentUser || !currentModalAnime) return;

            const status = document.getElementById('animeStatusSelect').value;
            const watched = parseInt(document.getElementById('episodesInput').value) || 0;
            
            let scoreVal = parseFloat(document.getElementById('animeScoreInput').value);
            if (!isNaN(scoreVal)) scoreVal = Math.min(Math.max(scoreVal, 0), 10);
            else scoreVal = null;
            
            newBtn.textContent = "Salvando..."; newBtn.disabled = true;

            try {
                let durationVal = currentModalAnime.durationParsed;
                if (!durationVal) durationVal = parseDuration(currentModalAnime.duration);

                const libraryItem = {
                    id: currentModalAnime.id,
                    title: currentModalAnime.title,
                    imageUrl: currentModalAnime.imageUrl,
                    total_episodes: currentModalAnime.episodes || 0,
                    duration_minutes: durationVal,
                    status: status,
                    watched_episodes: watched,
                    personal_score: scoreVal,
                    last_updated: new Date()
                };

                await setDoc(doc(db, "users", auth.currentUser.uid, "library", currentModalAnime.id.toString()), libraryItem);
                
                const toast = document.createElement('div');
                toast.className = 'toast-notification show';
                toast.innerHTML = `<i data-lucide="check-circle" style="color: var(--text-accent)"></i> Salvo!`;
                document.body.appendChild(toast);
                if(typeof lucide !== 'undefined') lucide.createIcons();
                setTimeout(() => toast.remove(), 3000);

                window.dispatchEvent(new Event('libraryUpdated')); 
                
                const deleteBtn = document.getElementById('deleteFromLibraryBtn');
                if(deleteBtn) deleteBtn.classList.remove('hidden');

            } catch (e) { console.error(e); }

            setTimeout(() => { newBtn.textContent = "Salvar Alterações"; newBtn.disabled = false; }, 2000);
        });
    }
}