let mockAnimes = [
            // IDs para os animes da imagem image_324b16.png
            { id: 3588, title: "Soul Eater" },
            { id: 44511, title: "Chainsaw Man" },
            { id: 57181, title: "Ao no Hako" }, // Blue Box
            { id: 57334, title: "Dandadan" }, 
            { id: 42897, title: "Horimiya" },
            { id: 21, title: "One Piece" }, 
            { id: 16498, title: "Attack on Titan" }, // Shingeki no Kyojin (Temporada 1)
            { id: 5114, title: "Fullmetal Alchemist: Brotherhood" },
            { id: 9253, title: "Steins;Gate" },
            { id: 1535, title: "Death Note" },
            { id: 9969, title: "Gintama'" }, // Uma das temporadas de Gintama com mais episódios e popular
            { id: 40748, title: "Jujutsu Kaisen (TV)" }, // ID correto para a série de TV
            { id: 50265, title: "Spy x Family" },
            { id: 38000, title: "Kimetsu no Yaiba" }, // Demon Slayer
            { id: 31964, title: "Boku no Hero Academia" } // My Hero Academia
        ];


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
        const generateSynopsisBtn = document.getElementById('generateSynopsisBtn');
        const generateSynopsisBtnText = document.getElementById('generateSynopsisBtnText');
        const synopsisLoadingSpinner = document.getElementById('synopsisLoadingSpinner');
        const animeSynopsisArea = document.getElementById('animeSynopsisArea');
        let currentAnimeTitleForSynopsis = "";

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

        function openAnimeDetailsModal(anime) {
            if (!animeDetailsModal) return;
            animeDetailsModalTitle.textContent = anime.title;
            animeDetailsModalImage.src = anime.imageUrl || `https://placehold.co/200x300/${getThemeColor('--bg-tertiary').substring(1)}/${getThemeColor('--text-secondary').substring(1)}?text=Sem+Imagem&font=Lexend`;
            animeDetailsModalImage.alt = `Imagem de ${anime.title}`;
            animeDetailsModalImage.onerror = getDefaultImageOnError; 
            currentAnimeTitleForSynopsis = anime.title;
            animeSynopsisArea.innerHTML = anime.miniSynopsis || "Clique no botão \"Gerar Sinopse ✨\" para ver mais!"; 
            generateSynopsisBtn.disabled = false;
            generateSynopsisBtnText.textContent = "Gerar Sinopse ✨";
            synopsisLoadingSpinner.classList.add('hidden');
            animeDetailsModal.classList.remove('hidden');
        }

        function closeAnimeDetailsModal() {
            if (animeDetailsModal) animeDetailsModal.classList.add('hidden');
        }

        if (closeAnimeDetailsModalBtn) closeAnimeDetailsModalBtn.addEventListener('click', closeAnimeDetailsModal);


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
            if (animesToDisplay.length === 0 && carouselElement.querySelector('.carousel-loading-message')) {
                 
            } else if (animesToDisplay.length > 0) {
                 const loadingMessage = carouselElement.querySelector('.carousel-loading-message');
                 if (loadingMessage) loadingMessage.remove(); 
            }


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
                slidesToScroll: 3,
                responsive: [
                    { breakpoint: 1380, settings: { slidesToShow: 4, slidesToScroll: 4, infinite: true } },
                    { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 3, infinite: true } },
                    { breakpoint: 768, settings: { slidesToShow: 2, slidesToScroll: 2, dots: false } },
                    { breakpoint: 480, settings: { slidesToShow: 1, slidesToScroll: 1, dots: false } }
                ]
            };
            if ($(selector).children().length > 0) { 
                if ($(selector).hasClass('slick-initialized')) {
                     $(selector).slick('unslick');
                }
                $(selector).slick(slickOptions);
            }
        }
        
        async function fetchAnimeDataFromAPI() {
            const JIKAN_API_BASE_URL = "https://api.jikan.moe/v4/anime";
            const placeholderImageBase = `https://placehold.co/180x270/${getThemeColor('--bg-tertiary').substring(1)}/${getThemeColor('--text-secondary').substring(1)}`;

            showLoadingState(true);
            const updatedAnimes = [];

            for (const animeEntry of mockAnimes) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 350)); 

                    const response = await fetch(`${JIKAN_API_BASE_URL}/${animeEntry.id}/full`); // Usar /full para mais detalhes se necessário
                    if (!response.ok) {
                        console.warn(`Falha ao buscar dados para ${animeEntry.title} (ID: ${animeEntry.id}): ${response.status}`);
                        updatedAnimes.push({
                            ...animeEntry,
                            imageUrl: `${placeholderImageBase}?text=${encodeURIComponent(animeEntry.title.substring(0,10))}&font=Lexend`,
                            miniSynopsis: "Informação não disponível."
                        });
                        continue;
                    }
                    const data = await response.json();
                    const animeData = data.data;
                    
                    let imageUrl = animeData.images?.jpg?.large_image_url || animeData.images?.jpg?.image_url || animeData.images?.webp?.large_image_url || animeData.images?.webp?.image_url;
                    if (!imageUrl) {
                        console.warn(`Imagem não encontrada para ${animeEntry.title}, usando placeholder.`);
                        imageUrl = `${placeholderImageBase}?text=${encodeURIComponent(animeEntry.title.substring(0,10))}&font=Lexend`;
                    }

                    let synopsisText = animeData.synopsis ? animeData.synopsis.split('.')[0] + '.' : "Sinopse não disponível.";
                    if (synopsisText.length > 100) { 
                        synopsisText = synopsisText.substring(0, 97) + "...";
                    }
                    
                    updatedAnimes.push({
                        ...animeEntry,
                        imageUrl: imageUrl,
                        miniSynopsis: synopsisText
                    });

                } catch (error) {
                    console.error(`Erro ao processar ${animeEntry.title}:`, error);
                    updatedAnimes.push({
                        ...animeEntry,
                        imageUrl: `${placeholderImageBase}?text=${encodeURIComponent(animeEntry.title.substring(0,10))}&font=Lexend`,
                        miniSynopsis: "Erro ao carregar dados."
                    });
                }
            }
            mockAnimes = updatedAnimes; 
            showLoadingState(false); 
            return mockAnimes;
        }
        
        function showLoadingState(isLoading) {
            const carousels = [popularAnimesCarouselEl, mostRecentAnimesCarouselEl];
            carousels.forEach(carousel => {
                if (!carousel) return;
                let loadingMessageEl = carousel.querySelector('.carousel-loading-message');
                if (isLoading) {
                    if (!loadingMessageEl) {
                        loadingMessageEl = document.createElement('p');
                        loadingMessageEl.className = 'carousel-loading-message';
                        loadingMessageEl.textContent = 'carregando animes...';
                        if ($(carousel).hasClass('slick-initialized')) {
                            $(carousel).slick('unslick');
                        }
                        carousel.innerHTML = '';
                        carousel.appendChild(loadingMessageEl);
                    }
                } else {
                    if (loadingMessageEl) {
                        loadingMessageEl.remove();
                    }
                }
            });
        }


        async function handleGenerateSynopsis() {
            if (!currentAnimeTitleForSynopsis) return;

            generateSynopsisBtn.disabled = true;
            generateSynopsisBtnText.textContent = "Gerando...";
            synopsisLoadingSpinner.classList.remove('hidden');
            animeSynopsisArea.innerHTML = ""; 

            const prompt = `Gere uma sinopse criativa e concisa para o anime: "${currentAnimeTitleForSynopsis}". A sinopse deve ser interessante, destacar os pontos principais da trama ou do universo do anime, e ter no máximo 3 parágrafos. Mantenha a sinopse em português do Brasil.`;
            
            let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory };
            const apiKey = ""; 
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Erro da API Gemini:", errorData);
                    throw new Error(`Erro da API: ${errorData.error?.message || response.statusText}`);
                }

                const result = await response.json();

                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    const text = result.candidates[0].content.parts[0].text;
                    animeSynopsisArea.innerHTML = text.split('\n').map(p => `<p>${p}</p>`).join('');
                } else {
                    animeSynopsisArea.textContent = "Não foi possível gerar a sinopse ou a resposta da API está vazia.";
                    console.warn("Resposta inesperada da API Gemini:", result);
                }
            } catch (error) {
                console.error("Falha ao gerar sinopse:", error);
                animeSynopsisArea.textContent = `Falha ao gerar sinopse: ${error.message}. Tente novamente.`;
            } finally {
                generateSynopsisBtn.disabled = false;
                generateSynopsisBtnText.textContent = "Gerar Sinopse ✨";
                synopsisLoadingSpinner.classList.add('hidden');
            }
        }

        if (generateSynopsisBtn) generateSynopsisBtn.addEventListener('click', handleGenerateSynopsis);

        function applyThemeAndPopulate(theme) {
            document.body.className = theme + '-theme';
            localStorage.setItem('animeSiteTheme', theme);
            if (themeSwitcher) themeSwitcher.value = theme;
            
            populateCarousel(popularAnimesCarouselEl, mockAnimes);
            initializeSlickCarousel('#popularAnimesCarousel');

            const recentAnimesData = mockAnimes.length >= 7 ? [...mockAnimes].slice(Math.max(0, mockAnimes.length - 7)).reverse() : [...mockAnimes].reverse();
            populateCarousel(mostRecentAnimesCarouselEl, recentAnimesData);
            initializeSlickCarousel('#mostRecentAnimesCarousel');
            
            if (typeof lucide !== 'undefined') {
                 setTimeout(() => lucide.createIcons({ attrs: { class: ['icon'] } }), 0); 
            }
        }

        function openSettingsModal() {
            if(settingsModal) settingsModal.classList.remove('hidden');
        }

        function closeSettings() {
            if(settingsModal) settingsModal.classList.add('hidden');
        }
        
        if (settingsLink) settingsLink.addEventListener('click', (e) => { e.preventDefault(); openSettingsModal(); });
        if (settingsLinkMobile) settingsLinkMobile.addEventListener('click', (e) => {
            e.preventDefault();
            closeMobileNav(); 
            openSettingsModal();
        });
        if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', closeSettings);
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                if (themeSwitcher) applyThemeAndPopulate(themeSwitcher.value); 
                closeSettings();
            });
        }
        
        let username = localStorage.getItem('animeSiteUsername') || "Visitante";
        if(userGreeting) userGreeting.textContent = `Olá, ${username}!!`;

        function createSearchResultItem(anime) {
            const item = document.createElement('div');
            item.className = 'search-preview-item';
            item.innerHTML = `
                <img src="${anime.imageUrl || `https://placehold.co/40x60/${getThemeColor('--bg-tertiary').substring(1)}/${getThemeColor('--text-secondary').substring(1)}?text=?&font=Lexend`}" alt="${anime.title}" class="search-preview-image" onerror="getSearchPreviewImageOnError(event)">
                <div class="search-preview-info">
                    <h4 class="search-preview-title">${anime.title}</h4>
                    <p class="search-preview-synopsis">${anime.miniSynopsis || 'Detalhes não disponíveis...'}</p>
                </div>
            `;
            item.addEventListener('click', () => {
                openAnimeDetailsModal(anime);
                searchResultsPreview.classList.add('hidden'); 
                searchInput.value = ''; 
            });
            return item;
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', (event) => { 
                const searchTerm = event.target.value.toLowerCase().trim();
                searchResultsPreview.innerHTML = ''; 

                if (searchTerm.length > 1) { 
                    const filteredAnimes = mockAnimes.filter(anime => 
                        anime.title.toLowerCase().includes(searchTerm)
                    );

                    if (filteredAnimes.length > 0) {
                        filteredAnimes.slice(0, 5).forEach(anime => { 
                            const itemElement = createSearchResultItem(anime);
                            searchResultsPreview.appendChild(itemElement);
                        });
                        searchResultsPreview.classList.remove('hidden');
                    } else {
                        searchResultsPreview.classList.add('hidden');
                    }
                } else {
                    searchResultsPreview.classList.add('hidden');
                }
            });

            document.addEventListener('click', function(event) {
                const isClickInsideSearchContainer = searchInput.parentElement.contains(event.target);
                if (!isClickInsideSearchContainer && searchResultsPreview) {
                    searchResultsPreview.classList.add('hidden');
                }
            });
            searchInput.addEventListener('focus', () => {
                 if (searchInput.value.trim().length > 1 && searchResultsPreview.children.length > 0) {
                    searchResultsPreview.classList.remove('hidden');
                }
            });
        }

        function openMobileNav() {
            if (mobileSidebarOverlay && mobileSidebar) {
                mobileSidebarOverlay.classList.remove('hidden');
                setTimeout(() => { 
                    mobileSidebar.classList.add('open');
                }, 10);
            }
        }

        function closeMobileNav() {
             if (mobileSidebarOverlay && mobileSidebar) {
                mobileSidebar.classList.remove('open');
                setTimeout(() => {
                    mobileSidebarOverlay.classList.add('hidden');
                }, 300); 
            }
        }

        if (mobileMenuButton) mobileMenuButton.addEventListener('click', openMobileNav);
        if (closeMobileSidebarBtn) closeMobileSidebarBtn.addEventListener('click', closeMobileNav);
        
        if (mobileSidebarOverlay) {
            mobileSidebarOverlay.addEventListener('click', (event) => {
                if (event.target === mobileSidebarOverlay) { 
                    closeMobileNav();
                }
            });
        }

        document.addEventListener('DOMContentLoaded', async () => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({
                    attrs: { class: ['icon'] }
                });
            } else {
                console.error("Lucide library not loaded.");
            }
            
            const currentTheme = localStorage.getItem('animeSiteTheme') || 'dark';
            document.body.className = currentTheme + '-theme'; 
            if(themeSwitcher) themeSwitcher.value = currentTheme;

            await fetchAnimeDataFromAPI(); 
            applyThemeAndPopulate(currentTheme); 
        });