document.addEventListener('DOMContentLoaded', () => {
    const galleryGrid = document.querySelector('.gallery-grid');

    async function loadGallery() {
        try {
            const data = await window.getPortfolioData();
            renderGallery(data.gallery);
        } catch (error) {
            console.error('Error loading gallery:', error);
        }
    }

    function renderGallery(items) {
        if (!galleryGrid) return;
        galleryGrid.innerHTML = '';

        items.forEach((item, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.className = `gallery-item item-${(index % 5) + 1} reveal`;
            
            let mediaHTML = '';
            if (item.mediaType === 'video') {
                mediaHTML = `<video src="${item.mediaUrl}" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>`;
            } else {
                mediaHTML = `<img src="${item.mediaUrl}" alt="${item.caption}">`;
            }

            galleryItem.innerHTML = `
                ${mediaHTML}
                <div class="gallery-caption">${item.caption}</div>
            `;
            galleryGrid.appendChild(galleryItem);
        });

        if (typeof window.initReveal === 'function') {
            window.initReveal();
        }
    }

    loadGallery();
});
