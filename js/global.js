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
        const knowledgeBase = [
            { keywords: ['hi', 'hello', 'hey', 'greetings', 'morning'], responses: ["Hello! I'm Jhon's Portfolio Bot.", "Hey there! Looking for anything specific?"], chips: ["About", "Skills", "Contact"] },
            { keywords: ['skill', 'tech', 'stack', 'language', 'know', 'html', 'css', 'javascript', 'php', 'laravel', 'firebase', 'supabase', 'hostinger', 'dart', 'flutter', 'c', 'c++', 'c#', 'n8n', 'automation'], responses: ["I am highly skilled in Frontend (HTML, CSS, JS, React), Backend/Systems (Node.js, Python, PHP/Laravel, C, C++, C#), Mobile Development (Dart, Flutter), Databases and Hosting (MySQL, Firebase, Supabase, Hostinger), Workflow Automation (n8n), and also experienced in productivity/creative tools like Microsoft Office, Adobe Suite, and OBS Studio.", "My tech stack revolves around modern web tech, systems, mobile development (React, Flutter, Laravel, Python, C/C++, C#, MySQL, Firebase, Supabase, Hostinger), workflow automation (n8n), plus media tools like OBS Studio, Adobe Suite, and Microsoft Office."], chips: ["Projects", "About"] },
            { keywords: ['project', 'work', 'portfolio', 'built', 'made', 'experience'], responses: ["I've developed an E-commerce App, an interactive Data Dashboard, and an Inventory System.", "My favorite project so far is the real-time Data Dashboard."], chips: ["Gallery", "Skills"] },
            { keywords: ['about', 'who', 'background', 'education', 'study'], responses: ["I am a graduating IT student specializing in full-stack development. I love turning complex problems into beautiful web apps.", "As a final-year IT student, my focus has been largely on software engineering, algorithms, and pushing boundaries in web development."], chips: ["Education", "Projects"] },
            { keywords: ['education', 'university', 'college', 'school'], responses: ["I am pursuing a degree in Information Technology. Over the course of my studies, I've engaged in multiple hackathons and practical seminars."], chips: ["Gallery", "Contact"] },
            { keywords: ['contact', 'email', 'phone', 'hire', 'reach', 'touch'], responses: ["You can reach out directly at student@university.edu or use the form on the Contact page.", "I'm open to opportunities! Shoot an email to student@university.edu."], chips: [] },
            { keywords: ['bye', 'goodbye', 'thanks', 'thank', 'later', 'quit'], responses: ["You're welcome! Let me know if you need anything else.", "Goodbye! Have a great day."], chips: [] }
        ];

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
                                <h4>Jhon's Assistant</h4>
                                <span class="cb-status">Online</span>
                            </div>
                        </div>
                        <div class="chatbot-close" id="chatbot-close"><i class="fas fa-times"></i></div>
                    </div>
                    <div class="chatbot-body" id="chatbot-body">
                        <div class="chat-msg bot-msg">
                            Hi there! 👋 I'm the virtual assistant. I can answer questions about skills, projects, and contact info. What would you like to know?
                            <div class="chat-chips" id="initial-chips">
                                <span class="chip">Skills</span>
                                <span class="chip">Projects</span>
                                <span class="chip">Contact</span>
                            </div>
                        </div>
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
            const cbBody = document.getElementById('chatbot-body');
            const cbInput = document.getElementById('chatbot-input-field');
            const cbSend = document.getElementById('chatbot-send-btn');
            const cbTyping = document.getElementById('chatbot-typing');

            cbToggle.addEventListener('click', () => { cbWindow.classList.toggle('active'); });
            cbClose.addEventListener('click', () => { cbWindow.classList.remove('active'); });

            function addMessage(text, sender, chips = []) {
                const msg = document.createElement('div');
                msg.classList.add('chat-msg', sender === 'bot' ? 'bot-msg' : 'user-msg');
                msg.innerHTML = text;
                
                if (chips && chips.length > 0) {
                    const chipsDiv = document.createElement('div');
                    chipsDiv.className = 'chat-chips';
                    chips.forEach(chipText => {
                        const chip = document.createElement('span');
                        chip.className = 'chip';
                        chip.textContent = chipText;
                        chip.onclick = () => { cbInput.value = chipText; handleSend(); };
                        chipsDiv.appendChild(chip);
                    });
                    msg.appendChild(chipsDiv);
                }

                cbBody.insertBefore(msg, cbTyping);
                cbBody.scrollTop = cbBody.scrollHeight;
            }

            function botReply(userText) {
                cbTyping.classList.add('active');
                cbBody.scrollTop = cbBody.scrollHeight;

                let responseText = "I'm still learning! Try asking about my 'skills', 'projects', or 'education'.";
                let responseChips = ["Skills", "Projects", "Education"];
                
                const txt = userText.toLowerCase();
                for (const intent of knowledgeBase) {
                    if (intent.keywords.some(kw => txt.includes(kw))) {
                        responseText = intent.responses[Math.floor(Math.random() * intent.responses.length)];
                        responseChips = intent.chips;
                        break;
                    }
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
