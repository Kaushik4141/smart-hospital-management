// Menu functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get menu elements
    const menuButton = document.getElementById('menuButton');
    const menuDropdown = document.getElementById('menuDropdown');
    const menuOverlay = document.getElementById('menuOverlay');
    
    // Toggle menu when button is clicked
    menuButton.addEventListener('click', function() {
        menuDropdown.classList.toggle('active');
        menuOverlay.classList.toggle('active');
        
        // Toggle aria-expanded for accessibility
        const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
        menuButton.setAttribute('aria-expanded', !isExpanded);
    });
    
    // Close menu when clicking on overlay
    menuOverlay.addEventListener('click', function() {
        menuDropdown.classList.remove('active');
        menuOverlay.classList.remove('active');
        menuButton.setAttribute('aria-expanded', 'false');
    });
    
    // Close menu when pressing Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && menuDropdown.classList.contains('active')) {
            menuDropdown.classList.remove('active');
            menuOverlay.classList.remove('active');
            menuButton.setAttribute('aria-expanded', 'false');
        }
    });
    
    // Set active menu item based on current page
    const currentPage = window.location.pathname.split('/').pop();
    const menuItems = document.querySelectorAll('.menu-items a');
    
    menuItems.forEach(item => {
        const itemHref = item.getAttribute('href');
        if (itemHref === currentPage || 
            (currentPage === '' && itemHref === 'index.html')) {
            item.classList.add('active');
        }
    });
});