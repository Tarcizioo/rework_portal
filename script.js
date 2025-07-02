const popularAnimesCarouselEl = document.getElementById('popularAnimesCarousel');
        const mostRecentAnimesCarouselEl = document.getElementById('mostRecentAnimesCarousel');
        const settingsModal = document.getElementById('settingsModal');
        const settingsLink = document.getElementById('settingsLink');
        const settingsLinkMobile = document.getElementById('settingsLinkMobile');
        const closeSettingsModalBtn = document.getElementById('closeSettingsModal');
        const themeSwitcher = document.getElementById('themeSwitcher');
        const saveSettingsBtn = document.getElementById('saveSettings');
        const userGreeting = document.getElementById('userGreeting');
        const searchInput = document.getElementById('searchInput');
        const searchResultsPreview = document.getElementById('searchResultsPreview');
        const mobileMenuButton = document.getElementById('mobileMenuButton');
        const mobileSidebarOverlay = document.getElementById('mobileSidebarOverlay');
        const mobileSidebar = document.getElementById('mobileSidebar');
        const closeMobileSidebarBtn = document.getElementById('closeMobileSidebar');
        const animeDetailsModal = document.getElementById('animeDetailsModal');
        const animeDetailsModalTitle = document.getElementById('animeDetailsModalTitle');
        const animeDetailsModalImage = document.getElementById('animeDetailsModalImage');
        const closeAnimeDetailsModalBtn = document.getElementById('closeAnimeDetailsModal');
        const animeSynopsisArea = document.getElementById('animeSynopsisArea');

        // Guarda todos os animes carregados para a funcionalidade de busca
        window.allAnimes = [];

        // --- Funções Utilitárias ---

        function getThemeColor(variableName) {
            return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
        }

        function getDefaultImageOnError(event) {
            const bgColor = getThemeColor('--bg-tertiary').substring(1);
            const textColor = getThemeColor('--text-secondary').substring(1);
            event.target.src = `https://placehold.co/180x270/${bgColor}/${textColor}?text=Erro&font=Lexend`;
        }

        function getSearchPreviewImageOnError(event) {
            const bgColor = getThemeColor('--bg-tertiary').substring(1);
            const textColor = getThemeColor('--text-secondary').substring(1);
            event.target.src = `https://placehold.co/40x60/${bgColor}/${textColor}?text=X&font=Lexend`;
        }
        
        // --- Lógica de Modais ---

        function openAnimeDetailsModal(anime) {
            if (!animeDetailsModal) return;
            animeDetailsModalTitle.textContent = anime.title;
            animeDetailsModalImage.src = anime.imageUrl || `https://placehold.co/200x300/${getThemeColor('--bg-tertiary').substring(1)}/${getThemeColor('--text-secondary').substring(1)}?text=Sem+Imagem&font=Lexend`;
            animeDetailsModalImage.alt = `Imagem de ${anime.title}`;
            animeDetailsModalImage.onerror = getDefaultImageOnError;
            animeSynopsisArea.innerHTML = `<p>${anime.miniSynopsis}</p>`;
            animeDetailsModal.classList.remove('hidden');
        }

        function closeAnimeDetailsModal() {
            if (animeDetailsModal) animeDetailsModal.classList.add('hidden');
        }

        function openSettingsModal() {
            if (settingsModal) settingsModal.classList.remove('hidden');
        }

        function closeSettings() {
            if (settingsModal) settingsModal.classList.add('hidden');
        }

        // --- Lógica de Carrossel ---

        function createAnimeCard(anime) {
            const slideItem = document.createElement('div');
            slideItem.innerHTML = `
                <div class="anime-item-wrapper">
                    <img src="${anime.imageUrl || `https://placehold.co/180x270/${getThemeColor('--bg-tertiary').substring(1)}/${getThemeColor('--text-secondary').substring(1)}?text=A+Carregar&font=Lexend`}" alt="${anime.title}" class="anime-image-display" onerror="getDefaultImageOnError(event)">
                    <h3 class="anime-title-display" title="${anime.title}">${anime.title}</h3>
                </div>
            `;
            slideItem.querySelector('.anime-item-wrapper').addEventListener('click', () => {
                openAnimeDetailsModal(anime);
            });
            return slideItem;
        }

        function populateCarousel(carouselElement, animesToDisplay) {
            if (!carouselElement) return;
            if ($(carouselElement).hasClass('slick-initialized')) {
                $(carouselElement).slick('unslick');
            }
            carouselElement.innerHTML = '';
            animesToDisplay.forEach(anime => {
                const cardElement = createAnimeCard(anime);
                carouselElement.appendChild(cardElement);
            });
        }

        function initializeSlickCarousel(selector) {
            const slickOptions = {
                dots: true,
                infinite: true,
                speed: 300,
                slidesToShow: 5,
                slidesToScroll: 5,
                responsive: [
                    { breakpoint: 1380, settings: { slidesToShow: 4, slidesToScroll: 4 } },
                    { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 3 } },
                    { breakpoint: 768, settings: { slidesToShow: 2, slidesToScroll: 2, dots: false } },
                    { breakpoint: 480, settings: { slidesToShow: 2, slidesToScroll: 2, dots: false } }
                ]
            };
            if ($(selector).children().length > 0) {
                $(selector).slick(slickOptions);
            }
        }
        
        // --- Lógica de API e Dados ---

        async function fetchAndPopulateCarousels() {
            const JIKAN_API_BASE_URL = "https://api.jikan.moe/v4";
            showLoadingState(true);

            try {
                const popularPromise = fetch(`${JIKAN_API_BASE_URL}/top/anime?limit=15`);
                const recentPromise = fetch(`${JIKAN_API_BASE_URL}/seasons/now?limit=15`);

                const [popularResponse, recentResponse] = await Promise.all([popularPromise, recentPromise]);

                if (!popularResponse.ok || !recentResponse.ok) {
                    throw new Error("Falha ao buscar dados da API Jikan.");
                }

                const popularData = await popularResponse.json();
                const recentData = await recentResponse.json();

                const transformApiData = (apiAnime) => ({
                    id: apiAnime.mal_id,
                    title: apiAnime.title_english || apiAnime.title,
                    imageUrl: apiAnime.images?.jpg?.large_image_url,
                    miniSynopsis: (apiAnime.synopsis || "Sinopse não disponível.").substring(0, 250) + '...'
                });

                const popularAnimes = popularData.data.map(transformApiData);
                const recentAnimes = recentData.data.map(transformApiData);

                window.allAnimes = [...new Map([...popularAnimes, ...recentAnimes].map(item => [item['id'], item])).values()];

                populateCarousel(popularAnimesCarouselEl, popularAnimes);
                initializeSlickCarousel('#popularAnimesCarousel');

                populateCarousel(mostRecentAnimesCarouselEl, recentAnimes);
                initializeSlickCarousel('#mostRecentAnimesCarousel');

            } catch (error) {
                console.error("Erro ao popular carrosséis:", error);
                [popularAnimesCarouselEl, mostRecentAnimesCarouselEl].forEach(el => {
                    if(el) el.innerHTML = `<p>Ocorreu um erro ao carregar os animes. Tente novamente mais tarde.</p>`;
                });
            } finally {
                showLoadingState(false);
            }
        }

        function showLoadingState(isLoading) {
            const carousels = [popularAnimesCarouselEl, mostRecentAnimesCarouselEl];
            carousels.forEach(carousel => {
                if (!carousel) return;
                const loadingMessageEl = carousel.querySelector('.carousel-loading-message');
                if (isLoading) {
                    if (!loadingMessageEl) {
                        const p = document.createElement('p');
                        p.className = 'carousel-loading-message';
                        p.textContent = 'A carregar animes...';
                        carousel.innerHTML = '';
                        carousel.appendChild(p);
                    }
                } else {
                    if (loadingMessageEl) loadingMessageEl.remove();
                }
            });
        }
        
        // --- Lógica de Navegação e UI ---

        function applyTheme(theme) {
            document.body.className = theme + '-theme';
            localStorage.setItem('animeSiteTheme', theme);
            if (themeSwitcher) themeSwitcher.value = theme;
        }

        function createSearchResultItem(anime) {
            const item = document.createElement('div');
            item.className = 'search-preview-item';
            item.innerHTML = `
                <img src="${anime.imageUrl || ''}" alt="${anime.title}" class="search-preview-image" onerror="getSearchPreviewImageOnError(event)">
                <div class="search-preview-info">
                    <h4 class="search-preview-title">${anime.title}</h4>
                    <p class="search-preview-synopsis">${anime.miniSynopsis || ''}</p>
                </div>
            `;
            item.addEventListener('click', () => {
                openAnimeDetailsModal(anime);
                searchResultsPreview.classList.add('hidden');
                searchInput.value = '';
            });
            return item;
        }
        
        function openMobileNav() {
            if (mobileSidebarOverlay && mobileSidebar) {
                mobileSidebarOverlay.classList.remove('hidden');
                setTimeout(() => mobileSidebar.classList.add('open'), 10);
            }
        }

        function closeMobileNav() {
            if (mobileSidebarOverlay && mobileSidebar) {
                mobileSidebar.classList.remove('open');
                setTimeout(() => mobileSidebarOverlay.classList.add('hidden'), 300);
            }
        }
        
        // --- Event Listeners ---

        if (closeAnimeDetailsModalBtn) closeAnimeDetailsModalBtn.addEventListener('click', closeAnimeDetailsModal);
        if (settingsLink) settingsLink.addEventListener('click', (e) => { e.preventDefault(); openSettingsModal(); });
        if (settingsLinkMobile) settingsLinkMobile.addEventListener('click', (e) => {
            e.preventDefault();
            closeMobileNav();
            openSettingsModal();
        });
        if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', closeSettings);
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                if (themeSwitcher) applyTheme(themeSwitcher.value);
                closeSettings();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                const searchTerm = event.target.value.toLowerCase().trim();
                searchResultsPreview.innerHTML = '';

                if (searchTerm.length > 1) {
                    const filteredAnimes = (window.allAnimes || []).filter(anime =>
                        anime.title.toLowerCase().includes(searchTerm)
                    );

                    if (filteredAnimes.length > 0) {
                        filteredAnimes.slice(0, 5).forEach(anime => {
                            searchResultsPreview.appendChild(createSearchResultItem(anime));
                        });
                        searchResultsPreview.classList.remove('hidden');
                    } else {
                        searchResultsPreview.classList.add('hidden');
                    }
                } else {
                    searchResultsPreview.classList.add('hidden');
                }
            });

            document.addEventListener('click', (event) => {
                if (!searchInput.parentElement.contains(event.target)) {
                    searchResultsPreview.classList.add('hidden');
                }
            });
        }
        
        if (mobileMenuButton) mobileMenuButton.addEventListener('click', openMobileNav);
        if (closeMobileSidebarBtn) closeMobileSidebarBtn.addEventListener('click', closeMobileNav);
        if (mobileSidebarOverlay) {
            mobileSidebarOverlay.addEventListener('click', (event) => {
                if (event.target === mobileSidebarOverlay) closeMobileNav();
            });
        }
        
        // --- Inicialização ---
        
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            } else {
                console.error("Biblioteca Lucide não carregada.");
            }
            
            const currentTheme = localStorage.getItem('animeSiteTheme') || 'dark';
            applyTheme(currentTheme);

            fetchAndPopulateCarousels();
        });