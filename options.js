document.getElementById('updateButton').addEventListener('click', () => {
    const url = 'https://member-info.house.gov/members.xml';
    const statusElement = document.getElementById('status');
    
    statusElement.innerText = 'Downloading...';
    
    fetch(url, { 
        method: 'GET',
        signal: AbortSignal.timeout(30000) // 30 second timeout
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            // Save the downloaded XML data to local storage
            chrome.storage.local.set({ membersXML: data }, () => {
                statusElement.innerText = 'XML file updated successfully!';
                // Update the last modified date as well
                fetch(url, { method: 'HEAD' })
                    .then(response => {
                        const lastModified = response.headers.get('last-modified');
                        chrome.storage.local.set({ lastModified: lastModified });
                    })
                    .catch(error => {
                        console.warn('Could not update last-modified date:', error);
                    });
            });
        })
        .catch(error => {
            statusElement.innerText = `Failed to update XML file: ${error.message}`;
            console.error('Error fetching the XML file:', error);
        });
});

document.getElementById('saveIntervalButton').addEventListener('click', () => {
    const interval = parseInt(document.getElementById('updateInterval').value);
    chrome.storage.local.set({ updateInterval: interval }, () => {
        // Update the alarm
        chrome.alarms.clear('checkForUpdates', () => {
            chrome.alarms.create('checkForUpdates', { periodInMinutes: interval });
            document.getElementById('status').innerText = 'Update interval saved!';
            setTimeout(() => {
                document.getElementById('status').innerText = '';
            }, 3000);
        });
    });
});

// Load saved interval on page load
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('updateInterval', result => {
        if (result.updateInterval) {
            document.getElementById('updateInterval').value = result.updateInterval;
        }
    });
});
