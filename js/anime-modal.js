import { auth, db } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentModalAnime = null;

function parseDuration(durationString) {
    if(!durationString) return 24;
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

// Função auxiliar para preencher a UI
function populateModalUI(anime) {
    document.getElementById('animeDetailsModalTitle').textContent = anime.title;
    document.getElementById('animeDetailsModalImage').src = anime.imageUrl;
    
    document.getElementById('animeDetailsModalScore').textContent = anime.score || '-';
    document.getElementById('animeDetailsModalRank').textContent = anime.rank ? `#${anime.rank}` : '-';
    document.getElementById('animeDetailsModalSeason').textContent = anime.season || '-';
    document.getElementById('animeDetailsModalUsers').textContent = anime.users || '-';

    // Tags
    const genresContainer = document.getElementById('animeDetailsModalGenres');
    genresContainer.innerHTML = ''; 
    if (anime.genres && typeof anime.genres === 'string') {
        anime.genres.split(', ').forEach(genre => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = genre;
            genresContainer.appendChild(span);
        });
    } else {
        genresContainer.textContent = '-';
    }

    // Abas e Conteúdo
    const tabSynopsis = document.getElementById('tabSynopsis');
    const tabTrailer = document.getElementById('tabTrailer');
    const contentSynopsis = document.getElementById('animeSynopsisArea');
    const contentTrailer = document.getElementById('animeTrailerArea');

    // Reset visual
    tabSynopsis.classList.add('active');
    tabTrailer.classList.remove('active');
    contentSynopsis.classList.remove('hidden'); contentSynopsis.classList.add('active');
    contentTrailer.classList.add('hidden'); contentTrailer.classList.remove('active');
    contentTrailer.innerHTML = ""; 

    // Sinopse
    const synopsisText = anime.fullSynopsis || anime.miniSynopsis || anime.synopsis || "Carregando informações...";
    contentSynopsis.innerHTML = `<p>${synopsisText}</p>`;

    // Trailer
    if (anime.trailerUrl) {
        tabTrailer.style.display = 'inline-block';
        tabTrailer.onclick = () => {
            tabSynopsis.classList.remove('active'); tabTrailer.classList.add('active');
            contentSynopsis.classList.add('hidden'); contentTrailer.classList.remove('hidden'); contentTrailer.classList.add('active');
            contentTrailer.innerHTML = `<iframe src="${anime.trailerUrl}?autoplay=1&mute=0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
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
    
    currentModalAnime = anime;
    
    // 1. Exibe o que temos (pode ser incompleto no inicio)
    populateModalUI(anime);
    modal.classList.remove('hidden');

    // 2. AUTO-CORREÇÃO: Se faltar sinopse ou trailer, busca na API
    if (!anime.fullSynopsis && !anime.trailerUrl) {
        // Mostra feedback visual discreto
        document.getElementById('animeSynopsisArea').innerHTML = `<p style="opacity:0.6;">Atualizando dados do anime...</p>`;
        
        try {
            const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.id}`);
            const json = await res.json();
            const freshData = json.data;

            // Atualiza o objeto global com dados novos
            currentModalAnime = {
                ...currentModalAnime, // Mantém dados do user (progresso, nota)
                fullSynopsis: freshData.synopsis,
                miniSynopsis: freshData.synopsis ? freshData.synopsis.substring(0, 250) + '...' : '',
                trailerUrl: freshData.trailer?.embed_url,
                rank: freshData.rank,
                score: freshData.score,
                season: freshData.season ? `${freshData.season} ${freshData.year || ''}` : '',
                genres: freshData.genres.map(g => g.name).join(', '),
                duration: freshData.duration,
                episodes: freshData.episodes // Atualiza total de eps
            };

            // Reaplica na tela
            populateModalUI(currentModalAnime);
            
            // Opcional: Atualizar inputs se o total de episódios mudou
            const totalDisplay = document.getElementById('episodesTotalDisplay');
            if(totalDisplay) totalDisplay.textContent = currentModalAnime.episodes || "?";

        } catch (e) {
            console.error("Erro ao atualizar dados faltantes:", e);
            document.getElementById('animeSynopsisArea').innerHTML = `<p>Não foi possível carregar detalhes adicionais.</p>`;
        }
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
    
    const user = auth.currentUser;
    if (!user) {
        actionsDiv.classList.add('hidden');
        loginWarning.classList.remove('hidden');
        return;
    }

    actionsDiv.classList.remove('hidden');
    loginWarning.classList.add('hidden');

    const totalEpisodes = anime.episodes || 0;
    totalDisplay.textContent = totalEpisodes || "?";
    episodesInput.max = totalEpisodes || 9999;

    statusSelect.onchange = () => {
        if (statusSelect.value === 'completed' && totalEpisodes > 0) {
            episodesInput.value = totalEpisodes;
        } else if (statusSelect.value === 'plan_to_watch') {
             episodesInput.value = 0;
        }
    };

    episodesInput.oninput = () => {
        let val = parseInt(episodesInput.value) || 0;
        if (totalEpisodes > 0) {
            if (val >= totalEpisodes) {
                val = totalEpisodes;
                episodesInput.value = val;
                statusSelect.value = 'completed';
            } else if (statusSelect.value === 'completed' && val < totalEpisodes) {
                statusSelect.value = 'watching';
            }
        }
    };

    // Busca dados salvos (progresso, nota)
    try {
        const docRef = doc(db, "users", user.uid, "library", anime.id.toString());
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            statusSelect.value = data.status || "plan_to_watch";
            episodesInput.value = data.watched_episodes || 0;
            if(scoreInput) scoreInput.value = data.personal_score || "";
        } else {
            statusSelect.value = "plan_to_watch";
            episodesInput.value = 0;
            if(scoreInput) scoreInput.value = "";
        }
    } catch (e) {
        console.error("Erro dados user:", e);
    }
}

