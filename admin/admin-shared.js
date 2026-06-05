// Initialize Theme
(function() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
})();

// Central Admin State
let currentData = { projects: [], gallery: [], journey: [], socials: { github: "", linkedin: "", twitter: "" } };

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
                    </ul>
                </nav>

                <div class="sidebar-footer">
                    <a href="../index.html" class="sidebar-link-btn" target="_blank"><i class="fas fa-external-link-alt"></i> View Site</a>
                    <button class="sidebar-link-btn btn-logout" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Log Out</button>
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
async function loadData() {
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
                
                // Compare timestamps if local data exists
                if (localObj && localObj.last_updated && (!serverData.last_updated || localObj.last_updated > serverData.last_updated)) {
                    console.log("Local storage contains newer edits than server file. Using local storage.");
                    currentData = localObj;
                } else {
                    currentData = serverData;
                    try {
                        localStorage.setItem('portfolio_db', JSON.stringify(currentData));
                    } catch (e) {
                        console.warn("Could not save to LocalStorage.", e);
                    }
                }
                
                // Ensure structures are safe
                if (!currentData.projects) currentData.projects = [];
                if (!currentData.gallery) currentData.gallery = [];
                if (!currentData.journey) currentData.journey = [];
                if (!currentData.socials) currentData.socials = { github: "", linkedin: "", twitter: "" };

                initPageDashboard();
                return;
            }
        } catch (e) {
            console.error("Failed to load data.json from server, falling back to localStorage", e);
        }
    }

    // Non-server env, or server fetch failed: use localObj
    if (localObj) {
        currentData = localObj;
        if (!currentData.projects) currentData.projects = [];
        if (!currentData.gallery) currentData.gallery = [];
        if (!currentData.journey) currentData.journey = [];
        if (!currentData.socials) currentData.socials = { github: "", linkedin: "", twitter: "" };

        initPageDashboard();
        return;
    }

    // Fallback fresh initialization if nothing exists
    try {
        const response = await fetch('../js/data.json?t=' + Date.now());
        currentData = await response.json();
        
        if (!currentData.projects) currentData.projects = [];
        if (!currentData.gallery) currentData.gallery = [];
        if (!currentData.journey) currentData.journey = [];
        if (!currentData.socials) currentData.socials = { github: "", linkedin: "", twitter: "" };

        try {
            localStorage.setItem('portfolio_db', JSON.stringify(currentData));
        } catch (e) {
            console.warn("Could not save to LocalStorage.", e);
        }
        initPageDashboard();
    } catch (e) {
        console.error("No existing data model found. Starting fresh.", e);
        currentData = { 
            projects: [], 
            gallery: [], 
            journey: [],
            socials: { github: "https://github.com", linkedin: "https://linkedin.com", twitter: "https://twitter.com" } 
        };
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

    if (ghInput) ghInput.value = currentData.socials.github || '';
    if (liInput) liInput.value = currentData.socials.linkedin || '';
    if (twInput) twInput.value = currentData.socials.twitter || '';
}

// Save Socials Form handler
const socialsForm = document.getElementById('socials-form');
if (socialsForm) {
    socialsForm.onsubmit = (e) => {
        e.preventDefault();
        
        currentData.socials.github = document.getElementById('social-github').value.trim();
        currentData.socials.linkedin = document.getElementById('social-linkedin').value.trim();
        currentData.socials.twitter = document.getElementById('social-twitter').value.trim();

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


