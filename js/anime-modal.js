// js/anime-modal.js
import { auth, db } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentModalAnime = null;

// Helper de duração (necessário para o cálculo de horas)
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

// Função Principal: Abrir Modal
export async function openAnimeDetailsModal(anime) {
    const modal = document.getElementById('animeDetailsModal');
    if (!modal) return;
    
    currentModalAnime = anime;

    // Preencher UI básica
    document.getElementById('animeDetailsModalTitle').textContent = anime.title;
    document.getElementById('animeDetailsModalImage').src = anime.imageUrl;
    const synopsisText = anime.fullSynopsis || anime.miniSynopsis || "Sinopse não disponível.";
    document.getElementById('animeSynopsisArea').innerHTML = `<p>${synopsisText}</p>`;
    document.getElementById('animeDetailsModalScore').textContent = anime.score;
    document.getElementById('animeDetailsModalRank').textContent = anime.rank;
    document.getElementById('animeDetailsModalSeason').textContent = anime.season;
    document.getElementById('animeDetailsModalGenres').textContent = anime.genres;
    document.getElementById('animeDetailsModalUsers').textContent = anime.users || 'N/A';

    modal.classList.remove('hidden');

    // Setup de Inputs e Lógica de Usuário
    await setupUserInputs(anime);
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

    // Configurar Inputs
    const totalEpisodes = anime.episodes || 0;
    totalDisplay.textContent = totalEpisodes || "?";
    episodesInput.max = totalEpisodes || 9999;

    // Automação de Status (Sua ideia genial)
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

    // Buscar dados existentes do Firestore
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
        console.error("Erro ao carregar dados do usuário:", e);
    }
}

// Inicializar Listeners (Deve ser chamado no DOMContentLoaded de ambas as páginas)
export function initModalListeners() {
    const modal = document.getElementById('animeDetailsModal');
    const closeBtn = document.getElementById('closeAnimeDetailsModal');
    const saveBtn = document.getElementById('saveToLibraryBtn');

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (saveBtn) {
        // Remover listeners antigos para evitar duplicação (hack simples)
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        
        newBtn.addEventListener('click', async () => {
            if (!auth.currentUser || !currentModalAnime) return;

            const status = document.getElementById('animeStatusSelect').value;
            const watched = parseInt(document.getElementById('episodesInput').value) || 0;
            const scoreVal = document.getElementById('animeScoreInput').value;
            
            newBtn.textContent = "Salvando...";
            newBtn.disabled = true;

            try {
                // Parse da duração aqui, caso não tenha vindo da API corretamente
                const durationVal = typeof currentModalAnime.durationParsed === 'number' 
                    ? currentModalAnime.durationParsed 
                    : parseDuration(currentModalAnime.duration || "24 min");

                const libraryItem = {
                    id: currentModalAnime.id,
                    title: currentModalAnime.title,
                    imageUrl: currentModalAnime.imageUrl,
                    total_episodes: currentModalAnime.episodes || 0,
                    duration_minutes: durationVal,
                    status: status,
                    watched_episodes: watched,
                    personal_score: scoreVal ? parseFloat(scoreVal) : null,
                    last_updated: new Date()
                };

                await setDoc(doc(db, "users", auth.currentUser.uid, "library", currentModalAnime.id.toString()), libraryItem);
                
                newBtn.textContent = "Salvo!";
                
                // Dispara um evento customizado para avisar a página (Profile precisa saber para atualizar a lista)
                window.dispatchEvent(new Event('libraryUpdated'));

            } catch (e) {
                console.error(e);
                newBtn.textContent = "Erro :(";
            }

            setTimeout(() => {
                newBtn.textContent = "Salvar";
                newBtn.disabled = false;
            }, 2000);
        });
    }
}