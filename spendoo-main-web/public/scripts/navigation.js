document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================
    // 1. SELECTORS
    // =========================================
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.page-section');

    // =========================================
    // 2. NAVIGATION FUNCTIONS
    // =========================================
    
    /**
     * Switches the visible page section based on the target ID.
     * @param {string} targetId - The id suffix (e.g., 'home', 'history')
     */
    function switchPage(targetId) { 
        // A. Hide all sections first
        sections.forEach(section => {
            section.style.display = 'none'; // Force hide
            section.classList.remove('active'); // Remove animation class
        });

        // B. Find and show the target section
        const targetSection = document.getElementById(`page-${targetId}`);
        if (targetSection) {

            if (targetId != "home") {
                targetSection.style.display = 'block';   
            } else {
                targetSection.style.display = 'flex';
            }
            
            // Small delay allows the CSS fade-in animation to trigger
            setTimeout(() => {
                targetSection.classList.add('active');
            }, 10);
            
        }
    }

    // =========================================
    // 3. EVENT LISTENERS
    // =========================================
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Stop the browser from reloading

            const targetId = link.getAttribute('data-target');

            // 1. Update Navbar Visuals (Green Active State)
            navLinks.forEach(btn => btn.classList.remove('active'));
            link.classList.add('active');

            // 2. Perform the Page Switch
            switchPage(targetId);
        });
    });
})