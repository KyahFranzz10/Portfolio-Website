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
            try {
                await fetch('/api/logout', { method: 'POST' });
            } catch (err) {
                console.warn("Server is offline or unreachable during logout:", err);
            }
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
                        <li><a href="socials.html" class="sidebar-link" id="link-socials"><i class="fas fa-share-alt"></i> Social Profiles</a></li>
                        <li><a href="profile.html" class="sidebar-link" id="link-profile"><i class="fas fa-user-edit"></i> Profile Descriptions</a></li>
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
    if (!data.socials) data.socials = { github: "", linkedin: "", twitter: "", facebook: "" };
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
            about_education_p2: "I thrive on turning complex problems into simple, intuitive, and modern web applications. Currently looking for opportunities to contribute to impactful projects while growing as a developer."
        };
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
    currentData.last_updated = Date.now();
    try {
        localStorage.setItem('portfolio_db', JSON.stringify(currentData));
    } catch (e) {
        console.warn("Could not write updates to LocalStorage.", e);
    }

    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('portfolio_db')
                .update({ data: currentData, last_updated: new Date().toISOString() })
                .eq('id', 1);

            if (error) throw error;
            console.log("Successfully auto-synced changes to Supabase.");
            return;
        } catch (err) {
            console.error("Failed to sync changes to Supabase:", err);
        }
    }

    // Automatically send update to the local dev server if running
    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentData)
        });
        if (response.ok) {
            console.log("Successfully auto-synced changes to js/data.json via dev server.");
        } else {
            console.warn("Failed to auto-sync changes to server. Running in standalone static mode.");
        }
    } catch (err) {
        console.log("Dev server not detected or offline. Running in offline standalone static mode.");
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
    } else if (page === 'profile.html') {
        loadProfileFields();
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
    
    if (sCount) {
        let activeCount = 0;
        if (currentData.socials.github) activeCount++;
        if (currentData.socials.linkedin) activeCount++;
        if (currentData.socials.twitter) activeCount++;
        if (currentData.socials.facebook) activeCount++;
        sCount.innerText = activeCount;
    }
}

/* ==========================================
   2. Portfolio Management View (portfolio.html)
   ========================================== */
function renderPortfolioList() {
    const pList = document.getElementById('portfolio-list');
    if (!pList) return;

    pList.innerHTML = '';
    currentData.projects.forEach(p => {
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
                    <p>${p.description}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-admin btn-edit" onclick='editItem("portfolio", "${p.id}")'><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-admin btn-delete" onclick='deleteItem("portfolio", "${p.id}")'><i class="fas fa-trash-alt"></i> Delete</button>
                </div>
            </div>
        `;
    });
}

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
}

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


