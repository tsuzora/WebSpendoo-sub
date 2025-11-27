// Variable to store the templates once fetched (prevents reloading)
let templatesCache = null;

// Generic function to get ANY template by its ID
async function getTemplate(templateId) {
    // 1. Check if we already loaded the file. If not, fetch it.
    if (!templatesCache) {
        const response = await fetch('templates.html');
        const text = await response.text();
        const parser = new DOMParser();
        templatesCache = parser.parseFromString(text, 'text/html');
    }

    // 2. Return the specific template requested
    return templatesCache.getElementById(templateId);
}

// Helper function to render a template into a slot
async function renderComponent(templateId, slotId) {
    const template = await getTemplate(templateId);
    const slot = document.getElementById(slotId);

    if (template && slot) {
        const clone = template.content.cloneNode(true);
        slot.appendChild(clone);
    }
}

// Function to Render
async function initApp() {
    // 1. Render Balance Card in Sidebar
    await renderComponent('balance-card-template', 'balance-card-slot');

    // 2. Render SAME Balance Card in Analyze Page (different slot, different data)
    await renderComponent('navbar-template', 'navbar-slot');

    await renderComponent('list-container-template', 'transaction-home-slot');
    await renderComponent('transaction-home-template', 'content-page-slot');

    await renderComponent('history-container-template', 'history-content-slot');
    await renderComponent('history-content-template', 'history-page-slot');


}

// Start the app
initApp();
