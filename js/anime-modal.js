import { auth, db } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentModalAnime = null;

// Função robusta para extrair minutos da string da API (ex: "24 min per ep", "1 hr 30 min")
function parseDuration(durationString) {
    if (!durationString || typeof durationString !== 'string') return 24; // Default fallback
    
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

    // Tags/Generos
    const genresContainer = document.getElementById('animeDetailsModalGenres');
    genresContainer.innerHTML = ''; 
    if (anime.genres) {
        // Se já vier formatado ou se for array
        const genresList = typeof anime.genres === 'string' ? anime.genres.split(', ') : anime.genres;
        genresList.forEach(genre => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = typeof genre === 'object' ? genre.name : genre;
            genresContainer.appendChild(span);
        });
    }

    // Sinopse e Trailer
    const tabSynopsis = document.getElementById('tabSynopsis');
    const tabTrailer = document.getElementById('tabTrailer');
    const contentSynopsis = document.getElementById('animeSynopsisArea');
    const contentTrailer = document.getElementById('animeTrailerArea');

    // Reset abas
    tabSynopsis.classList.add('active');
    tabTrailer.classList.remove('active');
    contentSynopsis.classList.remove('hidden'); contentSynopsis.classList.add('active');
    contentTrailer.classList.add('hidden'); contentTrailer.classList.remove('active');
    contentTrailer.innerHTML = ""; 

    const synopsisText = anime.fullSynopsis || anime.synopsis || anime.miniSynopsis || "Sinopse indisponível.";
    contentSynopsis.innerHTML = `<p>${synopsisText}</p>`;

    // Lógica das abas
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
            contentTrailer.innerHTML = ""; // Limpa iframe para parar som
        };
    } else {
        tabTrailer.style.display = 'none';
    }
}

export async function openAnimeDetailsModal(anime) {
    const modal = document.getElementById('animeDetailsModal');
    if (!modal) return;
    
    currentModalAnime = anime;
    populateModalUI(anime);
    modal.classList.remove('hidden');

    // Fetch de dados detalhados se necessário (API Jikan)
    if (!anime.fullSynopsis || !anime.durationParsed) {
        try {
            const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.id}`);
            if(res.ok){
                const json = await res.json();
                const freshData = json.data;

                // Atualiza objeto local com dados frescos da API
                currentModalAnime = {
                    ...currentModalAnime,
                    fullSynopsis: freshData.synopsis,
                    trailerUrl: freshData.trailer?.embed_url,
                    rank: freshData.rank,
                    score: freshData.score,
                    episodes: freshData.episodes,
                    duration: freshData.duration,
                    durationParsed: parseDuration(freshData.duration) // Importante para o cálculo de horas
                };
                
                // Reaplica na UI
                populateModalUI(currentModalAnime);
                
                // Atualiza display de total de episódios
                const totalDisplay = document.getElementById('episodesTotalDisplay');
                if(totalDisplay) totalDisplay.textContent = currentModalAnime.episodes || "?";
            }
        } catch (e) {
            console.warn("Não foi possível buscar detalhes extras:", e);
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

    // Configuração Inicial dos Inputs
    const totalEpisodes = anime.episodes || 0;
    totalDisplay.textContent = totalEpisodes || "?";
    episodesInput.max = totalEpisodes || 9999;

    // Reseta valores visuais antes de carregar do banco
    statusSelect.value = "plan_to_watch";
    episodesInput.value = 0;
    if(scoreInput) scoreInput.value = "";

    // Automação: Se mudar status para completed, preenche tudo
    statusSelect.onchange = () => {
        if (statusSelect.value === 'completed' && totalEpisodes > 0) {
            episodesInput.value = totalEpisodes;
        }
    };

    // Automação: Se preencher todos eps, muda status para completed
    episodesInput.oninput = () => {
        const val = parseInt(episodesInput.value) || 0;
        if (totalEpisodes > 0 && val >= totalEpisodes) {
            statusSelect.value = 'completed';
        }
    };

    // Carrega dados do Firestore (se existirem)
    try {
        const docRef = doc(db, "users", user.uid, "library", anime.id.toString());
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            statusSelect.value = data.status || "plan_to_watch";
            episodesInput.value = data.watched_episodes || 0;
            if(scoreInput) scoreInput.value = data.personal_score || "";
        }
    } catch (e) {
        console.error("Erro ao carregar dados do usuário:", e);
    }
}

export function initModalListeners() {
    const modal = document.getElementById('animeDetailsModal');
    const closeBtn = document.getElementById('closeAnimeDetailsModal');
    const saveBtn = document.getElementById('saveToLibraryBtn');

    if (closeBtn) closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        document.getElementById('animeTrailerArea').innerHTML = ""; // Para video
    });

if (saveBtn) {
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        
        newBtn.addEventListener('click', async () => {
            if (!auth.currentUser || !currentModalAnime) return;

            const status = document.getElementById('animeStatusSelect').value;
            const watched = parseInt(document.getElementById('episodesInput').value) || 0;
            
            // --- CORREÇÃO AQUI: Validação da Nota ---
            let scoreVal = parseFloat(document.getElementById('animeScoreInput').value);
            
            // Se o usuário digitou, aplicamos os limites
            if (!isNaN(scoreVal)) {
                if (scoreVal < 0) scoreVal = 0;
                if (scoreVal > 10) scoreVal = 10;
            } else {
                scoreVal = null; // Se estiver vazio, salva como null
            }
            // ----------------------------------------
            
            newBtn.textContent = "Salvando..."; 
            newBtn.disabled = true;

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
                    personal_score: scoreVal, // Usa a nota validada
                    last_updated: new Date()
                };

                await setDoc(doc(db, "users", auth.currentUser.uid, "library", currentModalAnime.id.toString()), libraryItem);
                
                newBtn.textContent = "Salvo com Sucesso!";
                window.dispatchEvent(new Event('libraryUpdated')); 
            } catch (e) { 
                console.error(e); 
                newBtn.textContent = "Erro ao Salvar"; 
            }

            setTimeout(() => { newBtn.textContent = "Salvar Alterações"; newBtn.disabled = false; }, 2000);
        });
    }
}