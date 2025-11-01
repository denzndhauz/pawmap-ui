const navToggle = document.querySelector('.nav-toggle');
const sideNav = document.querySelector('.side-nav');
const navOverlay = document.querySelector('.nav-overlay');

function toggleNav() {
    sideNav.classList.toggle('active');
    navOverlay.classList.toggle('active');
}

navToggle.addEventListener('click', toggleNav);
navOverlay.addEventListener('click', toggleNav);

// Close navigation when clicking a link on mobile
const navLinks = document.querySelectorAll('.nav-links li');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            toggleNav();
        }
    });
});

// Close navigation when screen is resized above mobile breakpoint
window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && sideNav.classList.contains('active')) {
        toggleNav();
    }
});
