document.addEventListener('DOMContentLoaded', () => {
    // Load existing settings
    chrome.storage.local.get(['xmlSource', 'theme'], (result) => {
        if (result.xmlSource) {
            document.getElementById('xmlSource').value = result.xmlSource;
        }
        if (result.theme) {
            document.getElementById('themeSelect').value = result.theme;
        }
    });

    // Save XML source
    document.getElementById('saveButton').addEventListener('click', () => {
        const xmlSource = document.getElementById('xmlSource').value;
        chrome.storage.local.set({ xmlSource }, () => {
            showStatus('Settings saved');
        });
    });

    // Save theme selection
    document.getElementById('themeSelect').addEventListener('change', (e) => {
        const theme = e.target.value;
        chrome.storage.local.set({ theme }, () => {
            showStatus('Theme saved');
            applyTheme(theme);
        });
    });
});

function showStatus(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    setTimeout(() => {
        status.textContent = '';
    }, 2000);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}
