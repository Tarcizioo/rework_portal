## Descrição
Este é um projeto pessoal de estudo e desenvolvimento de uma plataforma web interativa para entusiastas de anime. O objetivo é criar um espaço para descobrir, acompanhar e, futuramente, avaliar animes, servindo como um exercício prático de tecnologias frontend e integração com APIs.

## Demonstração Visual (Screenshots)
![494834381_9399080730191841_7437695162728273977_n](https://github.com/user-attachments/assets/227d9c33-f5db-4c3c-97d4-0c9cfce6f8ff)

## Funcionalidades Implementadas
* **Navegação por Carrosséis:** Visualização de animes nas categorias "Animes Populares" e "Mais Recentes" através de carrosséis interativos (utilizando Slick Carousel).
* **Busca de Animes:** Barra de pesquisa funcional que exibe uma pré-visualização dos resultados correspondentes em tempo real.
* **Detalhes do Anime:** Ao clicar num anime (nos carrosséis ou na prévia da busca), um modal exibe a imagem e uma mini-sinopse do anime (dados obtidos via API Jikan).
* **Temas:** Opção de alternar entre tema claro (light mode) e escuro (dark mode), com a preferência guardada no `localStorage`.
* **Layout Responsivo:** Interface adaptada para visualização em diferentes tamanhos de ecrã (desktop, tablet, mobile).
* **Base para Autenticação:** Estrutura inicial para registo e login de utilizadores com Firebase Authentication (funcionalidade de perfil completo e persistência de dados adiada).
* **Ícones Modernos:** Utilização da biblioteca Lucide Icons para uma interface limpa.

## Tecnologias Utilizadas
* **Frontend:**
    * HTML5
    * CSS3 (Puro, com variáveis CSS para temas)
    * JavaScript (Puro, ES Modules)
* **Bibliotecas JavaScript:**
    * [jQuery](https://jquery.com/) (Requisito para o Slick Carousel)
    * [Slick Carousel](https://kenwheeler.github.io/slick/) - Para os carrosséis de animes.
    * [Lucide Icons](https://lucide.dev/) - Biblioteca de ícones SVG.
* **APIs Externas:**
    * [Jikan API (v4)](https://jikan.moe/) - Para buscar informações e imagens de animes (baseada no MyAnimeList).

## Como Usar
* Navegue pelos carrosséis "Animes Populares" e "Mais Recentes".
* Utilize a barra de pesquisa no topo para encontrar animes específicos; uma pré-visualização dos resultados será exibida.
* Clique num anime (nos carrosséis ou na prévia) para abrir um modal com sua imagem e uma breve sinopse.
* Clique no ícone de configurações na barra lateral para mudar o tema do site (claro/escuro).
* (Quando a funcionalidade de perfis estiver completa) Clique em "Usuário" para aceder ao modal de login/registo. Após o login, este link levará ao seu perfil e um botão de "Logout" aparecerá.

## Próximos Passos / Funcionalidades Futuras (Sugestões)
* Implementação completa da página de perfil do utilizador.
* Sistema de notas (0-10 ou estrelas) para obras e episódios, salvos por utilizador.
* Listas personalizadas de utilizador: "A Assistir", "Assistidos", "Favoritos", "Desistiu", etc.
* Página de detalhes completa para cada anime, com mais informações (géneros, estúdio, data de lançamento, lista de episódios, trailers).
* Integração de trailers do YouTube.
* Filtros avançados por género, ano, etc.
* Secção de "Próximos Lançamentos" mais detalhada.

---
