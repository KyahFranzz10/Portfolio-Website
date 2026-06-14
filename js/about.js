// About page specific JS
document.addEventListener('DOMContentLoaded', () => {
    /* Dynamic Image Carousel Logic */
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    let currentIndex = 0;
    let timer;

    const initCarousel = (images) => {
        const track = document.getElementById('about-carousel');
        const nav = document.getElementById('carousel-nav');
        if (!track || !nav) return;

        // Generate HTML
        track.innerHTML = images.map((src, i) => `<img src="${src}" alt="About Image ${i+1}" class="carousel-slide ${i === 0 ? 'active' : ''}">`).join('');
        nav.innerHTML = images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('');

        const slides = document.querySelectorAll('.carousel-slide');
        const dots = document.querySelectorAll('.carousel-nav .dot');

        if (slides.length <= 1) {
            // Hide controls if 0 or 1 image
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            nav.style.display = 'none';
            return;
        }

        const updateCarousel = (index) => {
            slides.forEach(s => s.classList.remove('active'));
            dots.forEach(d => d.classList.remove('active'));
            slides[index].classList.add('active');
            dots[index].classList.add('active');
        };

        const nextSlide = () => {
            currentIndex = (currentIndex + 1) % slides.length;
            updateCarousel(currentIndex);
        };

        const prevSlide = () => {
            currentIndex = (currentIndex - 1 + slides.length) % slides.length;
            updateCarousel(currentIndex);
        };

        const resetTimer = () => {
            clearInterval(timer);
            timer = setInterval(nextSlide, 4500);
        };

        if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); resetTimer(); });
        if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); resetTimer(); });

        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                currentIndex = parseInt(e.target.dataset.index);
                updateCarousel(currentIndex);
                resetTimer();
            });
        });

        resetTimer(); // Start autoplay
    };

    /* Fetch and render "My Journey" dynamically */
    window.getPortfolioData()
        .then(data => {
            // Load Profile Images into Carousel
            if (data.profile_images && data.profile_images.about_carousel) {
                initCarousel(data.profile_images.about_carousel);
            } else {
                initCarousel([]); // Empty state
            }

            // Populate dynamic profile text fields if available
            if (data.profile) {
                const eduTitleEl = document.getElementById('about-edu-title');
                const eduP1El = document.getElementById('about-edu-p1');
                const eduP2El = document.getElementById('about-edu-p2');

                if (eduTitleEl && data.profile.about_education_title) eduTitleEl.innerText = data.profile.about_education_title;
                if (eduP1El && data.profile.about_education_p1) eduP1El.innerText = data.profile.about_education_p1;
                if (eduP2El && data.profile.about_education_p2) eduP2El.innerText = data.profile.about_education_p2;

                const skillsTitleEl = document.getElementById('about-skills-title');
                const skillsListEl = document.getElementById('about-skills-list');

                if (skillsTitleEl && data.profile.about_skills_title) {
                    skillsTitleEl.innerText = data.profile.about_skills_title;
                }

                if (skillsListEl && data.profile.about_skills_list) {
                    skillsListEl.innerHTML = '';
                    data.profile.about_skills_list.forEach(skill => {
                        const span = document.createElement('span');
                        span.className = 'skill-tag';
                        span.innerText = skill;
                        skillsListEl.appendChild(span);
                    });
                }
            }

            if (data.journey) {
                const timelineContainer = document.querySelector('.timeline');
                if (timelineContainer) {
                    timelineContainer.innerHTML = '';
                    data.journey.forEach((item, index) => {
                        const isLeft = index % 2 === 0;
                        timelineContainer.innerHTML += `
                            <div class="timeline-item ${isLeft ? 'left' : 'right'} reveal">
                                <div class="timeline-content">
                                    <span class="date">${item.year}</span>
                                    <h3>${item.title}</h3>
                                    <p>${item.description}</p>
                                </div>
                            </div>
                        `;
                    });

                    // Trigger scroll reveal bind since timeline items are added dynamically
                    if (window.initReveal) {
                        window.initReveal();
                    }
                }
            }
        })
        .catch(err => console.error("Error loading journey timeline:", err));
});
