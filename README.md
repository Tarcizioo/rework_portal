# Anime Portal (Rework)

[![Deploy](https://img.shields.io/badge/View%20Deploy-GH%20Pages-brightgreen)](https://tarcizioo.github.io/rework_portal/index.html)

## 📖 Description
This is a personal study project focused on developing an interactive and responsive web platform for anime enthusiasts. The goal is to create a space to discover, track, and (in the future) rate anime, serving as a practical exercise in frontend technologies, API consumption, and user authentication.

## 📸 Visual Demonstration (Screenshots)

### Desktop
| Home Page (Light) | Details Modal (Dark) | Profile Page |
| :---: | :---: | :---: |
| ![Home Light](main%20screen%20white.png) | ![Details Modal](modal%20anime.png) | ![User Profile](profile%20modal.png) |

### Mobile
The interface is fully responsive, featuring a dedicated navigation bar for mobile devices.

![Mobile View](main%20screen%20mobile.png)

## ✨ Implemented Features
* **Carousel Navigation:** View "Popular Anime" and "New Releases" through interactive carousels (powered by Slick Carousel).
* **Real-Time Search:** Functional search bar that consumes the API and displays result previews in real-time.
* **Details Modal:** Clicking on an anime opens a modal displaying rich details such as ranking, season, genres, and synopsis (data from Jikan API).
* **Light & Dark Themes:** Option to toggle between light and dark modes, with preferences saved in `localStorage`.
* **Responsive Design:** Interface fully adapted for desktop and mobile, including a specific `Bottom Nav` for mobile devices.
* **User Profile Page:** Profile structure implemented (via Firebase) featuring:
    * Customizable Banner and Avatar.
    * Statistics (e.g., "120h watched").
    * Section for "Favorite Anime".
* **Modern Icons:** Use of the Lucide Icons library for a clean interface.

## 🛠️ Technologies Used
* **Frontend:**
    * HTML5
    * CSS3 (Vanilla, with CSS Variables for theming)
    * JavaScript (Vanilla, ES Modules)
* **JavaScript Libraries:**
    * [jQuery](https://jquery.com/) (Required for Slick Carousel)
    * [Slick Carousel](https://kenwheeler.github.io/slick/) - For anime carousels.
    * [Lucide Icons](https://lucide.dev/) - SVG Icon library.
* **APIs & Backend:**
    * [Jikan API (v4)](https://jikan.moe/) - To fetch anime information and images (based on MyAnimeList).
    * [Firebase](https://firebase.google.com/) - For authentication and user data storage (profile, favorites).

## 🚀 How to Use
1.  Browse through the "Popular Anime" and "New Releases" carousels.
2.  Use the top search bar to find specific anime.
3.  Click on an anime (in carousels or preview) to open the details modal.
4.  Click the **Settings** icon in the sidebar (desktop) or bottom bar (mobile) to change the theme.
5.  Access the **Profile** page to customize it and add your favorite anime.

## 🎯 Next Steps / Future Features
* Implement real "hours watched" calculation based on anime marked as "Watched".
* Rating system (0-10 or stars) for shows and episodes.
* Creation of custom user lists: "Plan to Watch", "Completed", "Dropped", etc.
* Full details page for each anime (replacing the modal), with episode lists, trailers, and reviews.
* Advanced filters by genre, year, and studio on the "Popular" page.
* Finalize Firebase implementation.
