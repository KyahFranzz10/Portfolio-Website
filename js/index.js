// Landing page specific JS logic
document.addEventListener('DOMContentLoaded', () => {
    console.log("Landing page JS successfully loaded!");
    
    const projectGrid = document.querySelector('#featured-projects .project-grid');
    console.log("Selected projectGrid:", projectGrid);

    async function loadFeaturedProjects() {
        try {
            console.log("Calling window.getPortfolioData...");
            const data = await window.getPortfolioData();
            console.log("Fetched portfolio data:", data);
            
            // Populate dynamic profile text fields if available
            if (data.profile) {
                const subEl = document.getElementById('landing-subtitle');
                const descEl = document.getElementById('landing-description');
                const aboutTitleEl = document.getElementById('about-preview-title');
                const aboutP1El = document.getElementById('about-preview-p1');
                const aboutP2El = document.getElementById('about-preview-p2');

                if (subEl && data.profile.home_subtitle) subEl.innerText = data.profile.home_subtitle;
                if (descEl && data.profile.home_description) descEl.innerText = data.profile.home_description;
                if (aboutTitleEl && data.profile.about_title) aboutTitleEl.innerText = data.profile.about_title;
                if (aboutP1El && data.profile.about_p1) aboutP1El.innerText = data.profile.about_p1;
                if (aboutP2El && data.profile.about_p2) aboutP2El.innerText = data.profile.about_p2;
            }
            
            // Populate profile images if available
            if (data.profile_images && data.profile_images.home_hero) {
                const heroImgEl = document.getElementById('hero-image');
                if (heroImgEl) {
                    heroImgEl.src = data.profile_images.home_hero;
                }
            }

            // Get only the first 3 projects for the home page preview
            const featuredProjects = data.projects.slice(0, 3);
            console.log("Featured projects to render:", featuredProjects);
            renderProjects(featuredProjects);
        } catch (error) {
            console.error('Error loading featured projects:', error);
        }
    }

    function renderProjects(projects) {
        if (!projectGrid) {
            console.error("projectGrid container not found in DOM!");
            return;
        }
        projectGrid.innerHTML = ''; // Clear existing
        console.log("Rendering projects, count:", projects.length);

        projects.forEach(project => {
            console.log("Rendering project:", project.title);
            const card = document.createElement('div');
            card.className = 'project-card glass-card reveal';
            
            let mediaHTML = '';
            if (project.mediaType === 'video') {
                mediaHTML = `<video src="${project.mediaUrl}" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>`;
            } else {
                mediaHTML = `<img src="${project.mediaUrl}" alt="${project.title}">`;
            }

            const statusVal = project.status || 'deployed';
            const statusLabel = statusVal === 'in-progress' ? 'In Progress' : (statusVal === 'not-deployed' ? 'Local Only' : 'Deployed');

            card.innerHTML = `
                <div class="project-img">
                    ${mediaHTML}
                    <div class="project-overlay">
                        <a href="${project.link}" class="view-btn"><i class="fas fa-external-link-alt"></i></a>
                    </div>
                </div>
                <div class="project-info">
                    <div class="project-tags-row">
                        <div class="project-tags">
                            ${project.tags.map(tag => `<span>${tag}</span>`).join('')}
                        </div>
                        <span class="status-tag status-${statusVal}">${statusLabel}</span>
                    </div>
                    <h3>${project.title}</h3>
                    <p>${project.description}</p>
                    <a href="${project.link}" class="case-study-btn">Case Study <i class="fas fa-arrow-right"></i></a>
                </div>
            `;
            projectGrid.appendChild(card);
        });

        // Re-trigger reveal animation for dynamic elements
        if (typeof window.initReveal === 'function') {
            console.log("Calling window.initReveal");
            window.initReveal();
        } else {
            console.warn("window.initReveal function not found");
        }
    }

    loadFeaturedProjects();
});


