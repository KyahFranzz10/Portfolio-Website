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


