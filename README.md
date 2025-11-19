# Portal de Animes (Rework)

[![Deploy](https://img.shields.io/badge/Ver%20Deploy-GH%20Pages-brightgreen)](https://tarcizioo.github.io/rework_portal/index.html)

## 📖 Descrição
Este é um projeto pessoal de estudo e desenvolvimento de uma plataforma web interativa e responsiva para entusiastas de anime. O objetivo é criar um espaço para descobrir, acompanhar e (futuramente) avaliar animes, servindo como um exercício prático de tecnologias frontend, consumo de APIs e autenticação de usuários.

## 📸 Demonstração Visual (Screenshots)

### Desktop
| Página Inicial (Light) | Modal de Detalhes (Dark) | Página de Perfil |
| :---: | :---: | :---: |
| ![Home Light](main%20screen%20white.png) | ![Modal Detalhes](modal%20anime.png) | ![Perfil Usuário](profile%20modal.png) |

### Mobile
A interface é totalmente responsiva, com uma barra de navegação dedicada para dispositivos móveis.

![Mobile View](main%20screen%20mobile.png)

## ✨ Funcionalidades Implementadas
* **Navegação por Carrosséis:** Visualização de animes em "Animes Populares" e "Lançamentos" através de carrosséis interativos (Slick Carousel).
* **Busca em Tempo Real:** Barra de pesquisa funcional que consome a API e exibe uma pré-visualização dos resultados em tempo real.
* **Modal de Detalhes:** Ao clicar em um anime, um modal exibe detalhes ricos como ranking, temporada, gêneros e sinopse (dados da API Jikan).
* **Temas Light & Dark:** Opção de alternar entre tema claro (light) e escuro (dark), com a preferência salva no `localStorage`.
* **Design Responsivo:** Interface totalmente adaptada para desktop e mobile, incluindo uma barra de navegação inferior (`Bottom Nav`) para dispositivos móveis.
* **Página de Perfil de Usuário:** Estrutura de perfil implementada (via Firebase) com:
    * Banner e Avatar personalizáveis.
    * Estatísticas (ex: "120h assistidas").
    * Seção para "Animes Favoritos".
* **Ícones Modernos:** Utilização da biblioteca Lucide Icons para uma interface limpa.

## 🛠️ Tecnologias Utilizadas
* **Frontend:**
    * HTML5
    * CSS3 (Puro, com Variáveis CSS para temas)
    * JavaScript (Puro, ES Modules)
* **Bibliotecas JavaScript:**
    * [jQuery](https://jquery.com/) (Requisito para o Slick Carousel)
    * [Slick Carousel](https://kenwheeler.github.io/slick/) - Para os carrosséis de animes.
    * [Lucide Icons](https://lucide.dev/) - Biblioteca de ícones SVG.
* **APIs & Backend:**
    * [Jikan API (v4)](https://jikan.moe/) - Para buscar informações e imagens de animes (baseada no MyAnimeList).
    * [Firebase](https://firebase.google.com/) - Para autenticação e armazenamento de dados do usuário (perfil, favoritos).

## 🚀 Como Usar
1.  Navegue pelos carrosséis "Animes Populares" e "Lançamentos".
2.  Utilize a barra de pesquisa no topo para encontrar animes específicos.
3.  Clique em um anime (nos carrosséis ou na prévia) para abrir o modal com detalhes.
4.  Clique no ícone de **Configurações** na barra lateral (desktop) ou inferior (mobile) para mudar o tema.
5.  Acesse a página de **Perfil** para editar do jeito que quiser e adicionar seus animes favoritos.
   
## 🎯 Próximos Passos / Funcionalidades Futuras
* Implementar o cálculo real de "horas assistidas" com base nos animes marcados como "Assistidos".
* Sistema de notas (0-10 ou estrelas) para obras e episódios.
* Criação de listas personalizadas do usuário: "A Assistir", "Assistidos", "Desistiu", etc.
* Página de detalhes completa para cada anime (substituindo o modal), com lista de episódios, trailers e resenhas.
* Filtros avançados por gênero, ano e estúdio na página "Populares".
* Finalizar a implementação do Firebase.
