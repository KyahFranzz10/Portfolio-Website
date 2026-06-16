// Initialize Theme
(function() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
})();

// Central Admin State
let currentData = { projects: [], gallery: [], journey: [], socials: { github: "", linkedin: "", twitter: "", facebook: "" } };

let supabaseClient = null;
let scriptsLoaded = false;

async function ensureSupabase() {
    if (scriptsLoaded) return;
    
    const isServerEnv = window.location.protocol !== 'file:';
    if (!isServerEnv) {
        scriptsLoaded = true;
        return;
    }

    try {
        // Load config.js dynamically from parent directory
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = '../js/config.js';
            script.onload = resolve;
            script.onerror = () => { console.warn("config.js not found, running without Supabase"); resolve(); };
            document.head.appendChild(script);
        });

        // Load Supabase JS CDN if credentials are set
        if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url !== "YOUR_SUPABASE_URL") {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });

            if (typeof supabase !== 'undefined') {
                supabaseClient = supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
                console.log("Supabase Client initialized in Admin Console.");
            }
        }
    } catch (error) {
        console.error("Failed to load or initialize Supabase in Admin Console:", error);
    }
    scriptsLoaded = true;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inject Admin Layout Components (Header, Sidebar, Overlay)
    injectAdminLayout();

    // 2. Setup Sidebar Mobile Menu Toggle Listeners
    setupSidebarToggle();

    // 3. Set up Log Out trigger
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            sessionStorage.removeItem('_admin_token');
            sessionStorage.removeItem('admin_logged_in');
            window.location.href = 'login.html';
        });
    }

    // Sync Cache Trigger
    const forceSyncBtn = document.getElementById('forceSyncBtn');
    if (forceSyncBtn) {
        forceSyncBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("This will clear your local browser database cache and fetch fresh data from the server/Supabase. Continue?")) {
                try {
                    localStorage.removeItem('portfolio_db');
                } catch (err) {
                    console.warn("Could not clear LocalStorage.", err);
                }
                const originalContent = forceSyncBtn.innerHTML;
                forceSyncBtn.style.background = '#10b981';
                forceSyncBtn.style.color = '#fff';
                forceSyncBtn.innerHTML = '<i class="fas fa-check"></i> Synced!';
                setTimeout(() => {
                    window.location.reload();
                }, 800);
            }
        });
    }

    // Theme Toggle Handler
    const themeToggleBtn = document.getElementById('admin-theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            const icon = themeToggleBtn.querySelector('i');
            if (icon) {
                icon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            }
        });
    }

    // 4. Highlight active sidebar link
    highlightActiveLink();

    // 5. Fetch database data models
    await loadData();
});

// Dynamic layout injector
function injectAdminLayout() {
    const headerPlaceholder = document.getElementById('admin-header-placeholder');
    const sidebarPlaceholder = document.getElementById('admin-sidebar-placeholder');

    if (headerPlaceholder) {
        headerPlaceholder.outerHTML = `
            <header class="admin-header">
                <div class="header-left">
                    <button class="mobile-toggle" id="admin-mobile-toggle" aria-label="Open navigation menu">
                        <i class="fas fa-bars"></i>
                    </button>
                    <h1>Admin <span>Console</span></h1>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <button class="theme-toggle" id="admin-theme-toggle" aria-label="Toggle theme mode">
                        <i class="fas ${localStorage.getItem('theme') === 'light' ? 'fa-moon' : 'fa-sun'}"></i>
                    </button>
                    <div class="header-user-badge">
                        <i class="fas fa-user-shield"></i>
                        <span>Developer</span>
                    </div>
                </div>
            </header>
        `;
    }

    if (sidebarPlaceholder) {
        sidebarPlaceholder.outerHTML = `
            <aside class="admin-sidebar" id="admin-sidebar">
                <div class="sidebar-brand">
                    <i class="fas fa-laptop-code"></i>
                    <h3>Admin <span>Console</span></h3>
                </div>
                
                <div class="sidebar-user">
                    <div class="user-avatar"><i class="fas fa-user-astronaut"></i></div>
                    <h4>Jhon Francis</h4>
                    <p>Administrator</p>
                </div>

                <nav class="sidebar-nav">
                    <ul>
                        <li><a href="index.html" class="sidebar-link" id="link-dashboard"><i class="fas fa-th-large"></i> Dashboard Hub</a></li>
                        <li><a href="portfolio.html" class="sidebar-link" id="link-portfolio"><i class="fas fa-briefcase"></i> Portfolio Projects</a></li>
                        <li><a href="gallery.html" class="sidebar-link" id="link-gallery"><i class="fas fa-images"></i> Gallery Media</a></li>
                        <li><a href="journey.html" class="sidebar-link" id="link-journey"><i class="fas fa-route"></i> My Journey</a></li>
                        <li><a href="skills.html" class="sidebar-link" id="link-skills"><i class="fas fa-code"></i> Skills & Tools</a></li>
                        <li><a href="socials.html" class="sidebar-link" id="link-socials"><i class="fas fa-share-alt"></i> Social Profiles</a></li>
                        <li><a href="contacts.html" class="sidebar-link" id="link-contacts"><i class="fas fa-address-book"></i> Contact Info</a></li>
                        <li><a href="messages.html" class="sidebar-link" id="link-messages"><i class="fas fa-inbox"></i> Messages</a></li>
                        <li><a href="profile.html" class="sidebar-link" id="link-profile"><i class="fas fa-user-edit"></i> About Page Content</a></li>
                        <li><a href="images.html" class="sidebar-link" id="link-images"><i class="fas fa-images"></i> Profile Images</a></li>
                    </ul>
                </nav>

                <div class="sidebar-footer">
                    <a href="../index.html" class="sidebar-link-btn" target="_blank"><i class="fas fa-external-link-alt"></i> View Site</a>
                    <div style="display: flex; gap: 8px;">
                        <button class="sidebar-link-btn" id="forceSyncBtn" style="flex: 1; margin: 0; background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.25); color: #60a5fa; padding: 12px 6px;"><i class="fas fa-sync-alt"></i> Sync</button>
                        <button class="sidebar-link-btn btn-logout" id="logoutBtn" style="flex: 1; margin: 0; padding: 12px 6px;"><i class="fas fa-sign-out-alt"></i> Log Out</button>
                    </div>
                </div>
            </aside>
            <div class="admin-overlay" id="admin-overlay"></div>
        `;
    }
}

// Sidebar Drawer Event bindings for mobile & desktop viewports
function setupSidebarToggle() {
    const mobileToggle = document.getElementById('admin-mobile-toggle');
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('admin-overlay');

    if (!mobileToggle || !sidebar || !overlay) return;

    // Check localStorage for saved collapse preference on desktop
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (isCollapsed && window.innerWidth > 768) {
        document.body.classList.add('sidebar-collapsed');
    }

    function toggleSidebar() {
        if (window.innerWidth <= 768) {
            // Mobile: Toggle slide-in drawer
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        } else {
            // Desktop: Toggle body collapse class
            document.body.classList.toggle('sidebar-collapsed');
            const nowCollapsed = document.body.classList.contains('sidebar-collapsed');
            localStorage.setItem('sidebar_collapsed', nowCollapsed);
        }
    }

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Block background scroll
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    mobileToggle.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', closeSidebar);

    // Also close mobile sidebar if menu items are clicked
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(l => l.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    }));
}

// Highlights the active sidebar navigation element based on URL path
function highlightActiveLink() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    const allLinks = document.querySelectorAll('.sidebar-link');
    
    allLinks.forEach(link => {
        link.classList.remove('active');
        const linkHref = link.getAttribute('href');
        if (linkHref === page) {
            link.classList.add('active');
        }
    });
}

// Load JSON data model
// Helper to display loading pulse animation in lists before data is fetched
function showLoadingSkeletons() {
    const pList = document.getElementById('portfolio-list');
    const gList = document.getElementById('gallery-list');
    const jList = document.getElementById('journey-list');

    const skeletonCard = `
        <div class="item-card skeleton-card" style="opacity: 0.6; pointer-events: none;">
            <div class="card-media-wrapper skeleton-shimmer" style="background: rgba(255, 255, 255, 0.05); height: 170px;"></div>
            <div style="margin-top: 15px;">
                <div style="height: 16px; background: rgba(255, 255, 255, 0.05); width: 40%; border-radius: 4px; margin-bottom: 12px;" class="skeleton-shimmer"></div>
                <div style="height: 22px; background: rgba(255, 255, 255, 0.08); width: 80%; border-radius: 4px; margin-bottom: 12px;" class="skeleton-shimmer"></div>
                <div style="height: 14px; background: rgba(255, 255, 255, 0.05); width: 95%; border-radius: 4px; margin-bottom: 6px;" class="skeleton-shimmer"></div>
                <div style="height: 14px; background: rgba(255, 255, 255, 0.05); width: 70%; border-radius: 4px;" class="skeleton-shimmer"></div>
            </div>
            <div class="item-actions" style="border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 18px; display: flex; gap: 12px; margin-top: 20px;">
                <div style="height: 32px; background: rgba(255, 255, 255, 0.05); flex: 1; border-radius: 8px;" class="skeleton-shimmer"></div>
                <div style="height: 32px; background: rgba(255, 255, 255, 0.05); flex: 1; border-radius: 8px;" class="skeleton-shimmer"></div>
            </div>
        </div>
    `;

    const skeletonJourney = `
        <div class="item-card skeleton-card" style="opacity: 0.6; pointer-events: none; padding: 22px;">
            <div style="padding: 10px 0;">
                <div style="height: 22px; background: rgba(255, 255, 255, 0.05); width: 25%; border-radius: 20px; margin-bottom: 15px;" class="skeleton-shimmer"></div>
                <div style="height: 20px; background: rgba(255, 255, 255, 0.08); width: 60%; border-radius: 4px; margin-bottom: 12px;" class="skeleton-shimmer"></div>
                <div style="height: 14px; background: rgba(255, 255, 255, 0.05); width: 90%; border-radius: 4px; margin-bottom: 6px;" class="skeleton-shimmer"></div>
                <div style="height: 14px; background: rgba(255, 255, 255, 0.05); width: 75%; border-radius: 4px;" class="skeleton-shimmer"></div>
            </div>
            <div class="item-actions" style="border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 18px; display: flex; gap: 12px; margin-top: 10px;">
                <div style="height: 32px; background: rgba(255, 255, 255, 0.05); width: 80px; border-radius: 8px;" class="skeleton-shimmer"></div>
                <div style="height: 32px; background: rgba(255, 255, 255, 0.05); width: 80px; border-radius: 8px;" class="skeleton-shimmer"></div>
            </div>
        </div>
    `;

    if (pList) {
        pList.innerHTML = skeletonCard.repeat(3);
    }
    if (gList) {
        gList.innerHTML = skeletonCard.repeat(3);
    }
    if (jList) {
        jList.innerHTML = skeletonJourney.repeat(3);
    }

    const pCount = document.getElementById('stat-projects-count');
    const gCount = document.getElementById('stat-gallery-count');
    const jCount = document.getElementById('stat-journey-count');
    const sCount = document.getElementById('stat-socials-count');

    const statLoading = `<span class="skeleton-shimmer" style="display: inline-block; width: 30px; height: 30px; background: rgba(255, 255, 255, 0.1); border-radius: 6px; vertical-align: middle;"></span>`;
    if (pCount) pCount.innerHTML = statLoading;
    if (gCount) gCount.innerHTML = statLoading;
    if (jCount) jCount.innerHTML = statLoading;
    if (sCount) sCount.innerHTML = statLoading;
}

