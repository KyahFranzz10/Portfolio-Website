document.addEventListener('DOMContentLoaded', () => {
    const galleryGrid = document.querySelector('.gallery-grid');

    // Create and append Lightbox DOM elements dynamically
    const lightboxModal = document.createElement('div');
    lightboxModal.className = 'lightbox-modal';
    lightboxModal.innerHTML = `
        <button class="lightbox-close-btn" aria-label="Close modal">&times;</button>
        <button class="lightbox-nav-btn lightbox-prev-btn" aria-label="Previous image"><i class="fas fa-chevron-left"></i></button>
        <button class="lightbox-nav-btn lightbox-next-btn" aria-label="Next image"><i class="fas fa-chevron-right"></i></button>
        <div class="lightbox-content-wrapper">
            <div class="lightbox-caption"></div>
        </div>
    `;
    document.body.appendChild(lightboxModal);

    let currentGalleryItems = [];
    let activeIndex = -1;

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
        currentGalleryItems = items || [];

        currentGalleryItems.forEach((item, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.className = `gallery-item item-${(index % 5) + 1} reveal`;
            galleryItem.style.cursor = 'pointer';
            
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

            // Open lightbox modal on click
            galleryItem.addEventListener('click', () => {
                openLightbox(index);
            });

            galleryGrid.appendChild(galleryItem);
        });

        if (typeof window.initReveal === 'function') {
            window.initReveal();
        }
    }

    function openLightbox(index) {
        if (index < 0 || index >= currentGalleryItems.length) return;
        activeIndex = index;
        const item = currentGalleryItems[activeIndex];

        const wrapper = lightboxModal.querySelector('.lightbox-content-wrapper');
        const caption = lightboxModal.querySelector('.lightbox-caption');

        // Remove old media element if present
        const oldMedia = wrapper.querySelector('.lightbox-media');
        if (oldMedia) oldMedia.remove();

        let newMedia;
        if (item.mediaType === 'video') {
            newMedia = document.createElement('video');
            newMedia.src = item.mediaUrl;
            newMedia.controls = true;
            newMedia.autoplay = true;
            newMedia.muted = false;
        } else {
            newMedia = document.createElement('img');
            newMedia.src = item.mediaUrl;
            newMedia.alt = item.caption;
        }
        newMedia.className = 'lightbox-media';
        
        // Insert media before the caption text container
        wrapper.insertBefore(newMedia, caption);
        caption.textContent = item.caption;

        lightboxModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    function closeLightbox() {
        lightboxModal.classList.remove('active');
        document.body.style.overflow = 'auto'; // Restore background scrolling

        // Pause video playback if any
        const media = lightboxModal.querySelector('.lightbox-media');
        if (media && media.tagName === 'VIDEO') {
            media.pause();
        }
    }

    function showNext() {
        if (currentGalleryItems.length === 0) return;
        let nextIndex = activeIndex + 1;
        if (nextIndex >= currentGalleryItems.length) {
            nextIndex = 0; // Wrap to first
        }
        openLightbox(nextIndex);
    }

    function showPrev() {
        if (currentGalleryItems.length === 0) return;
        let prevIndex = activeIndex - 1;
        if (prevIndex < 0) {
            prevIndex = currentGalleryItems.length - 1; // Wrap to last
        }
        openLightbox(prevIndex);
    }

    // Attach Event Listeners for controls
    lightboxModal.querySelector('.lightbox-close-btn').addEventListener('click', closeLightbox);
    lightboxModal.querySelector('.lightbox-next-btn').addEventListener('click', showNext);
    lightboxModal.querySelector('.lightbox-prev-btn').addEventListener('click', showPrev);

    // Close modal when backdrop clicked
    lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) {
            closeLightbox();
        }
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (!lightboxModal.classList.contains('active')) return;
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowRight') {
            showNext();
        } else if (e.key === 'ArrowLeft') {
            showPrev();
        }
    });

    loadGallery();
});