export function initModalListeners() {
    const modal = document.getElementById('animeDetailsModal');
    const closeBtn = document.getElementById('closeAnimeDetailsModal');
    const saveBtn = document.getElementById('saveToLibraryBtn');

    const closeModal = () => {
        modal.classList.add('hidden');
        const contentTrailer = document.getElementById('animeTrailerArea');
        if(contentTrailer) contentTrailer.innerHTML = "";
    };

    if (closeBtn && modal) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', closeModal);
    }

    if (saveBtn) {
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        
        newBtn.addEventListener('click', async () => {
            if (!auth.currentUser || !currentModalAnime) return;

            const status = document.getElementById('animeStatusSelect').value;
            const watched = parseInt(document.getElementById('episodesInput').value) || 0;
            const scoreVal = document.getElementById('animeScoreInput').value;
            
            newBtn.textContent = "Salvando..."; newBtn.disabled = true;

            try {
                // Parse seguro da duração
                const durationVal = typeof currentModalAnime.durationParsed === 'number' 
                    ? currentModalAnime.durationParsed 
                    : parseDuration(currentModalAnime.duration || "24 min");

                // Salva TUDO (incluindo os dados novos que acabamos de buscar na API)
                const libraryItem = {
                    id: currentModalAnime.id,
                    title: currentModalAnime.title,
                    imageUrl: currentModalAnime.imageUrl,
                    
                    miniSynopsis: currentModalAnime.miniSynopsis || "",
                    fullSynopsis: currentModalAnime.fullSynopsis || "",
                    genres: currentModalAnime.genres || "",
                    rank: currentModalAnime.rank || "",
                    score: currentModalAnime.score || "",
                    season: currentModalAnime.season || "",
                    trailerUrl: currentModalAnime.trailerUrl || null,
                    
                    total_episodes: currentModalAnime.episodes || 0,
                    duration_minutes: durationVal,
                    
                    status: status,
                    watched_episodes: watched,
                    personal_score: scoreVal ? parseFloat(scoreVal) : null,
                    last_updated: new Date()
                };

                await setDoc(doc(db, "users", auth.currentUser.uid, "library", currentModalAnime.id.toString()), libraryItem);
                
                newBtn.textContent = "Salvo!";
                window.dispatchEvent(new Event('libraryUpdated')); // Atualiza a tela de perfil
            } catch (e) { console.error(e); newBtn.textContent = "Erro :("; }

            setTimeout(() => { newBtn.textContent = "Salvar Alterações"; newBtn.disabled = false; }, 2000);
        });
    }
}