// Schema Migration Guard
function ensureSchema(data) {
    if (!data) data = {};
    if (!data.projects) data.projects = [];
    if (!data.gallery) data.gallery = [];
    if (!data.journey) data.journey = [];
    if (!data.messages) data.messages = [];
    if (!data.socials) data.socials = { github: "", linkedin: "", twitter: "", facebook: "" };
    if (!data.contact) data.contact = { email: "student@university.edu", phone: "+1 (234) 567-8900", location: "Tech City, State, Country" };
    if (typeof data.maintenance_mode === 'undefined') data.maintenance_mode = false;
    if (!data.profile) {
        data.profile = {
            name: "Jhon Francis Garapan",
            home_subtitle: "Graduate IT Student & Frontend Developer",
            home_description: "Transforming ideas into robust digital solutions. Passionate about coding, problem-solving, and continuous learning in the ever-evolving world of tech.",
            about_title: "IT Student & Developer",
            about_p1: "I am a final-year Information Technology student passionate about frontend engineering and modern web aesthetics. I specialize in creating highly responsive, accessible, and user-friendly digital experiences.",
            about_p2: "Whether it's crafting layouts with vanilla CSS or building custom modular interfaces, I enjoy translating complex user requirements into elegant, robust code.",
            about_education_title: "Education & Passion",
            about_education_p1: "I am a final-year Information Technology student with a strong foundation in web development, database management, and system analysis. My academic journey has equipped me with both theoretical knowledge and practical skills.",
            about_education_p2: "I thrive on turning complex problems into simple, intuitive, and modern web applications. Currently looking for opportunities to contribute to impactful projects while growing as a developer.",
                    about_skills_title: "Core Competencies",
            about_skills_list: ["Web Development", "UI/UX Design", "Database Management", "Problem Solving", "Agile Methodologies"]
        };
    } else if (!data.profile.about_skills_list) {
        data.profile.about_skills_title = "Core Competencies";
        data.profile.about_skills_list = ["Web Development", "UI/UX Design", "Database Management", "Problem Solving", "Agile Methodologies"];
    }
    if (!data.profile_images) {
        data.profile_images = {
            home_hero: "assets/image/IMG_0641.JPG",
            about_carousel: [
                "assets/image/IMG_0641.JPG",
                "assets/image/Grad_Pic.jpg"
            ]
        };
    }
    if (!data.skills) {
        data.skills = [
            {
                id: "cat_1",
                category: "Languages",
                icon: "fas fa-code",
                items: [
                    { name: "HTML", icon: "fab fa-html5" },
                    { name: "CSS", icon: "fab fa-css3-alt" },
                    { name: "JavaScript", icon: "fab fa-js" },
                    { name: "Python", icon: "fab fa-python" },
                    { name: "PHP", icon: "fab fa-php" },
                    { name: "Dart", icon: "fas fa-bullseye" },
                    { name: "C", icon: "fas fa-terminal" },
                    { name: "C++", icon: "fas fa-code" },
                    { name: "C#", icon: "fas fa-hashtag" }
                ]
            },
            {
                id: "cat_2",
                category: "Frameworks & Libs",
                icon: "fas fa-layer-group",
                items: [
                    { name: "React", icon: "fab fa-react" },
                    { name: "Node.js", icon: "fab fa-node-js" },
                    { name: "Tailwind CSS", icon: "fas fa-leaf" },
                    { name: "Laravel", icon: "fab fa-laravel" },
                    { name: "Flutter", icon: "fas fa-mobile-alt" }
                ]
            },
            {
                id: "cat_3",
                category: "Tools & Databases",
                icon: "fas fa-tools",
                items: [
                    { name: "Git & GitHub", icon: "fab fa-git-alt" },
                    { name: "MySQL", icon: "fas fa-database" },
                    { name: "Command Line", icon: "fas fa-terminal" },
                    { name: "Firebase", icon: "fas fa-fire" },
                    { name: "Supabase", icon: "fas fa-bolt" },
                    { name: "Hostinger", icon: "fas fa-server" },
                    { name: "n8n (Automation)", icon: "fas fa-project-diagram" }
                ]
            },
            {
                id: "cat_4",
                category: "Productivity & Media",
                icon: "fas fa-photo-film",
                items: [
                    { name: "Microsoft Office", icon: "fas fa-file-alt" },
                    { name: "Adobe Suite", icon: "fab fa-adobe" },
                    { name: "OBS Studio", icon: "fas fa-video" }
                ]
            }
        ];
    }
    return data;
}

// Load JSON data model
async function loadData() {
    // Show loaders while fetching from network/local files
    showLoadingSkeletons();

    await ensureSupabase();

    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('portfolio_db')
                .select('data')
                .eq('id', 1)
                .single();

            if (error) throw error;
            if (data && data.data) {
                currentData = data.data;
                try {
                    localStorage.setItem('portfolio_db', JSON.stringify(currentData));
                } catch (e) {
                    console.warn("Could not save to LocalStorage.", e);
                }
                initPageDashboard();
                return;
            }
        } catch (err) {
            console.error("Error loading data from Supabase, falling back to local files:", err);
        }
    }

    const isServerEnv = window.location.protocol !== 'file:';
    
    // Check localStorage first
    let localData = null;
    try {
        localData = localStorage.getItem('portfolio_db');
    } catch (e) {
        console.warn("LocalStorage is not available.", e);
    }

    let localObj = null;
    if (localData) {
        try {
            localObj = JSON.parse(localData);
        } catch (e) {
            console.error("Failed to parse local portfolio data", e);
        }
    }

    if (isServerEnv) {
        try {
            const response = await fetch('../js/data.json?t=' + Date.now());
            if (response.ok) {
                const serverData = await response.json();
                
                const localHasProjects = localObj && Array.isArray(localObj.projects) && localObj.projects.length > 0;
                const serverHasProjects = serverData && Array.isArray(serverData.projects) && serverData.projects.length > 0;

                // Compare timestamps if local data exists and actually has valid projects list
                if (localObj && localObj.last_updated && localHasProjects && 
                    (!serverData.last_updated || localObj.last_updated > serverData.last_updated)) {
                    console.log("Local storage contains newer edits than server file. Using local storage.");
                    currentData = localObj;
                } else if (serverHasProjects) {
                    console.log("Using server data.json file.");
                    currentData = serverData;
                    try {
                        localStorage.setItem('portfolio_db', JSON.stringify(currentData));
                    } catch (e) {
                        console.warn("Could not save to LocalStorage.", e);
                    }
                } else {
                    currentData = localObj || serverData;
                }
                
                // Ensure structures are safe
                currentData = ensureSchema(currentData);

                initPageDashboard();
                return;
            }
        } catch (e) {
            console.error("Failed to load data.json from server, falling back to localStorage", e);
        }
    }

    // Non-server env, or server fetch failed: use localObj if it actually has data
    const localHasProjects = localObj && Array.isArray(localObj.projects) && localObj.projects.length > 0;
    if (localObj && localHasProjects) {
        currentData = localObj;
        currentData = ensureSchema(currentData);

        initPageDashboard();
        return;
    }

    // Fallback fresh initialization if nothing exists
    try {
        const response = await fetch('../js/data.json?t=' + Date.now());
        currentData = await response.json();
        
        currentData = ensureSchema(currentData);

        try {
            localStorage.setItem('portfolio_db', JSON.stringify(currentData));
        } catch (e) {
            console.warn("Could not save to LocalStorage.", e);
        }
        initPageDashboard();
    } catch (e) {
        console.error("No existing data model found. Starting fresh.", e);
        currentData = ensureSchema({ 
            projects: [], 
            gallery: [], 
            journey: [],
            socials: { github: "https://github.com", linkedin: "https://linkedin.com", twitter: "https://twitter.com", facebook: "https://facebook.com" } 
        });
        try {
            localStorage.setItem('portfolio_db', JSON.stringify(currentData));
        } catch (e) {
            console.warn("Could not save fallback to LocalStorage.", e);
        }
        initPageDashboard();
    }
}

