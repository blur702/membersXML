const XML_URL = 'https://member-info.house.gov/members.xml';

chrome.runtime.onInstalled.addListener(() => {
    checkForUpdates(true); // Check for updates on install
    
    // Use saved interval or default to 1440 minutes (24 hours)
    chrome.storage.local.get('updateInterval', result => {
        const interval = result.updateInterval || 1440;
        chrome.alarms.create('checkForUpdates', { periodInMinutes: interval });
    });
    
    chrome.alarms.create('cleanupStorage', { periodInMinutes: 10080 }); // Cleanup weekly
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkForUpdates') {
        checkForUpdates(false);
    } else if (alarm.name === 'cleanupStorage') {
        cleanupStorage();
    }
});

function checkForUpdates(initialInstall) {
    fetch(XML_URL, { method: 'HEAD' })
        .then(response => {
            const lastModified = response.headers.get('last-modified');
            chrome.storage.local.get('lastModified', result => {
                if (initialInstall || result.lastModified !== lastModified) {
                    // Save the new last modified date
                    chrome.storage.local.set({ lastModified: lastModified });
                    
                    // Automatically download the new data
                    fetch(XML_URL)
                        .then(response => response.text())
                        .then(data => {
                            chrome.storage.local.set({ membersXML: data }, () => {
                                console.log('XML file automatically updated and saved.');
                                
                                if (!initialInstall) {
                                    chrome.notifications.create('update_complete', {
                                        type: 'basic',
                                        iconUrl: 'icons/icon128.png',
                                        title: 'Update Complete',
                                        message: 'The members XML file has been updated automatically.',
                                        priority: 0
                                    });
                                }
                            });
                        })
                        .catch(error => {
                            console.error('Error downloading the XML file:', error);
                            // Still show notification if auto-download fails
                            if (!initialInstall) {
                                chrome.notifications.create('update_failed', {
                                    type: 'basic',
                                    iconUrl: 'icons/icon128.png',
                                    title: 'Update Available',
                                    message: 'A new version is available but could not download automatically. Click to try again.',
                                    buttons: [{ title: 'Download' }],
                                    priority: 0
                                });
                            }
                        });
                }
            });
        })
        .catch(error => console.error('Error checking for updates:', error));
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId.startsWith('update_') && buttonIndex === 0) { // Check for update notification prefix
        fetch(XML_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.text();
            })
            .then(data => {
                chrome.storage.local.set({ membersXML: data }, () => {
                    chrome.notifications.clear(notificationId);
                    console.log('XML file updated and saved.');
                    
                    // Show success notification
                    chrome.notifications.create('update_success', {
                        type: 'basic',
                        iconUrl: 'icons/icon128.png',
                        title: 'Update Successful',
                        message: 'The members XML file has been updated successfully.',
                        priority: 0
                    });
                });
            })
            .catch(error => {
                console.error('Error downloading the XML file:', error);
                
                // Show error notification
                chrome.notifications.create('update_error', {
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Update Failed',
                    message: `Could not download the XML file: ${error.message}`,
                    buttons: [{ title: 'Try Again' }],
                    priority: 0
                });
            });
    }
});

// Add this function to clean up old data
function cleanupStorage() {
    chrome.storage.local.get(null, (items) => {
        // Keep only the necessary data
        const keysToKeep = ['membersXML', 'lastModified', 'lastSearch', 'xmlDiffs', 'updateInterval'];
        const allKeys = Object.keys(items);
        
        const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
        if (keysToRemove.length > 0) {
            chrome.storage.local.remove(keysToRemove);
            console.log('Cleaned up storage, removed:', keysToRemove);
        }
    });
}
