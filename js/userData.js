const STORAGE_KEY = 'userAnimeData';

function getUserData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        return JSON.parse(data);
    }
    return {
        lists: {
            "A Assistir": [],
            "Assistidos": [],
            "Favoritos": [],
            "Desistiu": []
        },
        ratings: {}
    };
}
function saveUserData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function addToList(listName, animeId) {
    const data = getUserData();
    if (!data.lists[listName].includes(animeId)) {
        data.lists[listName].push(animeId);
        saveUserData(data);
    }
}
function removeFromList(listName, animeId) {
    const data = getUserData();
    data.lists[listName] = data.lists[listName].filter(id => id !== animeId);
    saveUserData(data);
}  

function rateAnime(animeId, rating) {
    const data = getUserData();
    data.ratings[animeId] = rating;
    saveUserData(data);
}

function getAnimeRating(animeId) {
    const data = getUserData();
    return data.ratings[animeId] || null;
}

function renderRating(animeId, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const currentRating = getAnimeRating(animeId) || 0;
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.textContent = '★';
        star.style.cursor = 'pointer';
        star.style.color = i <= currentRating ? 'gold' : 'gray';
        star.onclick = function() {
            rateAnime(animeId, i);
            renderRating(animeId, containerId);
        };
        container.appendChild(star);
    }
}
function renderUserLists(animeId, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const lists = Object.keys(getUserData().lists);
    lists.forEach(list => {
        const button = document.createElement('button');
        button.textContent = list;
        button.onclick = function() {
            addToList(animeId, list);
        };
        container.appendChild(button);
    });
}