// Save state data to localStorage and server API
async function saveDataToStorage() {
    // SECURITY CHECK: Verify token before saving changes
    if (window._verifyAuth && !window._verifyAuth()) {
        alert("Session expired or invalid. Please log in again to save changes.");
        window.location.href = 'login.html';
        return;
    }

    currentData.last_updated = Date.now();
    try {
        localStorage.setItem('portfolio_db', JSON.stringify(currentData));
    } catch (e) {
        console.warn("Could not write updates to LocalStorage.", e);
        if (e.name === 'QuotaExceededError') {
            alert("⚠️ WARNING: The image you uploaded is too large for offline storage!\n\nYou MUST start the Python Server (server.py) to save files this large.");
        }
    }

    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('portfolio_db')
                .update({ data: currentData, last_updated: new Date().toISOString() })
                .eq('id', 1);

            if (error) throw error;
            console.log("Successfully auto-synced changes to Supabase.");
        } catch (err) {
            console.error("Failed to sync changes to Supabase:", err);
        }
    }

}

// Router to initialize components based on the active document
function initPageDashboard() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';

    if (page === 'index.html' || page === 'dashboard.html') {
        renderDashboardStats();
    } else if (page === 'portfolio.html') {
        renderPortfolioList();
    } else if (page === 'gallery.html') {
        renderGalleryList();
    } else if (page === 'journey.html') {
        renderJourneyList();
    } else if (page === 'socials.html') {
        loadSocialsFields();
    } else if (page === 'contacts.html') {
        loadContactsFields();
    } else if (page === 'messages.html') {
        renderMessagesList();
    } else if (page === 'images.html') {
        initImagesManager();
    } else if (page === 'profile.html') {
        loadProfileFields();
    } else if (page === 'skills.html') {
        renderSkillsList();
    }
}

/* ==========================================
   1. Dashboard Stats View (index.html)
   ========================================== */
function renderDashboardStats() {
    const pCount = document.getElementById('stat-projects-count');
    const gCount = document.getElementById('stat-gallery-count');
    const jCount = document.getElementById('stat-journey-count');
    const sCount = document.getElementById('stat-socials-count');
    
    if (pCount) pCount.innerText = currentData.projects.length;
    if (gCount) gCount.innerText = currentData.gallery.length;
    if (jCount) jCount.innerText = currentData.journey.length;
    if (sCount) sCount.innerText = Object.values(currentData.socials).filter(val => val.trim() !== "").length;

    // Initialize maintenance toggle
    const toggle = document.getElementById('maintenance-toggle');
    if (toggle) {
        toggle.checked = currentData.maintenance_mode || false;
    }
}

async function toggleMaintenanceMode(state) {
    currentData.maintenance_mode = state;
    await saveDataToStorage();
}

/* ==========================================
   2. Portfolio Management View (portfolio.html)
   ========================================== */
function renderPortfolioList() {
    const pList = document.getElementById('portfolio-list');
    if (!pList) return;

    pList.innerHTML = '';
    currentData.projects.forEach((p, index) => {
        const statusVal = p.status || 'deployed';
        const statusLabel = statusVal === 'in-progress' ? 'In Progress' : (statusVal === 'not-deployed' ? 'Local Only' : 'Deployed');

        pList.innerHTML += `
            <div class="item-card">
                <div class="card-media-wrapper">
                    ${p.mediaType === 'video' ? `<video src="${p.mediaUrl}" muted loop controls></video>` : `<img src="${p.mediaUrl}" alt="${p.title}">`}
                </div>
                <div style="margin-top: 15px;">
                    <div class="project-tags">
                        ${p.tags.map(tag => `<span>${tag}</span>`).join('')}
                        <span class="status-badge status-${statusVal}">${statusLabel}</span>
                    </div>
                    <h4>${p.title}</h4>
                    <p>${p.description.length > 100 ? p.description.substring(0, 100) + '...' : p.description}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-admin btn-edit" onclick='editItem("portfolio", "${p.id}")'><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-admin btn-delete" onclick='deleteItem("portfolio", "${p.id}")'><i class="fas fa-trash-alt"></i> Delete</button>
                    <button class="btn-admin" style="background: rgba(59, 130, 246, 0.15); border-color: var(--clr-primary); color: var(--clr-primary-light);" onclick="window.openProjectModal(${index})"><i class="fas fa-eye"></i> View</button>
                </div>
            </div>
        `;
    });
}

