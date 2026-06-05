document.addEventListener('DOMContentLoaded', () => {
    const projectGrid = document.querySelector('.project-grid');

    async function loadProjects() {
        try {
            const data = await window.getPortfolioData();
            renderProjects(data.projects);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    function renderProjects(projects) {
        if (!projectGrid) return;
        projectGrid.innerHTML = ''; // Clear existing

        projects.forEach(project => {
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
            window.initReveal();
        }
    }

    loadProjects();
});
