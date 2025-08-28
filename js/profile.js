// --- Utils ---
    function getBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
    }

    // --- Renderizar perfil ---
    function renderProfile() {
      const data = JSON.parse(localStorage.getItem("profileData"));
      if (!data) {
        document.getElementById("favoritesContainer").innerHTML = "<p>Você ainda não escolheu seus animes favoritos.</p>";
        return;
      };

      document.getElementById("profileUsername").textContent = data.username || "Usuário";
      if (data.avatar) document.querySelector(".profile-avatar").src = data.avatar;
      if (data.banner) document.querySelector(".banner-image").src = data.banner;

      const container = document.getElementById("favoritesContainer");
      container.innerHTML = "";
      if (data.favorites && data.favorites.length > 0) {
        data.favorites.forEach(anime => {
          const card = document.createElement("div");
          card.className = "anime-item-wrapper";
          card.innerHTML = `
            <img src="${anime.imageUrl}" alt="${anime.title}" class="anime-image-display" onerror="this.src='https://placehold.co/150x225?text=Img'">
            <h3 class="anime-title-display">${anime.title}</h3>
          `;
          container.appendChild(card);
        });
      } else {
          container.innerHTML = "<p>Você ainda não escolheu seus animes favoritos.</p>";
      }
    }

    // --- Salvar perfil ---
    async function saveProfile() {
      const username = document.getElementById('profileNameInput').value;
      const avatarFile = document.getElementById('profileAvatarInput').files[0];
      const bannerFile = document.getElementById('profileBannerInput').files[0];

      let stored = JSON.parse(localStorage.getItem("profileData")) || {};
      
      let profileData = {
          ...stored,
          username: username || stored.username || "Usuário",
      };

      if (avatarFile) profileData.avatar = await getBase64(avatarFile);
      if (bannerFile) profileData.banner = await getBase64(bannerFile);

      localStorage.setItem("profileData", JSON.stringify(profileData));
      renderProfile();
      document.getElementById('editProfileModal').classList.add('hidden');
    }

    // --- Favoritos ---
    let selectedFavorites = [];

    async function searchFavorites(query) {
      const favoritesSearchResults = document.getElementById("favoritesSearchResults");
      if (query.length < 3) {
        favoritesSearchResults.classList.add("hidden");
        return;
      }
      favoritesSearchResults.innerHTML = "<p style='padding:0.5rem;text-align:center;'>Buscando...</p>";
      favoritesSearchResults.classList.remove("hidden");

      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        favoritesSearchResults.innerHTML = "";

        data.data.forEach(anime => {
          const item = document.createElement("div");
          item.className = "search-preview-item";
          item.innerHTML = `
            <img src="${anime.images.jpg.image_url}" class="search-preview-image" onerror="this.src='https://placehold.co/50x70?text=X'">
            <div class="search-preview-info">
              <h4 class="search-preview-title">${anime.title}</h4>
            </div>
          `;
          item.addEventListener("click", () => addFavorite({
            id: anime.mal_id,
            title: anime.title,
            imageUrl: anime.images.jpg.image_url
          }));
          favoritesSearchResults.appendChild(item);
        });
      } catch (err) {
        favoritesSearchResults.innerHTML = "<p style='padding:0.5rem;text-align:center;'>Erro na busca</p>";
      }
    }

    function addFavorite(anime) {
      if (selectedFavorites.length >= 3) {
        const modal = document.getElementById('favoritesModal');
        const notification = document.createElement('div');
        notification.textContent = "Você só pode escolher no máximo 3 favoritos!";
        notification.style.cssText = 'background-color: #f44336; color: white; padding: 10px; border-radius: 5px; position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 100;';
        modal.prepend(notification);
        setTimeout(() => notification.remove(), 3000);
        return;
      }
      if (selectedFavorites.find(f => f.id === anime.id)) return;

      selectedFavorites.push(anime);
      renderSelectedFavorites();
    }

    function removeFavorite(id) {
      selectedFavorites = selectedFavorites.filter(f => f.id !== id);
      renderSelectedFavorites();
    }

    function renderSelectedFavorites() {
      const selectedFavoritesContainer = document.getElementById("selectedFavorites");
      selectedFavoritesContainer.innerHTML = "";
      if(selectedFavorites.length === 0) {
          selectedFavoritesContainer.innerHTML = "<p>Nenhum favorito selecionado.</p>";
          return;
      }
      selectedFavorites.forEach(anime => {
        const card = document.createElement("div");
        card.className = "anime-item-wrapper";
        card.innerHTML = `
          <img src="${anime.imageUrl}" alt="${anime.title}" class="anime-image-display" onerror="this.src='https://placehold.co/150x225?text=Img'">
          <h3 class="anime-title-display">${anime.title}</h3>
          <button onclick="removeFavorite(${anime.id})" class="button" style="margin-top:0.5rem; padding: 0.3rem 0.6rem; font-size: 0.8rem;">Remover</button>
        `;
        selectedFavoritesContainer.appendChild(card);
      });
    }

    function saveFavorites() {
      const data = JSON.parse(localStorage.getItem("profileData")) || {};
      data.favorites = selectedFavorites;
      localStorage.setItem("profileData", JSON.stringify(data));
      renderProfile();
      document.getElementById("favoritesModal").classList.add("hidden");
    }

    // --- Tema ---
    function applyTheme(theme) {
        document.body.className = `${theme}-theme`;
    }

    function saveTheme(theme) {
        localStorage.setItem('animeSiteTheme', theme);
        applyTheme(theme);
    }

    // --- Eventos ---
    document.addEventListener('DOMContentLoaded', () => {
      lucide.createIcons();

      // Aplicar tema salvo
      const themeSwitcher = document.getElementById('themeSwitcher');
      const savedTheme = localStorage.getItem('animeSiteTheme') || 'dark';
      applyTheme(savedTheme);
      if(themeSwitcher) themeSwitcher.value = savedTheme;

      // Sidebar Toggle
      const sidebar = document.getElementById('sidebar');
      const toggleBtn = document.getElementById('toggleSidebarBtn');
      if(toggleBtn) {
          toggleBtn.addEventListener('click', () => {
              sidebar.classList.toggle('collapsed');
          });
      }

      // Modais
      document.getElementById("editProfileBtn").addEventListener("click", () => {
        const data = JSON.parse(localStorage.getItem("profileData")) || {};
        document.getElementById('profileNameInput').value = data.username || '';
        document.getElementById("editProfileModal").classList.remove("hidden");
      });
      document.getElementById("closeEditProfileModal").addEventListener("click", () => {
        document.getElementById("editProfileModal").classList.add("hidden");
      });

      document.getElementById("chooseFavoritesBtn").addEventListener("click", () => {
        const stored = JSON.parse(localStorage.getItem("profileData")) || {};
        selectedFavorites = stored.favorites || [];
        renderSelectedFavorites();
        document.getElementById("favoritesModal").classList.remove("hidden");
      });
      document.getElementById("closeFavoritesModal").addEventListener("click", () => {
        document.getElementById("favoritesModal").classList.add("hidden");
      });
      
      // Modal de Configurações
      const settingsModal = document.getElementById('settingsModal');
      const settingsLink = document.getElementById('settingsLink');
      const closeSettingsModalBtn = document.getElementById('closeSettingsModal');
      const saveSettingsBtn = document.getElementById('saveSettings');

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
              if(themeSwitcher) saveTheme(themeSwitcher.value);
              if(settingsModal) settingsModal.classList.add('hidden');
          });
      }

      // Salvar
      document.getElementById("saveProfileBtn").addEventListener("click", saveProfile);
      document.getElementById("saveFavoritesBtn").addEventListener("click", saveFavorites);

      // Busca favoritos
      const favoritesSearchInput = document.getElementById("favoritesSearchInput");
      favoritesSearchInput.addEventListener("input", e => searchFavorites(e.target.value));
      document.addEventListener('click', (e) => {
          const searchContainer = document.querySelector('.search-container');
          if (searchContainer && !searchContainer.contains(e.target)) {
            const results = document.getElementById('favoritesSearchResults');
            if(results) results.classList.add('hidden');
          }
      });
    


      // Render inicial
      renderProfile();
    });