// Modal Logic for Admin Portfolio Preview
window.openProjectModal = function(index) {
    const project = currentData.projects[index];
    if (!project) return;

    const modal = document.getElementById('project-modal');
    const modalBody = document.getElementById('modal-body-content');
    
    if (!modal || !modalBody) return;

    let mediaHTML = '';
    if (project.mediaType === 'video') {
        mediaHTML = `<video src="${project.mediaUrl}" controls autoplay></video>`;
    } else {
        mediaHTML = `<img src="${project.mediaUrl}" alt="${project.title}">`;
    }

    modalBody.innerHTML = `
        <div class="modal-body">
            <div class="modal-media">
                ${mediaHTML}
            </div>
            <div class="modal-info">
                <h2>${project.title}</h2>
                <div class="project-tags-row" style="margin-bottom: 20px;">
                    <div class="project-tags">
                        ${project.tags.map(tag => `<span>${tag}</span>`).join('')}
                    </div>
                </div>
                <p>${project.description}</p>
                ${project.link ? `<a href="${project.link}" target="_blank" class="modal-action-btn"><i class="fas fa-external-link-alt"></i> Visit Project</a>` : ''}
            </div>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.closeProjectModal = function() {
    const modal = document.getElementById('project-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        const video = modal.querySelector('video');
        if (video) video.pause();
    }
};

// Close on overlay click
document.addEventListener('DOMContentLoaded', () => {
    const modalOverlay = document.getElementById('project-modal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                window.closeProjectModal();
            }
        });
    }
});

/* ==========================================
   3. Gallery Management View (gallery.html)
   ========================================== */
function renderGalleryList() {
    const gList = document.getElementById('gallery-list');
    if (!gList) return;

    gList.innerHTML = '';
    currentData.gallery.forEach(g => {
        gList.innerHTML += `
            <div class="item-card">
                <div class="card-media-wrapper">
                    ${g.mediaType === 'video' ? `<video src="${g.mediaUrl}" muted loop controls></video>` : `<img src="${g.mediaUrl}" alt="${g.caption}">`}
                </div>
                <div style="margin-top: 15px;">
                    <p>${g.caption}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-admin btn-edit" onclick='editItem("gallery", "${g.id}")'><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-admin btn-delete" onclick='deleteItem("gallery", "${g.id}")'><i class="fas fa-trash-alt"></i> Delete</button>
                </div>
            </div>
        `;
    });
}

/* ==========================================
   4. Socials Link Management (socials.html)
   ========================================== */
function loadSocialsFields() {
    const ghInput = document.getElementById('social-github');
    const liInput = document.getElementById('social-linkedin');
    const twInput = document.getElementById('social-twitter');
    const fbInput = document.getElementById('social-facebook');

    if (ghInput) ghInput.value = currentData.socials.github || '';
    if (liInput) liInput.value = currentData.socials.linkedin || '';
    if (twInput) twInput.value = currentData.socials.twitter || '';
    if (fbInput) fbInput.value = currentData.socials.facebook || '';
}

// Save Socials Form handler
const socialsForm = document.getElementById('socials-form');
if (socialsForm) {
    socialsForm.onsubmit = (e) => {
        e.preventDefault();
        
        currentData.socials.github = document.getElementById('social-github').value.trim();
        currentData.socials.linkedin = document.getElementById('social-linkedin').value.trim();
        currentData.socials.twitter = document.getElementById('social-twitter').value.trim();
        
        const fbEl = document.getElementById('social-facebook');
        if (fbEl) {
            currentData.socials.facebook = fbEl.value.trim();
        }

        // Automatically persist changes to local storage
        saveDataToStorage();

        // Show soft success feedback
        const submitBtn = socialsForm.querySelector('button[type="submit"]');
        const origText = submitBtn.innerHTML;
        submitBtn.style.background = '#10b981';
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Socials Saved!';
        
        setTimeout(() => {
            submitBtn.style.background = '';
            submitBtn.innerHTML = origText;
        }, 2000);
    };
}

/* ==========================================
   4c. Messages Management (messages.html)
   ========================================== */
function renderMessagesList() {
    const list = document.getElementById('messages-list');
    if (!list) return;

    list.innerHTML = '';
    
    // Combine server messages with offline localStorage messages just in case
    let msgs = currentData.messages || [];
    let offlineMsgs = [];
    try {
        offlineMsgs = JSON.parse(localStorage.getItem('portfolio_messages')) || [];
    } catch(e) {}
    
    // Merge offline messages that aren't already in the server data
    offlineMsgs.forEach(off => {
        if (!msgs.find(m => m.timestamp === off.timestamp)) {
            msgs.push(off);
        }
    });
    
    msgs.sort((a, b) => b.timestamp - a.timestamp);

    if (msgs.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:2rem; color:var(--text-dim);">No messages received yet.</p>';
        return;
    }

    msgs.forEach(msg => {
        const item = document.createElement('div');
        item.className = 'admin-item-card';
        
        const dateStr = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Unknown Date';

        item.innerHTML = `
            <div class="item-content" style="width: 100%;">
                <h4 style="margin-bottom: 5px;">${msg.subject || 'No Subject'}</h4>
                <p style="font-size: 0.9rem; color: var(--text-dim); margin-bottom: 10px;">
                    <strong>From:</strong> ${msg.name || 'Anonymous'} &lt;${msg.email || 'N/A'}&gt; <br>
                    <strong>Date:</strong> ${dateStr}
                </p>
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; font-size: 0.95rem; line-height: 1.5; white-space: pre-wrap;">${msg.message || ''}</div>
            </div>
            <div class="item-actions" style="align-items: flex-end; justify-content: flex-start; padding-top: 10px;">
                <button class="btn-admin btn-delete" onclick="deleteMessage(${msg.timestamp})" title="Delete Message"><i class="fas fa-trash"></i> Delete</button>
            </div>
        `;
        list.appendChild(item);
    });
}

window.deleteMessage = function(timestamp) {
    if (confirm("Are you sure you want to delete this message?")) {
        if (currentData.messages) {
            currentData.messages = currentData.messages.filter(m => m.timestamp !== timestamp);
        }
        
        // Also remove from offline storage
        try {
            let offlineMsgs = JSON.parse(localStorage.getItem('portfolio_messages')) || [];
            offlineMsgs = offlineMsgs.filter(m => m.timestamp !== timestamp);
            localStorage.setItem('portfolio_messages', JSON.stringify(offlineMsgs));
        } catch(e) {}
        
        saveDataToStorage().then(() => renderMessagesList());
    }
};

/* ==========================================
   5. Profile Info Management (profile.html)
   ========================================== */
function loadContactsFields() {
    const emailInput = document.getElementById('contact-email');
    const phoneInput = document.getElementById('contact-phone');
    const locationInput = document.getElementById('contact-location');

    if (!currentData.contact) {
        currentData.contact = { email: "", phone: "", location: "" };
    }

    if (emailInput) emailInput.value = currentData.contact.email || '';
    if (phoneInput) phoneInput.value = currentData.contact.phone || '';
    if (locationInput) locationInput.value = currentData.contact.location || '';
}

const contactsForm = document.getElementById('contacts-form');
if (contactsForm) {
    contactsForm.onsubmit = (e) => {
        e.preventDefault();
        
        if (!currentData.contact) currentData.contact = {};
        
        currentData.contact.email = document.getElementById('contact-email').value.trim();
        currentData.contact.phone = document.getElementById('contact-phone').value.trim();
        currentData.contact.location = document.getElementById('contact-location').value.trim();

        saveDataToStorage();

        const submitBtn = contactsForm.querySelector('button[type="submit"]');
        const origText = submitBtn.innerHTML;
        submitBtn.style.background = '#10b981';
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Contacts Saved!';
        
        setTimeout(() => {
            submitBtn.style.background = '';
            submitBtn.innerHTML = origText;
        }, 2000);
    };
}

/* ==========================================
   5. Dynamic Edit Modals & Shared Operations
   ========================================== */
function showForm(type, id = null) {
    const modal = document.getElementById('form-modal');
    const form = document.getElementById('admin-form');
    if (!modal || !form) return;

    document.getElementById('item-type').value = type;
    document.getElementById('item-id').value = id || '';
    
    // Toggle fields based on type
    const descGroup = document.getElementById('desc-group');
    const tagsGroup = document.getElementById('tags-group');
    const linkGroup = document.getElementById('link-group');
    const statusGroup = document.getElementById('status-group');
    
    if (descGroup) descGroup.style.display = type === 'portfolio' ? 'block' : 'none';
    if (tagsGroup) tagsGroup.style.display = type === 'portfolio' ? 'block' : 'none';
    if (linkGroup) linkGroup.style.display = type === 'portfolio' ? 'block' : 'none';
    if (statusGroup) statusGroup.style.display = type === 'portfolio' ? 'block' : 'none';
    
    if (id) {
        const item = currentData[type === 'portfolio' ? 'projects' : 'gallery'].find(i => i.id == id);
        document.getElementById('item-title').value = item.title || item.caption;
        if (descGroup && item.description) document.getElementById('item-desc').value = item.description;
        document.getElementById('item-url').value = item.mediaUrl || '';
        document.getElementById('item-media-type').value = item.mediaType;
        if (tagsGroup && item.tags) document.getElementById('item-tags').value = item.tags.join(', ');
        if (linkGroup && item.link) document.getElementById('item-link').value = item.link;
        if (statusGroup) {
            const statusEl = document.getElementById('item-status');
            if (statusEl) statusEl.value = item.status || 'deployed';
        }
        
        // Reset file input value
        const fileInput = document.getElementById('item-file');
        if (fileInput) fileInput.value = '';
        
        document.getElementById('form-title').innerText = "Edit Item";
    } else {
        form.reset();
        document.getElementById('item-url').value = '';
        if (linkGroup) document.getElementById('item-link').value = '';
        if (statusGroup) {
            const statusEl = document.getElementById('item-status');
            if (statusEl) statusEl.value = 'deployed';
        }
        document.getElementById('form-title').innerText = "Add New Item";
    }

    modal.style.display = 'flex';
}

function hideForm() {
    const modal = document.getElementById('form-modal');
    if (modal) modal.style.display = 'none';
}

// Helper to read file as Base64 Data URL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

// Add auto-detection listener for file changes
document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'item-file') {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const mediaTypeSelect = document.getElementById('item-media-type');
            if (mediaTypeSelect) {
                if (file.type.startsWith('video/')) {
                    mediaTypeSelect.value = 'video';
                } else {
                    mediaTypeSelect.value = 'image';
                }
            }
        }
    }
});

// Add/Edit submit handler for modal forms
const adminForm = document.getElementById('admin-form');
if (adminForm) {
    adminForm.onsubmit = async (e) => {
        e.preventDefault();
        const type = document.getElementById('item-type').value;
        const id = document.getElementById('item-id').value;
        const title = document.getElementById('item-title').value;
        const mType = document.getElementById('item-media-type').value;
        
        let url = document.getElementById('item-url').value;
        const fileInput = document.getElementById('item-file');
        
        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            try {
                url = await readFileAsDataURL(file);
            } catch (err) {
                alert("Error reading file. Please try again.");
                return;
            }
        } else if (!id) {
            // New items must have a file uploaded
            alert("Please upload an image or video file.");
            return;
        }
        
        let desc = "";
        let tags = [];
        let link = "#";
        let status = "deployed";
        
        const descEl = document.getElementById('item-desc');
        const tagsEl = document.getElementById('item-tags');
        const linkEl = document.getElementById('item-link');
        const statusEl = document.getElementById('item-status');

        if (descEl) desc = descEl.value;
        if (tagsEl) tags = tagsEl.value.split(',').map(t => t.trim()).filter(t => t);
        if (linkEl && linkEl.value.trim()) link = linkEl.value.trim();
        if (statusEl) status = statusEl.value;

        const newItem = {
            id: id || Date.now().toString(),
            mediaType: mType,
            mediaUrl: url
        };

        if (type === 'portfolio') {
            newItem.title = title;
            newItem.description = desc;
            newItem.tags = tags;
            newItem.link = link;
            newItem.status = status;
        } else {
            newItem.caption = title;
        }

        const targetArray = type === 'portfolio' ? currentData.projects : currentData.gallery;
        
        if (id) {
            const index = targetArray.findIndex(i => i.id == id);
            targetArray[index] = newItem;
        } else {
            targetArray.push(newItem);
        }

        // Automatically persist changes to local storage
        saveDataToStorage();

        // Re-render lists
        if (type === 'portfolio') {
            renderPortfolioList();
        } else {
            renderGalleryList();
        }

        hideForm();
    };
}

function deleteItem(type, id) {
    if (confirm("Are you sure you want to delete this item?")) {
        const targetKey = type === 'portfolio' ? 'projects' : 'gallery';
        currentData[targetKey] = currentData[targetKey].filter(i => i.id != id);
        
        // Automatically persist changes to local storage
        saveDataToStorage();
        
        // Re-render lists
        if (type === 'portfolio') {
            renderPortfolioList();
        } else {
            renderGalleryList();
        }
    }
}

function editItem(type, id) {
    showForm(type, id);
}

/* ==========================================
   5. Journey Timeline Management View (journey.html)
   ========================================== */
function renderJourneyList() {
    const jList = document.getElementById('journey-list');
    if (!jList) return;

    jList.innerHTML = '';
    currentData.journey.forEach(j => {
        jList.innerHTML += `
            <div class="item-card">
                <div style="padding: 10px 0;">
                    <span class="item-card-date" style="display:inline-block; padding: 4px 10px; background:rgba(59, 130, 246, 0.1); border:1px solid rgba(59, 130, 246, 0.25); border-radius:20px; font-size:0.75rem; font-weight:500; color:var(--clr-accent); margin-bottom: 10px;">
                        ${j.year}
                    </span>
                    <h4 style="margin: 5px 0 10px;">${j.title}</h4>
                    <p>${j.description}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-admin btn-edit" onclick='editJourneyItem("${j.id}")'><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-admin btn-delete" onclick='deleteJourneyItem("${j.id}")'><i class="fas fa-trash-alt"></i> Delete</button>
                </div>
            </div>
        `;
    });
}

function showJourneyForm(id = null) {
    const modal = document.getElementById('journey-modal');
    const form = document.getElementById('journey-admin-form');
    if (!modal || !form) return;

    document.getElementById('journey-id').value = id || '';
    
    if (id) {
        const item = currentData.journey.find(i => i.id == id);
        document.getElementById('journey-year').value = item.year;
        document.getElementById('journey-title').value = item.title;
        document.getElementById('journey-desc').value = item.description;
        
        document.getElementById('journey-form-title').innerText = "Edit Journey Event";
    } else {
        form.reset();
        document.getElementById('journey-form-title').innerText = "Add New Journey Event";
    }

    modal.style.display = 'flex';
}

function hideJourneyForm() {
    const modal = document.getElementById('journey-modal');
    if (modal) modal.style.display = 'none';
}

// Handle Journey Form submit
const journeyAdminForm = document.getElementById('journey-admin-form');
if (journeyAdminForm) {
    journeyAdminForm.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('journey-id').value;
        const year = document.getElementById('journey-year').value.trim();
        const title = document.getElementById('journey-title').value.trim();
        const desc = document.getElementById('journey-desc').value.trim();

        const newItem = {
            id: id || 'j' + Date.now().toString(),
            year: year,
            title: title,
            description: desc
        };

        if (id) {
            const index = currentData.journey.findIndex(i => i.id == id);
            currentData.journey[index] = newItem;
        } else {
            currentData.journey.push(newItem);
        }

        // Automatically persist changes to local storage
        saveDataToStorage();

        renderJourneyList();
        hideJourneyForm();
    };
}

function deleteJourneyItem(id) {
    if (confirm("Are you sure you want to delete this timeline event?")) {
        currentData.journey = currentData.journey.filter(i => i.id != id);
        
        // Automatically persist changes to local storage
        saveDataToStorage();
        
        renderJourneyList();
    }
}

function editJourneyItem(id) {
    showJourneyForm(id);
}

// Profile descriptions load and save functions
function loadProfileFields() {
    const subInput = document.getElementById('profile-home-subtitle');
    const descInput = document.getElementById('profile-home-description');
    const aboutTitleInput = document.getElementById('profile-about-title');
    const aboutP1Input = document.getElementById('profile-about-p1');
    const aboutP2Input = document.getElementById('profile-about-p2');
    const eduTitleInput = document.getElementById('profile-about-education-title');
    const eduP1Input = document.getElementById('profile-about-education-p1');
    const eduP2Input = document.getElementById('profile-about-education-p2');

    if (!currentData.profile) {
        currentData.profile = {};
    }

    if (subInput) subInput.value = currentData.profile.home_subtitle || '';
    if (descInput) descInput.value = currentData.profile.home_description || '';
    if (aboutTitleInput) aboutTitleInput.value = currentData.profile.about_title || '';
    if (aboutP1Input) aboutP1Input.value = currentData.profile.about_p1 || '';
    if (aboutP2Input) aboutP2Input.value = currentData.profile.about_p2 || '';
    if (eduTitleInput) eduTitleInput.value = currentData.profile.about_education_title || '';
    if (eduP1Input) eduP1Input.value = currentData.profile.about_education_p1 || '';
    if (eduP2Input) eduP2Input.value = currentData.profile.about_education_p2 || '';
    
    const skillsTitleInput = document.getElementById('profile-about-skills-title');
    const skillsListInput = document.getElementById('profile-about-skills-list');
    
    if (skillsTitleInput) skillsTitleInput.value = currentData.profile.about_skills_title || '';
    if (skillsListInput && currentData.profile.about_skills_list) {
        document.getElementById('profile-about-skills-list').value = currentData.profile.about_skills_list.join(', ');
    }
}

// ==========================================
// Images Manager Logic
// ==========================================
let tempCarouselImages = [];

function initImagesManager() {
    if (!currentData || !currentData.profile_images) return;
    
    // Bind Hero Image Preview
    const heroPreview = document.getElementById('hero-image-preview');
    if (currentData.profile_images.home_hero) {
        heroPreview.src = `../${currentData.profile_images.home_hero}`;
        heroPreview.style.display = 'block';
    }
    
    // File input change handler for Hero Image
    const heroInput = document.getElementById('image-home-hero');
    heroInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            heroPreview.src = base64;
            heroPreview.style.display = 'block';
        }
    });

    // Copy carousel images to temp array for editing
    tempCarouselImages = [...(currentData.profile_images.about_carousel || [])];
    
    renderCarouselImagesList();

    const form = document.getElementById('images-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            setLoading(btn, true);
            
            try {
                // If a new hero image is selected, upload it
                if (heroInput.files && heroInput.files[0]) {
                    const file = heroInput.files[0];
                    if (file.size > 2 * 1024 * 1024) { // Warn if > 2MB
                        console.warn("Large image selected, it might fail without python server");
                    }
                    const base64 = await fileToBase64(file);
                    
                    const uploadedPath = await uploadImageToServer(file.name, base64);
                    currentData.profile_images.home_hero = uploadedPath;
                }

                currentData.profile_images.about_carousel = [...tempCarouselImages];
                await saveDataToStorage();
                
                const origText = btn.innerHTML;
                btn.style.background = '#10b981';
                btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
                setTimeout(() => {
                    btn.style.background = '';
                    btn.innerHTML = origText;
                }, 2000);
            } catch (err) {
                console.error(err);
                alert('Error saving images.');
            } finally {
                setLoading(btn, false);
            }
        });
    }
}

// Helper to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Helper to upload image to server (removed Python server, just returning Base64)
async function uploadImageToServer(filename, base64Data) {
    return base64Data;
}

function renderCarouselImagesList() {
    const list = document.getElementById('carousel-images-list');
    if (!list) return;

    if (tempCarouselImages.length === 0) {
        list.innerHTML = '<div class="admin-empty">No carousel images. Add some above!</div>';
        return;
    }

    list.innerHTML = tempCarouselImages.map((imgUrl, index) => `
        <div class="admin-list-item" style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: rgba(255,255,255,0.03); margin-bottom: 5px; border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="${imgUrl.startsWith('data:') ? imgUrl : '../' + imgUrl}" alt="Carousel image" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; background: rgba(255,255,255,0.1);">
                <div class="item-title" style="font-family: monospace; font-size: 0.85rem; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${imgUrl.startsWith('data:') ? 'Base64 Image Data' : imgUrl}</div>
            </div>
            <div class="item-actions">
                <button type="button" class="btn-admin btn-delete" onclick="deleteCarouselImage(${index})" title="Delete Image">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

window.handleAddCarouselImage = async function() {
    const input = document.getElementById('new-carousel-image');
    const btn = document.getElementById('btn-add-carousel');
    
    if (input.files && input.files[0]) {
        setLoading(btn, true);
        try {
            const file = input.files[0];
            const base64 = await fileToBase64(file);
            const uploadedPath = await uploadImageToServer(file.name, base64);
            
            tempCarouselImages.push(uploadedPath);
            input.value = '';
            renderCarouselImagesList();
            
            // Auto-save the new carousel image
            currentData.profile_images.about_carousel = [...tempCarouselImages];
            await saveDataToStorage();
            
        } catch(e) {
            console.error(e);
            alert("Failed to upload image. Make sure your Python Server is running.");
        } finally {
            setLoading(btn, false);
        }
    } else {
        alert("Please select an image file first.");
    }
};

window.deleteCarouselImage = function(index) {
    if (confirm('Remove this image from the carousel?')) {
        tempCarouselImages.splice(index, 1);
        renderCarouselImagesList();
    }
};

// Profile Form submit handler
const profileForm = document.getElementById('profile-form');
if (profileForm) {
    profileForm.onsubmit = (e) => {
        e.preventDefault();
        
        if (!currentData.profile) {
            currentData.profile = {};
        }

        currentData.profile.home_subtitle = document.getElementById('profile-home-subtitle').value.trim();
        currentData.profile.home_description = document.getElementById('profile-home-description').value.trim();
        currentData.profile.about_title = document.getElementById('profile-about-title').value.trim();
        currentData.profile.about_p1 = document.getElementById('profile-about-p1').value.trim();
        currentData.profile.about_p2 = document.getElementById('profile-about-p2').value.trim();
        currentData.profile.about_education_title = document.getElementById('profile-about-education-title').value.trim();
        currentData.profile.about_education_p1 = document.getElementById('profile-about-education-p1').value.trim();
        currentData.profile.about_education_p2 = document.getElementById('profile-about-education-p2').value.trim();

        const skillsTitleEl = document.getElementById('profile-about-skills-title');
        const skillsListEl = document.getElementById('profile-about-skills-list');
        
        if (skillsTitleEl) currentData.profile.about_skills_title = skillsTitleEl.value.trim();
        if (skillsListEl) {
            currentData.profile.about_skills_list = skillsListEl.value.split(',').map(s => s.trim()).filter(s => s);
        }

        // Persist to storage
        saveDataToStorage();

        // Show feedback
        const submitBtn = profileForm.querySelector('button[type="submit"]');
        const origText = submitBtn.innerHTML;
        submitBtn.style.background = '#10b981';
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Profile Saved!';
        
        setTimeout(() => {
            submitBtn.style.background = '';
            submitBtn.innerHTML = origText;
        }, 2000);
    };
}


/* ==========================================
   Skills Management View (skills.html)
   ========================================== */
function renderSkillsList() {
    const list = document.getElementById('skills-list');
    if (!list) return;

    list.innerHTML = '';
    currentData.skills.forEach((cat, index) => {
        list.innerHTML += `
            <div class="item-card" style="padding: 20px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <i class="${cat.icon}" style="font-size: 1.5rem; color: var(--clr-primary-light);"></i>
                    <h4 style="margin: 0; font-size: 1.2rem;">${cat.category}</h4>
                </div>
                <div class="skill-tags" style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${cat.items.map(item => `<span class="skill-tag" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 15px; font-size: 0.85rem;"><i class="${item.icon}" style="margin-right: 5px;"></i> ${item.name}</span>`).join('')}
                </div>
                <div class="item-actions">
                    <button class="btn-admin btn-edit" onclick="editSkillCategory('${cat.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-admin btn-delete" onclick="deleteSkillCategory('${cat.id}')"><i class="fas fa-trash-alt"></i> Delete</button>
                </div>
            </div>
        `;
    });
}

function openSkillsModal() {
    const modal = document.getElementById('item-modal');
    if (modal) modal.style.display = 'flex';
}

function closeSkillsModal() {
    const modal = document.getElementById('item-modal');
    if (modal) modal.style.display = 'none';
}

const availableIcons = ["fab fa-500px","fab fa-accessible-icon","fab fa-accusoft","fab fa-acquisitions-incorporated","fas fa-ad","fas fa-address-book","fas fa-address-card","fas fa-adjust","fab fa-adn","fab fa-adversal","fab fa-affiliatetheme","fas fa-air-freshener","fab fa-airbnb","fab fa-algolia","fas fa-align-center","fas fa-align-justify","fas fa-align-left","fas fa-align-right","fab fa-alipay","fas fa-allergies","fab fa-amazon","fab fa-amazon-pay","fas fa-ambulance","fas fa-american-sign-language-interpreting","fab fa-amilia","fas fa-anchor","fab fa-android","fab fa-angellist","fas fa-angle-double-down","fas fa-angle-double-left","fas fa-angle-double-right","fas fa-angle-double-up","fas fa-angle-down","fas fa-angle-left","fas fa-angle-right","fas fa-angle-up","fas fa-angry","fab fa-angrycreative","fab fa-angular","fas fa-ankh","fab fa-app-store","fab fa-app-store-ios","fab fa-apper","fab fa-apple","fas fa-apple-alt","fab fa-apple-pay","fas fa-archive","fas fa-archway","fas fa-arrow-alt-circle-down","fas fa-arrow-alt-circle-left","fas fa-arrow-alt-circle-right","fas fa-arrow-alt-circle-up","fas fa-arrow-circle-down","fas fa-arrow-circle-left","fas fa-arrow-circle-right","fas fa-arrow-circle-up","fas fa-arrow-down","fas fa-arrow-left","fas fa-arrow-right","fas fa-arrow-up","fas fa-arrows-alt","fas fa-arrows-alt-h","fas fa-arrows-alt-v","fab fa-artstation","fas fa-assistive-listening-systems","fas fa-asterisk","fab fa-asymmetrik","fas fa-at","fas fa-atlas","fab fa-atlassian","fas fa-atom","fab fa-audible","fas fa-audio-description","fab fa-autoprefixer","fab fa-avianex","fab fa-aviato","fas fa-award","fab fa-aws","fas fa-baby","fas fa-baby-carriage","fas fa-backspace","fas fa-backward","fas fa-bacon","fas fa-bacteria","fas fa-bacterium","fas fa-bahai","fas fa-balance-scale","fas fa-balance-scale-left","fas fa-balance-scale-right","fas fa-ban","fas fa-band-aid","fab fa-bandcamp","fas fa-barcode","fas fa-bars","fas fa-baseball-ball","fas fa-basketball-ball","fas fa-bath","fas fa-battery-empty","fas fa-battery-full","fas fa-battery-half","fas fa-battery-quarter","fas fa-battery-three-quarters","fab fa-battle-net","fas fa-bed","fas fa-beer","fab fa-behance","fab fa-behance-square","fas fa-bell","fas fa-bell-slash","fas fa-bezier-curve","fas fa-bible","fas fa-bicycle","fas fa-biking","fab fa-bimobject","fas fa-binoculars","fas fa-biohazard","fas fa-birthday-cake","fab fa-bitbucket","fab fa-bitcoin","fab fa-bity","fab fa-black-tie","fab fa-blackberry","fas fa-blender","fas fa-blender-phone","fas fa-blind","fas fa-blog","fab fa-blogger","fab fa-blogger-b","fab fa-bluetooth","fab fa-bluetooth-b","fas fa-bold","fas fa-bolt","fas fa-bomb","fas fa-bone","fas fa-bong","fas fa-book","fas fa-book-dead","fas fa-book-medical","fas fa-book-open","fas fa-book-reader","fas fa-bookmark","fab fa-bootstrap","fas fa-border-all","fas fa-border-none","fas fa-border-style","fas fa-bowling-ball","fas fa-box","fas fa-box-open","fas fa-box-tissue","fas fa-boxes","fas fa-braille","fas fa-brain","fas fa-bread-slice","fas fa-briefcase","fas fa-briefcase-medical","fas fa-broadcast-tower","fas fa-broom","fas fa-brush","fab fa-btc","fab fa-buffer","fas fa-bug","fas fa-building","fas fa-bullhorn","fas fa-bullseye","fas fa-burn","fab fa-buromobelexperte","fas fa-bus","fas fa-bus-alt","fas fa-business-time","fab fa-buy-n-large","fab fa-buysellads","fas fa-calculator","fas fa-calendar","fas fa-calendar-alt","fas fa-calendar-check","fas fa-calendar-day","fas fa-calendar-minus","fas fa-calendar-plus","fas fa-calendar-times","fas fa-calendar-week","fas fa-camera","fas fa-camera-retro","fas fa-campground","fab fa-canadian-maple-leaf","fas fa-candy-cane","fas fa-cannabis","fas fa-capsules","fas fa-car","fas fa-car-alt","fas fa-car-battery","fas fa-car-crash","fas fa-car-side","fas fa-caravan","fas fa-caret-down","fas fa-caret-left","fas fa-caret-right","fas fa-caret-square-down","fas fa-caret-square-left","fas fa-caret-square-right","fas fa-caret-square-up","fas fa-caret-up","fas fa-carrot","fas fa-cart-arrow-down","fas fa-cart-plus","fas fa-cash-register","fas fa-cat","fab fa-cc-amazon-pay","fab fa-cc-amex","fab fa-cc-apple-pay","fab fa-cc-diners-club","fab fa-cc-discover","fab fa-cc-jcb","fab fa-cc-mastercard","fab fa-cc-paypal","fab fa-cc-stripe","fab fa-cc-visa","fab fa-centercode","fab fa-centos","fas fa-certificate","fas fa-chair","fas fa-chalkboard","fas fa-chalkboard-teacher","fas fa-charging-station","fas fa-chart-area","fas fa-chart-bar","fas fa-chart-line","fas fa-chart-pie","fas fa-check","fas fa-check-circle","fas fa-check-double","fas fa-check-square","fas fa-cheese","fas fa-chess","fas fa-chess-bishop","fas fa-chess-board","fas fa-chess-king","fas fa-chess-knight","fas fa-chess-pawn","fas fa-chess-queen","fas fa-chess-rook","fas fa-chevron-circle-down","fas fa-chevron-circle-left","fas fa-chevron-circle-right","fas fa-chevron-circle-up","fas fa-chevron-down","fas fa-chevron-left","fas fa-chevron-right","fas fa-chevron-up","fas fa-child","fab fa-chrome","fab fa-chromecast","fas fa-church","fas fa-circle","fas fa-circle-notch","fas fa-city","fas fa-clinic-medical","fas fa-clipboard","fas fa-clipboard-check","fas fa-clipboard-list","fas fa-clock","fas fa-clone","fas fa-closed-captioning","fas fa-cloud","fas fa-cloud-download-alt","fas fa-cloud-meatball","fas fa-cloud-moon","fas fa-cloud-moon-rain","fas fa-cloud-rain","fas fa-cloud-showers-heavy","fas fa-cloud-sun","fas fa-cloud-sun-rain","fas fa-cloud-upload-alt","fab fa-cloudflare","fab fa-cloudscale","fab fa-cloudsmith","fab fa-cloudversify","fas fa-cocktail","fas fa-code","fas fa-code-branch","fab fa-codepen","fab fa-codiepie","fas fa-coffee","fas fa-cog","fas fa-cogs","fas fa-coins","fas fa-columns","fas fa-comment","fas fa-comment-alt","fas fa-comment-dollar","fas fa-comment-dots","fas fa-comment-medical","fas fa-comment-slash","fas fa-comments","fas fa-comments-dollar","fas fa-compact-disc","fas fa-compass","fas fa-compress","fas fa-compress-alt","fas fa-compress-arrows-alt","fas fa-concierge-bell","fab fa-confluence","fab fa-connectdevelop","fab fa-contao","fas fa-cookie","fas fa-cookie-bite","fas fa-copy","fas fa-copyright","fab fa-cotton-bureau","fas fa-couch","fab fa-cpanel","fab fa-creative-commons","fab fa-creative-commons-by","fab fa-creative-commons-nc","fab fa-creative-commons-nc-eu","fab fa-creative-commons-nc-jp","fab fa-creative-commons-nd","fab fa-creative-commons-pd","fab fa-creative-commons-pd-alt","fab fa-creative-commons-remix","fab fa-creative-commons-sa","fab fa-creative-commons-sampling","fab fa-creative-commons-sampling-plus","fab fa-creative-commons-share","fab fa-creative-commons-zero","fas fa-credit-card","fab fa-critical-role","fas fa-crop","fas fa-crop-alt","fas fa-cross","fas fa-crosshairs","fas fa-crow","fas fa-crown","fas fa-crutch","fab fa-css3","fab fa-css3-alt","fas fa-cube","fas fa-cubes","fas fa-cut","fab fa-cuttlefish","fab fa-d-and-d","fab fa-d-and-d-beyond","fab fa-dailymotion","fab fa-dashcube","fas fa-database","fas fa-deaf","fab fa-deezer","fab fa-delicious","fas fa-democrat","fab fa-deploydog","fab fa-deskpro","fas fa-desktop","fab fa-dev","fab fa-deviantart","fas fa-dharmachakra","fab fa-dhl","fas fa-diagnoses","fab fa-diaspora","fas fa-dice","fas fa-dice-d20","fas fa-dice-d6","fas fa-dice-five","fas fa-dice-four","fas fa-dice-one","fas fa-dice-six","fas fa-dice-three","fas fa-dice-two","fab fa-digg","fab fa-digital-ocean","fas fa-digital-tachograph","fas fa-directions","fab fa-discord","fab fa-discourse","fas fa-disease","fas fa-divide","fas fa-dizzy","fas fa-dna","fab fa-dochub","fab fa-docker","fas fa-dog","fas fa-dollar-sign","fas fa-dolly","fas fa-dolly-flatbed","fas fa-donate","fas fa-door-closed","fas fa-door-open","fas fa-dot-circle","fas fa-dove","fas fa-download","fab fa-draft2digital","fas fa-drafting-compass","fas fa-dragon","fas fa-draw-polygon","fab fa-dribbble","fab fa-dribbble-square","fab fa-dropbox","fas fa-drum","fas fa-drum-steelpan","fas fa-drumstick-bite","fab fa-drupal","fas fa-dumbbell","fas fa-dumpster","fas fa-dumpster-fire","fas fa-dungeon","fab fa-dyalog","fab fa-earlybirds","fab fa-ebay","fab fa-edge","fab fa-edge-legacy","fas fa-edit","fas fa-egg","fas fa-eject","fab fa-elementor","fas fa-ellipsis-h","fas fa-ellipsis-v","fab fa-ello","fab fa-ember","fab fa-empire","fas fa-envelope","fas fa-envelope-open","fas fa-envelope-open-text","fas fa-envelope-square","fab fa-envira","fas fa-equals","fas fa-eraser","fab fa-erlang","fab fa-ethereum","fas fa-ethernet","fab fa-etsy","fas fa-euro-sign","fab fa-evernote","fas fa-exchange-alt","fas fa-exclamation","fas fa-exclamation-circle","fas fa-exclamation-triangle","fas fa-expand","fas fa-expand-alt","fas fa-expand-arrows-alt","fab fa-expeditedssl","fas fa-external-link-alt","fas fa-external-link-square-alt","fas fa-eye","fas fa-eye-dropper","fas fa-eye-slash","fab fa-facebook","fab fa-facebook-f","fab fa-facebook-messenger","fab fa-facebook-square","fas fa-fan","fab fa-fantasy-flight-games","fas fa-fast-backward","fas fa-fast-forward","fas fa-faucet","fas fa-fax","fas fa-feather","fas fa-feather-alt","fab fa-fedex","fab fa-fedora","fas fa-female","fas fa-fighter-jet","fab fa-figma","fas fa-file","fas fa-file-alt","fas fa-file-archive","fas fa-file-audio","fas fa-file-code","fas fa-file-contract","fas fa-file-csv","fas fa-file-download","fas fa-file-excel","fas fa-file-export","fas fa-file-image","fas fa-file-import","fas fa-file-invoice","fas fa-file-invoice-dollar","fas fa-file-medical","fas fa-file-medical-alt","fas fa-file-pdf","fas fa-file-powerpoint","fas fa-file-prescription","fas fa-file-signature","fas fa-file-upload","fas fa-file-video","fas fa-file-word","fas fa-fill","fas fa-fill-drip","fas fa-film","fas fa-filter","fas fa-fingerprint","fas fa-fire","fas fa-fire-alt","fas fa-fire-extinguisher","fab fa-firefox","fab fa-firefox-browser","fas fa-first-aid","fab fa-first-order","fab fa-first-order-alt","fab fa-firstdraft","fas fa-fish","fas fa-fist-raised","fas fa-flag","fas fa-flag-checkered","fas fa-flag-usa","fas fa-flask","fab fa-flickr","fab fa-flipboard","fas fa-flushed","fab fa-fly","fas fa-folder","fas fa-folder-minus","fas fa-folder-open","fas fa-folder-plus","fas fa-font","fab fa-font-awesome","fab fa-font-awesome-alt","fab fa-font-awesome-flag","fab fa-font-awesome-logo-full","fab fa-fonticons","fab fa-fonticons-fi","fas fa-football-ball","fab fa-fort-awesome","fab fa-fort-awesome-alt","fab fa-forumbee","fas fa-forward","fab fa-foursquare","fab fa-free-code-camp","fab fa-freebsd","fas fa-frog","fas fa-frown","fas fa-frown-open","fab fa-fulcrum","fas fa-funnel-dollar","fas fa-futbol","fab fa-galactic-republic","fab fa-galactic-senate","fas fa-gamepad","fas fa-gas-pump","fas fa-gavel","fas fa-gem","fas fa-genderless","fab fa-get-pocket","fab fa-gg","fab fa-gg-circle","fas fa-ghost","fas fa-gift","fas fa-gifts","fab fa-git","fab fa-git-alt","fab fa-git-square","fab fa-github","fab fa-github-alt","fab fa-github-square","fab fa-gitkraken","fab fa-gitlab","fab fa-gitter","fas fa-glass-cheers","fas fa-glass-martini","fas fa-glass-martini-alt","fas fa-glass-whiskey","fas fa-glasses","fab fa-glide","fab fa-glide-g","fas fa-globe","fas fa-globe-africa","fas fa-globe-americas","fas fa-globe-asia","fas fa-globe-europe","fab fa-gofore","fas fa-golf-ball","fab fa-goodreads","fab fa-goodreads-g","fab fa-google","fab fa-google-drive","fab fa-google-pay","fab fa-google-play","fab fa-google-plus","fab fa-google-plus-g","fab fa-google-plus-square","fab fa-google-wallet","fas fa-gopuram","fas fa-graduation-cap","fab fa-gratipay","fab fa-grav","fas fa-greater-than","fas fa-greater-than-equal","fas fa-grimace","fas fa-grin","fas fa-grin-alt","fas fa-grin-beam","fas fa-grin-beam-sweat","fas fa-grin-hearts","fas fa-grin-squint","fas fa-grin-squint-tears","fas fa-grin-stars","fas fa-grin-tears","fas fa-grin-tongue","fas fa-grin-tongue-squint","fas fa-grin-tongue-wink","fas fa-grin-wink","fas fa-grip-horizontal","fas fa-grip-lines","fas fa-grip-lines-vertical","fas fa-grip-vertical","fab fa-gripfire","fab fa-grunt","fab fa-guilded","fas fa-guitar","fab fa-gulp","fas fa-h-square","fab fa-hacker-news","fab fa-hacker-news-square","fab fa-hackerrank","fas fa-hamburger","fas fa-hammer","fas fa-hamsa","fas fa-hand-holding","fas fa-hand-holding-heart","fas fa-hand-holding-medical","fas fa-hand-holding-usd","fas fa-hand-holding-water","fas fa-hand-lizard","fas fa-hand-middle-finger","fas fa-hand-paper","fas fa-hand-peace","fas fa-hand-point-down","fas fa-hand-point-left","fas fa-hand-point-right","fas fa-hand-point-up","fas fa-hand-pointer","fas fa-hand-rock","fas fa-hand-scissors","fas fa-hand-sparkles","fas fa-hand-spock","fas fa-hands","fas fa-hands-helping","fas fa-hands-wash","fas fa-handshake","fas fa-handshake-alt-slash","fas fa-handshake-slash","fas fa-hanukiah","fas fa-hard-hat","fas fa-hashtag","fas fa-hat-cowboy","fas fa-hat-cowboy-side","fas fa-hat-wizard","fas fa-hdd","fas fa-head-side-cough","fas fa-head-side-cough-slash","fas fa-head-side-mask","fas fa-head-side-virus","fas fa-heading","fas fa-headphones","fas fa-headphones-alt","fas fa-headset","fas fa-heart","fas fa-heart-broken","fas fa-heartbeat","fas fa-helicopter","fas fa-highlighter","fas fa-hiking","fas fa-hippo","fab fa-hips","fab fa-hire-a-helper","fas fa-history","fab fa-hive","fas fa-hockey-puck","fas fa-holly-berry","fas fa-home","fab fa-hooli","fab fa-hornbill","fas fa-horse","fas fa-horse-head","fas fa-hospital","fas fa-hospital-alt","fas fa-hospital-symbol","fas fa-hospital-user","fas fa-hot-tub","fas fa-hotdog","fas fa-hotel","fab fa-hotjar","fas fa-hourglass","fas fa-hourglass-end","fas fa-hourglass-half","fas fa-hourglass-start","fas fa-house-damage","fas fa-house-user","fab fa-houzz","fas fa-hryvnia","fab fa-html5","fab fa-hubspot","fas fa-i-cursor","fas fa-ice-cream","fas fa-icicles","fas fa-icons","fas fa-id-badge","fas fa-id-card","fas fa-id-card-alt","fab fa-ideal","fas fa-igloo","fas fa-image","fas fa-images","fab fa-imdb","fas fa-inbox","fas fa-indent","fas fa-industry","fas fa-infinity","fas fa-info","fas fa-info-circle","fab fa-innosoft","fab fa-instagram","fab fa-instagram-square","fab fa-instalod","fab fa-intercom","fab fa-internet-explorer","fab fa-invision","fab fa-ioxhost","fas fa-italic","fab fa-itch-io","fab fa-itunes","fab fa-itunes-note","fab fa-java","fas fa-jedi","fab fa-jedi-order","fab fa-jenkins","fab fa-jira","fab fa-joget","fas fa-joint","fab fa-joomla","fas fa-journal-whills","fab fa-js","fab fa-js-square","fab fa-jsfiddle","fas fa-kaaba","fab fa-kaggle","fas fa-key","fab fa-keybase","fas fa-keyboard","fab fa-keycdn","fas fa-khanda","fab fa-kickstarter","fab fa-kickstarter-k","fas fa-kiss","fas fa-kiss-beam","fas fa-kiss-wink-heart","fas fa-kiwi-bird","fab fa-korvue","fas fa-landmark","fas fa-language","fas fa-laptop","fas fa-laptop-code","fas fa-laptop-house","fas fa-laptop-medical","fab fa-laravel","fab fa-lastfm","fab fa-lastfm-square","fas fa-laugh","fas fa-laugh-beam","fas fa-laugh-squint","fas fa-laugh-wink","fas fa-layer-group","fas fa-leaf","fab fa-leanpub","fas fa-lemon","fab fa-less","fas fa-less-than","fas fa-less-than-equal","fas fa-level-down-alt","fas fa-level-up-alt","fas fa-life-ring","fas fa-lightbulb","fab fa-line","fas fa-link","fab fa-linkedin","fab fa-linkedin-in","fab fa-linode","fab fa-linux","fas fa-lira-sign","fas fa-list","fas fa-list-alt","fas fa-list-ol","fas fa-list-ul","fas fa-location-arrow","fas fa-lock","fas fa-lock-open","fas fa-long-arrow-alt-down","fas fa-long-arrow-alt-left","fas fa-long-arrow-alt-right","fas fa-long-arrow-alt-up","fas fa-low-vision","fas fa-luggage-cart","fas fa-lungs","fas fa-lungs-virus","fab fa-lyft","fab fa-magento","fas fa-magic","fas fa-magnet","fas fa-mail-bulk","fab fa-mailchimp","fas fa-male","fab fa-mandalorian","fas fa-map","fas fa-map-marked","fas fa-map-marked-alt","fas fa-map-marker","fas fa-map-marker-alt","fas fa-map-pin","fas fa-map-signs","fab fa-markdown","fas fa-marker","fas fa-mars","fas fa-mars-double","fas fa-mars-stroke","fas fa-mars-stroke-h","fas fa-mars-stroke-v","fas fa-mask","fab fa-mastodon","fab fa-maxcdn","fab fa-mdb","fas fa-medal","fab fa-medapps","fab fa-medium","fab fa-medium-m","fas fa-medkit","fab fa-medrt","fab fa-meetup","fab fa-megaport","fas fa-meh","fas fa-meh-blank","fas fa-meh-rolling-eyes","fas fa-memory","fab fa-mendeley","fas fa-menorah","fas fa-mercury","fas fa-meteor","fab fa-microblog","fas fa-microchip","fas fa-microphone","fas fa-microphone-alt","fas fa-microphone-alt-slash","fas fa-microphone-slash","fas fa-microscope","fab fa-microsoft","fas fa-minus","fas fa-minus-circle","fas fa-minus-square","fas fa-mitten","fab fa-mix","fab fa-mixcloud","fab fa-mixer","fab fa-mizuni","fas fa-mobile","fas fa-mobile-alt","fab fa-modx","fab fa-monero","fas fa-money-bill","fas fa-money-bill-alt","fas fa-money-bill-wave","fas fa-money-bill-wave-alt","fas fa-money-check","fas fa-money-check-alt","fas fa-monument","fas fa-moon","fas fa-mortar-pestle","fas fa-mosque","fas fa-motorcycle","fas fa-mountain","fas fa-mouse","fas fa-mouse-pointer","fas fa-mug-hot","fas fa-music","fab fa-napster","fab fa-neos","fas fa-network-wired","fas fa-neuter","fas fa-newspaper","fab fa-nimblr","fab fa-node","fab fa-node-js","fas fa-not-equal","fas fa-notes-medical","fab fa-npm","fab fa-ns8","fab fa-nutritionix","fas fa-object-group","fas fa-object-ungroup","fab fa-octopus-deploy","fab fa-odnoklassniki","fab fa-odnoklassniki-square","fas fa-oil-can","fab fa-old-republic","fas fa-om","fab fa-opencart","fab fa-openid","fab fa-opera","fab fa-optin-monster","fab fa-orcid","fab fa-osi","fas fa-otter","fas fa-outdent","fab fa-page4","fab fa-pagelines","fas fa-pager","fas fa-paint-brush","fas fa-paint-roller","fas fa-palette","fab fa-palfed","fas fa-pallet","fas fa-paper-plane","fas fa-paperclip","fas fa-parachute-box","fas fa-paragraph","fas fa-parking","fas fa-passport","fas fa-pastafarianism","fas fa-paste","fab fa-patreon","fas fa-pause","fas fa-pause-circle","fas fa-paw","fab fa-paypal","fas fa-peace","fas fa-pen","fas fa-pen-alt","fas fa-pen-fancy","fas fa-pen-nib","fas fa-pen-square","fas fa-pencil-alt","fas fa-pencil-ruler","fab fa-penny-arcade","fas fa-people-arrows","fas fa-people-carry","fas fa-pepper-hot","fab fa-perbyte","fas fa-percent","fas fa-percentage","fab fa-periscope","fas fa-person-booth","fab fa-phabricator","fab fa-phoenix-framework","fab fa-phoenix-squadron","fas fa-phone","fas fa-phone-alt","fas fa-phone-slash","fas fa-phone-square","fas fa-phone-square-alt","fas fa-phone-volume","fas fa-photo-video","fab fa-php","fab fa-pied-piper","fab fa-pied-piper-alt","fab fa-pied-piper-hat","fab fa-pied-piper-pp","fab fa-pied-piper-square","fas fa-piggy-bank","fas fa-pills","fab fa-pinterest","fab fa-pinterest-p","fab fa-pinterest-square","fas fa-pizza-slice","fas fa-place-of-worship","fas fa-plane","fas fa-plane-arrival","fas fa-plane-departure","fas fa-plane-slash","fas fa-play","fas fa-play-circle","fab fa-playstation","fas fa-plug","fas fa-plus","fas fa-plus-circle","fas fa-plus-square","fas fa-podcast","fas fa-poll","fas fa-poll-h","fas fa-poo","fas fa-poo-storm","fas fa-poop","fas fa-portrait","fas fa-pound-sign","fas fa-power-off","fas fa-pray","fas fa-praying-hands","fas fa-prescription","fas fa-prescription-bottle","fas fa-prescription-bottle-alt","fas fa-print","fas fa-procedures","fab fa-product-hunt","fas fa-project-diagram","fas fa-pump-medical","fas fa-pump-soap","fab fa-pushed","fas fa-puzzle-piece","fab fa-python","fab fa-qq","fas fa-qrcode","fas fa-question","fas fa-question-circle","fas fa-quidditch","fab fa-quinscape","fab fa-quora"];

let targetIconInputId = '';
let targetPreviewId = '';

window.openIconPicker = function(inputId, previewId) {
    targetIconInputId = inputId;
    targetPreviewId = previewId;
    
    renderIconGrid(availableIcons);
    document.getElementById('icon-search').value = '';
    document.getElementById('icon-picker-modal').style.display = 'flex';
};

window.closeIconPicker = function() {
    document.getElementById('icon-picker-modal').style.display = 'none';
};

window.renderIconGrid = function(icons) {
    const grid = document.getElementById('icon-grid');
    grid.innerHTML = icons.map(icon => `
        <button type="button" onclick="selectIcon('${icon}')" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; transition: background 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.5)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'" title="${icon}">
            <i class="${icon}" style="font-size: 1.4rem;"></i>
        </button>
    `).join('');
};

window.selectIcon = function(iconClass) {
    document.getElementById(targetIconInputId).value = iconClass;
    document.getElementById(targetPreviewId).innerHTML = '<i class="' + iconClass + '"></i>';
    closeIconPicker();
};

window.filterIcons = function() {
    const query = document.getElementById('icon-search').value.toLowerCase();
    const filtered = availableIcons.filter(icon => icon.toLowerCase().includes(query));
    renderIconGrid(filtered);
};

let tempCategoryItems = [];

window.addNewSkillCategory = function() {
    document.getElementById('modal-title').innerText = 'Add New Skill Category';
    document.getElementById('skill-id').value = '';
    document.getElementById('skill-category').value = '';
    document.getElementById('skill-icon').value = 'fas fa-star';
    document.getElementById('category-icon-preview').innerHTML = '<i class="fas fa-star"></i>';
    
    document.getElementById('new-skill-name').value = '';
    document.getElementById('new-skill-icon').value = '';
    document.getElementById('item-icon-preview').innerHTML = '<i class="fas fa-star"></i>';
    
    tempCategoryItems = [];
    renderTempSkillItems();
    openSkillsModal();
};

window.editSkillCategory = function(id) {
    const cat = currentData.skills.find(c => c.id === id);
    if (!cat) return;

    document.getElementById('modal-title').innerText = 'Edit Skill Category';
    document.getElementById('skill-id').value = cat.id;
    document.getElementById('skill-category').value = cat.category;
    document.getElementById('skill-icon').value = cat.icon;
    document.getElementById('category-icon-preview').innerHTML = '<i class="' + cat.icon + '"></i>';
    
    document.getElementById('new-skill-name').value = '';
    document.getElementById('new-skill-icon').value = '';
    document.getElementById('item-icon-preview').innerHTML = '<i class="fas fa-star"></i>';
    
    // Deep copy items
    tempCategoryItems = JSON.parse(JSON.stringify(cat.items));
    renderTempSkillItems();
    openSkillsModal();
};

window.deleteSkillCategory = function(id) {
    if (confirm("Are you sure you want to delete this skill category and all its items?")) {
        currentData.skills = currentData.skills.filter(c => c.id !== id);
        saveDataToStorage();
        renderSkillsList();
    }
};

function renderTempSkillItems() {
    const container = document.getElementById('temp-skill-items-container');
    if (!container) return;
    
    if (tempCategoryItems.length === 0) {
        container.innerHTML = '<div style="color: var(--clr-text-muted); font-size: 0.9rem;">No skills added yet.</div>';
        return;
    }

    container.innerHTML = tempCategoryItems.map((item, index) => `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px;">
            <i class="${item.icon}" style="width: 20px; text-align: center; color: var(--clr-primary-light);"></i>
            <span style="flex: 1;">${item.name}</span>
            <button type="button" class="btn-admin btn-delete" onclick="removeTempSkillItem(${index})" style="padding: 4px 8px; font-size: 0.8rem;"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

window.addTempSkillItem = function() {
    const nameInput = document.getElementById('new-skill-name');
    const iconInput = document.getElementById('new-skill-icon');
    
    const name = nameInput.value.trim();
    const icon = iconInput.value.trim();
    
    if (!name || !icon) {
        alert('Please provide both a skill name and an icon class (e.g. "fab fa-react").');
        return;
    }
    
    tempCategoryItems.push({ name, icon });
    nameInput.value = '';
    iconInput.value = '';
    document.getElementById('item-icon-preview').innerHTML = '<i class="fas fa-star"></i>';
    renderTempSkillItems();
};

window.removeTempSkillItem = function(index) {
    tempCategoryItems.splice(index, 1);
    renderTempSkillItems();
};

const skillForm = document.getElementById('skill-form');
if (skillForm) {
    skillForm.onsubmit = (e) => {
        e.preventDefault();
        
        const id = document.getElementById('skill-id').value;
        const category = document.getElementById('skill-category').value.trim();
        const icon = document.getElementById('skill-icon').value.trim();
        
        const newCat = {
            id: id || 'cat_' + Date.now(),
            category,
            icon,
            items: tempCategoryItems
        };
        
        if (id) {
            const index = currentData.skills.findIndex(c => c.id === id);
            if (index !== -1) currentData.skills[index] = newCat;
        } else {
            currentData.skills.push(newCat);
        }
        
        saveDataToStorage();
        renderSkillsList();
        closeSkillsModal();
    };
}
