document.addEventListener('DOMContentLoaded', () => {
    const projectGrid = document.querySelector('.project-grid');
    let projectsData = [];

    async function loadProjects() {
        try {
            const data = await window.getPortfolioData();
            projectsData = data.projects;
            renderProjects(projectsData);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    function renderProjects(projects) {
        if (!projectGrid) return;
        projectGrid.innerHTML = ''; // Clear existing

        projects.forEach((project, index) => {
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
                        <button class="view-btn" onclick="window.openProjectModal(${index})" style="border:none; cursor:pointer;" aria-label="View Details"><i class="fas fa-eye"></i></button>
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
                    <p>${project.description.length > 100 ? project.description.substring(0, 100) + '...' : project.description}</p>
                    <button class="case-study-btn" onclick="window.openProjectModal(${index})" style="border:none; background:none; cursor:pointer; padding:0; outline:none; font-family: inherit;">View Details <i class="fas fa-arrow-right"></i></button>
                </div>
            `;
            projectGrid.appendChild(card);
        });

        // Re-trigger reveal animation for dynamic elements
        if (typeof window.initReveal === 'function') {
            window.initReveal();
        }
    }

    window.openProjectModal = function(index) {
        const project = projectsData[index];
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
    const modalOverlay = document.getElementById('project-modal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                window.closeProjectModal();
            }
        });
    }

    loadProjects();
});
