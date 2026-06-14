document.addEventListener('DOMContentLoaded', () => {
    /* ==========================================
       Dynamic Component Loader
       ========================================== */
    async function loadComponent(placeholderId, htmlPath, cssPath, jsPath) {
        const placeholder = document.getElementById(placeholderId);
        if (!placeholder) return;

        try {
            // Load and apply CSS stylesheet first
            if (cssPath) {
                const linkId = `css-${placeholderId}`;
                if (!document.getElementById(linkId)) {
                    const link = document.createElement('link');
                    link.id = linkId;
                    link.rel = 'stylesheet';
                    link.href = cssPath;
                    document.head.appendChild(link);
                }
            }

            // Load and inject HTML
            const response = await fetch(htmlPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const html = await response.text();
            
            // Replaces placeholder with HTML
            placeholder.outerHTML = html;

            // Load and run JS script
            if (jsPath) {
                const scriptId = `js-${placeholderId}`;
                if (!document.getElementById(scriptId)) {
                    const script = document.createElement('script');
                    script.id = scriptId;
                    script.src = jsPath;
                    script.defer = true;
                    document.body.appendChild(script);
                }
            }
        } catch (error) {
            console.error(`Error loading component from ${htmlPath}:`, error);
        }
    }

    // Sequential component loading
    async function initLayout() {
        await loadComponent('header-placeholder', 'module/header.html', 'module/header.css', 'module/header.js');
        await loadComponent('sidebar-placeholder', 'module/sidebar.html', 'module/sidebar.css', 'module/sidebar.js');
        await loadComponent('footer-placeholder', 'module/footer.html', 'module/footer.css', 'module/footer.js');
        
        // Trigger reveal observer for modules once loaded
        if (typeof window.initReveal === 'function') {
            window.initReveal();
        }
    }

    /* ==========================================
       Custom Cursor Logic (Desktop Only)
       ========================================== */
    const initCustomCursor = () => {
        if (window.matchMedia("(pointer: fine)").matches) {
            const cursorDot = document.createElement('div');
            cursorDot.className = 'custom-cursor-dot';
            const cursorOutline = document.createElement('div');
            cursorOutline.className = 'custom-cursor-outline';
            document.body.appendChild(cursorDot);
            document.body.appendChild(cursorOutline);

            let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
            let outlineX = mouseX, outlineY = mouseY;

            window.addEventListener('mousemove', (e) => {
                mouseX = e.clientX;
                mouseY = e.clientY;
                cursorDot.style.transform = `translate(calc(${mouseX}px - 50%), calc(${mouseY}px - 50%))`;
            });

            const animateCursor = () => {
                let easing = 0.15;
                outlineX += (mouseX - outlineX) * easing;
                outlineY += (mouseY - outlineY) * easing;
                cursorOutline.style.transform = `translate(calc(${outlineX}px - 50%), calc(${outlineY}px - 50%))`;
                requestAnimationFrame(animateCursor);
            };
            animateCursor();

            document.addEventListener('mouseover', (e) => {
                if (e.target.closest('a, button, .chip, .chatbot-toggle, .close-toggle, .menu-toggle, .theme-toggle, input, textarea')) {
                    cursorOutline.classList.add('hover');
                }
            });
            document.addEventListener('mouseout', (e) => {
                if (e.target.closest('a, button, .chip, .chatbot-toggle, .close-toggle, .menu-toggle, .theme-toggle, input, textarea')) {
                    cursorOutline.classList.remove('hover');
                }
            });
        }
    };

    /* ==========================================
       Reveal on Scroll (Intersection Observer)
       ========================================== */
    window.initReveal = () => {
        const revealElements = document.querySelectorAll('.reveal:not(.reveal-visible)');
        
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        revealElements.forEach(el => revealObserver.observe(el));
    };

    /* ==========================================
       Chatbot Logic
       ========================================== */
    const initChatbot = () => {
        if (!document.getElementById('chatbot-container')) {
            const chatbotHTML = `
            <div class="chatbot-container" id="chatbot-container">
                <div class="chatbot-toggle" id="chatbot-toggle">
                    <i class="fas fa-comment-dots"></i>
                </div>
                <div class="chatbot-window" id="chatbot-window">
                    <div class="chatbot-header">
                        <div class="cb-header-title">
                            <div class="cb-avatar"><i class="fas fa-robot"></i></div>
                            <div>
                                <h4>Franzz</h4>
                                <span class="cb-status">Online</span>
                            </div>
                        </div>
                        <div class="chatbot-actions">
                            <div class="chatbot-clear" id="chatbot-clear" title="Clear Chat"><i class="fas fa-trash-alt"></i></div>
                            <div class="chatbot-close" id="chatbot-close"><i class="fas fa-times"></i></div>
                        </div>
                    </div>
                    <div class="chatbot-body" id="chatbot-body">
                        <div class="typing-indicator" id="chatbot-typing">
                            <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
                        </div>
                    </div>
                    <div class="chatbot-input">
                        <input type="text" id="chatbot-input-field" placeholder="Type a message..." autocomplete="off">
                        <button id="chatbot-send-btn"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', chatbotHTML);

            const cbToggle = document.getElementById('chatbot-toggle');
            const cbWindow = document.getElementById('chatbot-window');
            const cbClose = document.getElementById('chatbot-close');
            const cbClear = document.getElementById('chatbot-clear');
            const cbBody = document.getElementById('chatbot-body');
            const cbInput = document.getElementById('chatbot-input-field');
            const cbSend = document.getElementById('chatbot-send-btn');
            const cbTyping = document.getElementById('chatbot-typing');

            // Toggle logic
            cbToggle.addEventListener('click', () => { 
                cbWindow.classList.toggle('active'); 
                if(cbWindow.classList.contains('active')) {
                    setTimeout(() => cbInput.focus(), 100);
                }
            });
            cbClose.addEventListener('click', () => { cbWindow.classList.remove('active'); });

            // History management
            const STORAGE_KEY = 'jhon_chatbot_history';
            
            function formatTime() {
                const d = new Date();
                let hours = d.getHours();
                let minutes = d.getMinutes();
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12; 
                minutes = minutes < 10 ? '0'+minutes : minutes;
                return hours + ':' + minutes + ' ' + ampm;
            }

            function saveHistory() {
                const messages = [];
                const msgs = Array.from(cbBody.querySelectorAll('.chat-msg-wrapper')).slice(-20);
                msgs.forEach(w => {
                    const msgEl = w.querySelector('.chat-msg');
                    const isBot = msgEl.classList.contains('bot-msg');
                    
                    const clonedMsg = msgEl.cloneNode(true);
                    const chipsDiv = clonedMsg.querySelector('.chat-chips');
                    if(chipsDiv) chipsDiv.remove();
                    
                    messages.push({
                        text: clonedMsg.innerHTML,
                        sender: isBot ? 'bot' : 'user',
                        time: w.querySelector('.chat-msg-time').innerText
                    });
                });
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
            }

            function addMessage(text, sender, chips = [], time = formatTime(), save = true) {
                const wrapper = document.createElement('div');
                wrapper.classList.add('chat-msg-wrapper', sender === 'bot' ? 'bot-msg-wrapper' : 'user-msg-wrapper');

                const msg = document.createElement('div');
                msg.classList.add('chat-msg', sender === 'bot' ? 'bot-msg' : 'user-msg');
                msg.innerHTML = text;
                
                if (chips && chips.length > 0) {
                    const chipsDiv = document.createElement('div');
                    chipsDiv.className = 'chat-chips';
                    chips.forEach(chipText => {
                        const chip = document.createElement('span');
                        chip.className = 'chip';
                        chip.innerHTML = chipText;
                        const plainText = chip.textContent;
                        chip.onclick = () => { cbInput.value = plainText; handleSend(); };
                        chipsDiv.appendChild(chip);
                    });
                    msg.appendChild(chipsDiv);
                }

                const timeEl = document.createElement('span');
                timeEl.className = 'chat-msg-time';
                timeEl.innerText = time;

                wrapper.appendChild(msg);
                wrapper.appendChild(timeEl);

                cbBody.insertBefore(wrapper, cbTyping);
                cbBody.scrollTop = cbBody.scrollHeight;

                if(save) saveHistory();
            }

            function loadHistory() {
                const history = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
                if (history.length === 0) {
                    // Initial Greeting
                    addMessage(
                        "Hi there! 👋 I'm Franzz, a simple pre-programmed widget (not a literal AI bot, just a fun way to explore my site 😅). I can answer questions about my skills, projects, and contact info. What would you like to know?",
                        'bot',
                        ["Skills", "Projects", "Contact"]
                    );
                } else {
                    history.forEach(m => addMessage(m.text, m.sender, [], m.time, false));
                }
            }

            cbClear.addEventListener('click', () => {
                sessionStorage.removeItem(STORAGE_KEY);
                const msgs = cbBody.querySelectorAll('.chat-msg-wrapper');
                msgs.forEach(m => m.remove());
                loadHistory(); 
            });

            async function botReply(userText) {
                cbTyping.classList.add('active');
                cbBody.scrollTop = cbBody.scrollHeight;

                const txt = userText.toLowerCase();
                let responseText = "I'm not quite sure about that! Try asking about my <br><strong>skills</strong>, <strong>projects</strong>, or <strong>education</strong>.";
                let responseChips = ["Skills", "Projects", "About Me", "Contact"];

                try {
                    const data = typeof window.getPortfolioData === 'function' ? await window.getPortfolioData() : {};
                    
                    if (txt.includes('skill') || txt.includes('tech') || txt.includes('stack') || txt.includes('language')) {
                        responseText = "I am highly skilled in Frontend (HTML, CSS, JS, React), Backend/Systems (Node.js, Python, PHP/Laravel, C, C++, C#), Mobile Development (Dart, Flutter), Databases and Hosting (MySQL, Firebase, Supabase, Hostinger), Workflow Automation (n8n), and also experienced in productivity/creative tools like Microsoft Office, Adobe Suite, and OBS Studio.";
                        responseChips = ["Show Projects", "About Me"];
                    } else if (txt.includes('project') || txt.includes('work') || txt.includes('portfolio') || txt.includes('built') || txt.includes('made') || txt.includes('experience')) {
                        const projects = data.projects || [];
                        if(projects.length > 0) {
                            const projectNames = projects.slice(0, 3).map(p => `<strong>${p.title}</strong>`).join(', ');
                            responseText = `Some of my recent projects include: ${projectNames}. You can see them all in the <a href="portfolio.html">Portfolio</a> section!`;
                        } else {
                            responseText = "I've developed an E-commerce App, an interactive Data Dashboard, and an Inventory System. Check out my <a href='portfolio.html'>Portfolio page</a>!";
                        }
                        responseChips = ["Skills", "Education"];
                    } else if (txt.includes('about') || txt.includes('who') || txt.includes('background') || txt.includes('education') || txt.includes('study')) {
                        responseText = data.profile?.about_p1 || "I am a graduating IT student specializing in full-stack development. I love turning complex problems into beautiful web apps.";
                        responseChips = ["Skills", "Contact"];
                    } else if (txt.includes('contact') || txt.includes('email') || txt.includes('phone') || txt.includes('reach') || txt.includes('hire')) {
                        responseText = `You can reach out via my <a href="contact.html">Contact Form</a> or connect with me on <a href="${data.socials?.linkedin || '#'}">LinkedIn</a>!`;
                        responseChips = [];
                    } else if (txt.includes('hi') || txt.includes('hello') || txt.includes('hey') || txt.includes('greetings')) {
                        responseText = "Hello! Looking for anything specific?";
                        responseChips = ["About Me", "Projects"];
                    } else if (txt.includes('bye') || txt.includes('thanks') || txt.includes('thank')) {
                        responseText = "You're welcome! Have a great day!";
                        responseChips = [];
                    }
                } catch (e) {
                    console.error("Chatbot logic error:", e);
                }

                setTimeout(() => { 
                    cbTyping.classList.remove('active');
                    addMessage(responseText, 'bot', responseChips);
                }, 1000 + Math.random() * 800);
            }

            function handleSend() {
                const txt = cbInput.value.trim();
                if(!txt) return;
                addMessage(txt, 'user');
                cbInput.value = '';
                botReply(txt);
            }

            cbSend.addEventListener('click', handleSend);
            cbInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleSend(); });

            loadHistory();
        }
    };

    /* ==========================================
       Unified LocalStorage Database Accessor
       ========================================== */
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
            // Load config.js dynamically
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'js/config.js';
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
                    console.log("Supabase Client initialized successfully.");
                }
            }
        } catch (error) {
            console.error("Failed to load or initialize Supabase:", error);
        }
        scriptsLoaded = true;
    }

    // Schema Migration Guard
    function ensureSchema(data) {
        if (!data) data = {};
        if (!data.projects) data.projects = [];
        if (!data.gallery) data.gallery = [];
        if (!data.journey) data.journey = [];
        if (!data.messages) data.messages = [];
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
        if (!data.profile_images) {
            data.profile_images = {
                home_hero: "assets/image/IMG_0641.JPG",
                about_carousel: [
                    "assets/image/IMG_0641.JPG",
                    "assets/image/Grad_Pic.jpg"
                ]
            };
        }
        return data;
    }

    const rawGetPortfolioData = async () => {
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
                    try {
                        localStorage.setItem('portfolio_db', JSON.stringify(data.data));
                    } catch (e) {
                        console.warn("Could not save to LocalStorage.", e);
                    }
                    return data.data;
                }
            } catch (err) {
                console.error("Error fetching from Supabase, falling back to local file:", err);
            }
        }

        const isServerEnv = window.location.protocol !== 'file:';
        
        // Check localStorage first
        let localObj = null;
        try {
            const localData = localStorage.getItem('portfolio_db');
            if (localData) {
                localObj = JSON.parse(localData);
            }
        } catch (e) {
            console.error("Failed to parse local portfolio data", e);
        }

        if (isServerEnv) {
            try {
                const response = await fetch('js/data.json?t=' + Date.now());
                if (response.ok) {
                    const serverData = await response.json();
                    
                    // Compare timestamps: use whichever is newer
                    if (localObj && localObj.last_updated && 
                        (!serverData.last_updated || localObj.last_updated > serverData.last_updated)) {
                        console.log("LocalStorage has newer edits than server. Using localStorage.");
                        return localObj;
                    }
                    
                    try {
                        localStorage.setItem('portfolio_db', JSON.stringify(serverData));
                    } catch (e) {
                        console.warn("Could not save to LocalStorage.", e);
                    }
                    return serverData;
                }
            } catch (e) {
                console.error("Error fetching data.json from server, falling back to localStorage:", e);
            }
        }

        // Fallback to localStorage if offline or file:// protocol
        if (localObj) {
            return localObj;
        }
        
        // Critical fallback if everything fails
        try {
            const response = await fetch('js/data.json?t=' + Date.now());
            const data = await response.json();
            return data;
        } catch (e) {
            console.error("Critical error fetching dynamic database fallback:", e);
            return { projects: [], gallery: [], journey: [], socials: {} };
        }
    };

    window.getPortfolioData = async () => {
        const raw = await rawGetPortfolioData();
        return ensureSchema(raw);
    };

    // Dynamic Socials Binder
    const bindDynamicSocials = async () => {
        try {
            const data = await window.getPortfolioData();
            if (data.socials) {
                const ghLinks = document.querySelectorAll('.social-link-github');
                const liLinks = document.querySelectorAll('.social-link-linkedin');
                const twLinks = document.querySelectorAll('.social-link-twitter');
                const fbLinks = document.querySelectorAll('.social-link-facebook');

                ghLinks.forEach(link => { if(data.socials.github) link.href = data.socials.github; });
                liLinks.forEach(link => { if(data.socials.linkedin) link.href = data.socials.linkedin; });
                twLinks.forEach(link => { if(data.socials.twitter) link.href = data.socials.twitter; });
                fbLinks.forEach(link => { if(data.socials.facebook) link.href = data.socials.facebook; });
            }
        } catch (error) {
            console.error("Error binding dynamic socials:", error);
        }
    };

    // First load layout modules, then initialize other global features
    initLayout().then(() => {
        bindDynamicSocials();
        window.initReveal();
        initCustomCursor();
        initChatbot();
    });
});
