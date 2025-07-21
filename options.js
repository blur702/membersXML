document.addEventListener('DOMContentLoaded', () => {
    // Load existing settings
    chrome.storage.local.get(['theme', 'lastUpdated'], (result) => {
        if (result.theme) {
            document.getElementById('themeSelect').value = result.theme;
        }
        updateLastUpdatedDisplay(result.lastUpdated);
    });

    // Save theme selection
    document.getElementById('themeSelect').addEventListener('change', (e) => {
        const theme = e.target.value;
        chrome.storage.local.set({ theme }, () => {
            showStatus('Theme saved');
            applyTheme(theme);
        });
    });

    // Refresh data button
    document.getElementById('refreshDataButton').addEventListener('click', () => {
        showStatus('Refreshing member data...');
        // Send message to background script to refresh data
        chrome.runtime.sendMessage({ action: 'refreshData' }, (response) => {
            if (response && response.success) {
                showStatus('Member data refreshed successfully!');
                chrome.storage.local.get('lastUpdated', (result) => {
                    updateLastUpdatedDisplay(result.lastUpdated);
                });
            } else {
                showStatus('Error refreshing data. Please try again.');
            }
        });
    });
});

function showStatus(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    setTimeout(() => {
        status.textContent = '';
    }, 3000);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

function updateLastUpdatedDisplay(lastUpdated) {
    const lastUpdatedEl = document.getElementById('lastUpdated');
    if (lastUpdated) {
        const date = new Date(lastUpdated);
        lastUpdatedEl.textContent = `Last updated: ${date.toLocaleString()}`;
    } else {
        lastUpdatedEl.textContent = 'Data not loaded yet';
    }
}
