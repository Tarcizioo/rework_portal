        const heroCarouselEl = document.getElementById('heroCarousel');
        const popularAnimesCarouselEl = document.getElementById('popularAnimesCarousel');
        const mostRecentAnimesCarouselEl = document.getElementById('mostRecentAnimesCarousel');
        const settingsModal = document.getElementById('settingsModal');
        const settingsLink = document.getElementById('settingsLink');
        const settingsLinkMobile = document.getElementById('settingsLinkMobile');
        const closeSettingsModalBtn = document.getElementById('closeSettingsModal');
        const themeSwitcher = document.getElementById('themeSwitcher');
        const saveSettingsBtn = document.getElementById('saveSettings');
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
        
        // --- Funções Utilitárias ---
        function getThemeColor(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
        function getDefaultImageOnError(e) { e.target.src = `https://placehold.co/180x270/${getThemeColor('--bg-tertiary').substring(1)}/${getThemeColor('--text-secondary').substring(1)}?text=Erro`; }
        function getSearchPreviewImageOnError(e) { e.target.src = `https://placehold.co/40x60/${getThemeColor('--bg-tertiary').substring(1)}/${getThemeColor('--text-secondary').substring(1)}?text=X`; }
        function debounce(func, delay = 500) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), delay); }; }
        
        // --- Lógica de Modais ---
        function openAnimeDetailsModal(anime) {
            if (!animeDetailsModal) return;
            animeDetailsModalTitle.textContent = anime.title;
            animeDetailsModalImage.src = anime.imageUrl;
            animeSynopsisArea.innerHTML = `<p>${anime.fullSynopsis || anime.miniSynopsis}</p>`;
            animeDetailsModal.classList.remove('hidden');
        }
        if (closeAnimeDetailsModalBtn) closeAnimeDetailsModalBtn.addEventListener('click', () => animeDetailsModal.classList.add('hidden'));
        if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

        // --- Lógica de Carrossel ---
        function createAnimeCard(anime) {
            const slideItem = document.createElement('div');
            slideItem.innerHTML = `<div class="anime-item-wrapper"><img src="${anime.imageUrl}" alt="${anime.title}" class="anime-image-display" onerror="getDefaultImageOnError(event)"><h3 class="anime-title-display" title="${anime.title}">${anime.title}</h3></div>`;
            slideItem.querySelector('.anime-item-wrapper').addEventListener('click', () => openAnimeDetailsModal(anime));
            return slideItem;
        }

        function populateCarousel(element, animes) {
            if (!element) return;
            if ($(element).hasClass('slick-initialized')) $(element).slick('unslick');
            element.innerHTML = '';
            animes.forEach(anime => element.appendChild(createAnimeCard(anime)));
        }

        function initializeSlickCarousel(selector) {
            $(selector).slick({ dots: true, infinite: true, speed: 300, slidesToShow: 5, slidesToScroll: 5, responsive: [{ breakpoint: 1380, settings: { slidesToShow: 4, slidesToScroll: 4 } }, { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 3 } }, { breakpoint: 768, settings: { slidesToShow: 2, slidesToScroll: 2, dots: false } }, { breakpoint: 480, settings: { slidesToShow: 2, slidesToScroll: 2, dots: false } }] });
        }

        // --- Lógica do Hero Carousel ---
        function createHeroSlide(anime) {
            const slide = document.createElement('div');
            slide.className = 'hero-slide';
            slide.innerHTML = `
                <div class="hero-background-image" style="background-image: url('${anime.imageUrl}')"></div>
                <div class="hero-overlay"></div>
                <div class="hero-content">
                    <div class="hero-poster">
                        <img src="${anime.imageUrl}" alt="Poster de ${anime.title}" onerror="getDefaultImageOnError(event)">
                    </div>
                    <div class="hero-info">
                        <h2>${anime.title}</h2>
                        <p class="genres">${anime.genres}</p>
                        <p class="synopsis">${anime.miniSynopsis}</p>
                    </div>
                </div>
            `;
            slide.addEventListener('click', () => openAnimeDetailsModal(anime));
            return slide;
        }

        function populateHeroCarousel(animes) {
            if (!heroCarouselEl) return;
            heroCarouselEl.innerHTML = ''; // Limpa antes de popular
            animes.forEach(anime => heroCarouselEl.appendChild(createHeroSlide(anime)));
        }

        function initializeHeroCarousel() {
            if (!heroCarouselEl || $(heroCarouselEl).hasClass('slick-initialized')) return;
            $(heroCarouselEl).slick({
                dots: true,
                arrows: true,
                infinite: true,
                speed: 500,
                fade: true,
                cssEase: 'linear',
                autoplay: true,
                autoplaySpeed: 5000,
            });
        }

        // --- Lógica de API e Dados ---
        const transformApiData = (apiAnime) => ({
            id: apiAnime.mal_id,
            title: apiAnime.title_english || apiAnime.title,
            imageUrl: apiAnime.images?.jpg?.large_image_url || apiAnime.images?.jpg?.image_url,
            genres: (apiAnime.genres || []).map(g => g.name).join(', '),
            miniSynopsis: (apiAnime.synopsis || "Sinopse não disponível.").substring(0, 250) + '...',
            fullSynopsis: apiAnime.synopsis || "Sinopse não disponível."
        });

        async function fetchAndDisplayData() {
            showLoadingState(true);
            try {
                const popularPromise = fetch("https://api.jikan.moe/v4/top/anime?limit=15");
                const recentPromise = fetch("https://api.jikan.moe/v4/seasons/now?limit=15");
                const [popularResponse, recentResponse] = await Promise.all([popularPromise, recentPromise]);
                if (!popularResponse.ok || !recentResponse.ok) throw new Error("API fetch failed");
                const popularData = await popularResponse.json();
                const recentData = await recentResponse.json();
                
                const popularAnimes = popularData.data.map(transformApiData);
                const recentAnimes = recentData.data.map(transformApiData);

                populateHeroCarousel(popularAnimes.slice(0, 5));
                initializeHeroCarousel();

                populateCarousel(popularAnimesCarouselEl, popularAnimes);
                initializeSlickCarousel('#popularAnimesCarousel');
                populateCarousel(mostRecentAnimesCarouselEl, recentAnimes);
                initializeSlickCarousel('#mostRecentAnimesCarousel');

            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                [heroCarouselEl, popularAnimesCarouselEl, mostRecentAnimesCarouselEl].forEach(el => {
                    if (el) el.innerHTML = `<p>Ocorreu um erro ao carregar. Tente novamente.</p>`;
                });
            } finally {
                showLoadingState(false);
            }
        }

        function showLoadingState(isLoading) {
            const carousels = [heroCarouselEl, popularAnimesCarouselEl, mostRecentAnimesCarouselEl];
            carousels.forEach(carousel => {
                if (!carousel) return;
                const loadingMessageEl = carousel.querySelector('.carousel-loading-message');
                if (isLoading) {
                    if (!loadingMessageEl) {
                        const p = document.createElement('p');
                        p.className = 'carousel-loading-message';
                        p.textContent = 'A carregar...';
                        carousel.innerHTML = '';
                        carousel.appendChild(p);
                    }
                } else {
                    if (loadingMessageEl) loadingMessageEl.remove();
                }
            });
        }
        
        // --- Lógica de Pesquisa ---
        const handleSearch = async (searchTerm) => {
            if (searchTerm.length < 3) { searchResultsPreview.classList.add('hidden'); return; }
            searchResultsPreview.innerHTML = `<p style="padding: 0.75rem; text-align: center;">A pesquisar...</p>`;
            searchResultsPreview.classList.remove('hidden');
            try {
                const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTerm)}&limit=5`);
                if (!response.ok) throw new Error('API search failed');
                const searchData = await response.json();
                searchResultsPreview.innerHTML = ''; 
                if (searchData.data && searchData.data.length > 0) {
                    searchData.data.forEach(animeData => {
                        const anime = transformApiData(animeData);
                        const item = document.createElement('div');
                        item.className = 'search-preview-item';
                        item.innerHTML = `<img src="${anime.imageUrl}" class="search-preview-image" onerror="getSearchPreviewImageOnError(event)"><div class="search-preview-info"><h4 class="search-preview-title">${anime.title}</h4><p class="search-preview-synopsis">${anime.miniSynopsis}</p></div>`;
                        item.addEventListener('click', () => { openAnimeDetailsModal(anime); searchResultsPreview.classList.add('hidden'); searchInput.value = ''; });
                        searchResultsPreview.appendChild(item);
                    });
                } else { searchResultsPreview.innerHTML = `<p style="padding: 0.75rem; text-align: center;">Nenhum resultado.</p>`; }
            } catch (error) { console.error("Erro na busca:", error); searchResultsPreview.innerHTML = `<p style="padding: 0.75rem; text-align: center;">Erro ao buscar.</p>`; }
        };
        // --- Inicialização e Event Listeners ---
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof lucide !== 'undefined') lucide.createIcons();
            const currentTheme = localStorage.getItem('animeSiteTheme') || 'dark';
            document.body.className = `${currentTheme}-theme`;
            if(themeSwitcher) themeSwitcher.value = currentTheme;
            
            fetchAndDisplayData();

            if (searchInput) {
                const debouncedSearch = debounce(handleSearch);
                searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value.trim()));
                document.addEventListener('click', (e) => { if (searchInput.parentElement && !searchInput.parentElement.contains(e.target)) searchResultsPreview.classList.add('hidden'); });
            }
            
            const mobileMenuButton = document.getElementById('mobileMenuButton');
            const closeMobileSidebarBtn = document.getElementById('closeMobileSidebar');
            const mobileSidebarOverlay = document.getElementById('mobileSidebarOverlay');
            const mobileSidebar = document.getElementById('mobileSidebar');
            
            function openMobileNav() {
                if (mobileSidebarOverlay) mobileSidebarOverlay.classList.remove('hidden');
                if (mobileSidebar) setTimeout(() => mobileSidebar.classList.add('open'), 10);
            }
            function closeMobileNav() {
                if (mobileSidebar) mobileSidebar.classList.remove('open');
                if (mobileSidebarOverlay) setTimeout(() => mobileSidebarOverlay.classList.add('hidden'), 300);
            }
            if (mobileMenuButton) mobileMenuButton.addEventListener('click', openMobileNav);
            if (closeMobileSidebarBtn) closeMobileSidebarBtn.addEventListener('click', closeMobileNav);
            if (mobileSidebarOverlay) mobileSidebarOverlay.addEventListener('click', (e) => { if (e.target === mobileSidebarOverlay) closeMobileNav(); });

            if (settingsLink) settingsLink.addEventListener('click', (e) => { e.preventDefault(); if(settingsModal) settingsModal.classList.remove('hidden'); });
            if (settingsLinkMobile) settingsLinkMobile.addEventListener('click', (e) => { e.preventDefault(); closeMobileNav(); if(settingsModal) settingsModal.classList.remove('hidden'); });
            if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
                if(themeSwitcher) {
                    const newTheme = themeSwitcher.value;
                    document.body.className = `${newTheme}-theme`;
                    localStorage.setItem('animeSiteTheme', newTheme);
                }
                if(settingsModal) settingsModal.classList.add('hidden');
            });
        });
        const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.getElementById('toggleSidebarBtn');
            if(toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    sidebar.classList.toggle('collapsed');
                });
            }