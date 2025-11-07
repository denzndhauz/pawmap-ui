const navToggle = document.querySelector('.nav-toggle');
const sideNav = document.querySelector('.side-nav');
const navOverlay = document.querySelector('.nav-overlay');

function toggleNav() {
    if (sideNav && navOverlay) {
        sideNav.classList.toggle('active');
        navOverlay.classList.toggle('active');
    }
}

if (navToggle) {
    navToggle.addEventListener('click', toggleNav);
}

if (navOverlay) {
    navOverlay.addEventListener('click', toggleNav);
}

// Close navigation when clicking a link on mobile
const navLinks = document.querySelectorAll('.nav-links li');
if (navLinks.length > 0) {
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768 && sideNav && navOverlay) {
                toggleNav();
            }
        });
    });
}

// Close navigation when screen is resized above mobile breakpoint
window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && sideNav && sideNav.classList.contains('active')) {
        toggleNav();
    }
});
