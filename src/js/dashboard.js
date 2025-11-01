const viewToggles = document.querySelectorAll('.view-toggle');
const petContainer = document.querySelector('.pet-container');

viewToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        // Remove active class from all toggles
        viewToggles.forEach(t => t.classList.remove('active'));
        // Add active class to clicked toggle
        toggle.classList.add('active');
        
        // Update container class for view
        const viewType = toggle.dataset.view;
        petContainer.className = `pet-container ${viewType}-view`;
        
        // Save preference
        localStorage.setItem('petViewPreference', viewType);
    });
});

// Load saved preference
const savedView = localStorage.getItem('petViewPreference');
if (savedView) {
    const toggle = document.querySelector(`[data-view="${savedView}"]`);
    if (toggle) toggle.click();
}
