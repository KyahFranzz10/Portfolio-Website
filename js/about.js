// About page specific JS
document.addEventListener('DOMContentLoaded', () => {
    /* Image Carousel Logic */
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-nav .dot');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    let currentIndex = 0;
    let timer;

    if (slides.length > 0) {
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

        nextBtn.addEventListener('click', () => { nextSlide(); resetTimer(); });
        prevBtn.addEventListener('click', () => { prevSlide(); resetTimer(); });

        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                currentIndex = parseInt(e.target.dataset.index);
                updateCarousel(currentIndex);
                resetTimer();
            });
        });

        resetTimer(); // Start autoplay
    }

    /* Fetch and render "My Journey" dynamically */
    window.getPortfolioData()
        .then(data => {
            // Populate dynamic profile text fields if available
            if (data.profile) {
                const eduTitleEl = document.getElementById('about-edu-title');
                const eduP1El = document.getElementById('about-edu-p1');
                const eduP2El = document.getElementById('about-edu-p2');

                if (eduTitleEl && data.profile.about_education_title) eduTitleEl.innerText = data.profile.about_education_title;
                if (eduP1El && data.profile.about_education_p1) eduP1El.innerText = data.profile.about_education_p1;
                if (eduP2El && data.profile.about_education_p2) eduP2El.innerText = data.profile.about_education_p2;
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
