// Elements for Mobile Sidebar
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const closeMenuBtn = document.getElementById('close-menu-btn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
const mobileLinks = document.querySelectorAll('.mobile-link');

// Function to open Sidebar
function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // prevent background scrolling
}

// Function to close Sidebar
function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = 'auto'; // restore background scrolling
}

// Event Listeners for Mobile Menu
if(mobileMenuBtn) mobileMenuBtn.addEventListener('click', openSidebar);
if(closeMenuBtn) closeMenuBtn.addEventListener('click', closeSidebar);
if(overlay) overlay.addEventListener('click', closeSidebar);

// Close sidebar when a link is clicked
mobileLinks.forEach(link => {
    link.addEventListener('click', closeSidebar);
});

// Scroll Effects (Header Background & Active Links)
const header = document.querySelector('.header');
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';

    // Header Background Scroll Effect
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }

    // Active Link Scroll Effect
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (scrollY >= (sectionTop - sectionHeight / 3)) {
            current = section.getAttribute('id');
        }
    });

    // Update active class on desktop nav
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(current)) {
            link.classList.add('active');
        }
    });

    // Update active class on mobile nav
    mobileLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(current)) {
            link.classList.add('active');
        }
    });
});

// Simple Form Submit Prevention for demo purposes
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Thank you for reaching out! Your message has been sent successfully.');
        contactForm.reset();
    });
}
