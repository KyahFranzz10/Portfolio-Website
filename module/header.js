(function() {
    // Theme Toggle Logic
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);

    const injectThemeToggle = () => {
        const headerContainer = document.querySelector('.header-container');
        if (headerContainer && !document.querySelector('.theme-toggle')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'theme-toggle';
            toggleBtn.id = 'theme-toggle-btn';
            toggleBtn.innerHTML = currentTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            
            // Insert before menu toggle button
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            if (mobileMenuBtn) {
                headerContainer.insertBefore(toggleBtn, mobileMenuBtn);
            } else {
                headerContainer.appendChild(toggleBtn);
            }

            toggleBtn.addEventListener('click', () => {
                const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                toggleBtn.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            });
        }
    };
    injectThemeToggle();

    // Scroll Effect
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            if(header) header.classList.add('scrolled');
        } else {
            if(header) header.classList.remove('scrolled');
        }
    });

    // Active Navigation Highlight
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html'; 
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active'); 
        const linkHref = link.getAttribute('href');
        if (linkHref === page) {
            link.classList.add('active');
        }
    });
})();
