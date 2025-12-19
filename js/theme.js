document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('animeSiteTheme') || 'dark';
    document.body.className = `${savedTheme}-theme`;
    const themeSwitcher = document.getElementById('themeSwitcher');
    
    if (themeSwitcher) {
        themeSwitcher.value = savedTheme;
        
        themeSwitcher.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            document.body.className = `${newTheme}-theme`;
            localStorage.setItem('animeSiteTheme', newTheme);
        });
    }
});