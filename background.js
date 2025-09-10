const XML_URL = 'https://member-info.house.gov/members.xml';

// Function to check if the data is stale (older than 24 hours)
function isDataStale(lastUpdated) {
    if (!lastUpdated) {
        return true;
    }
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    return (Date.now() - lastUpdated) > twentyFourHours;
}

// Function to fetch and store the XML data
function fetchAndStoreXML(callback) {
    fetch(XML_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const lastModified = response.headers.get('last-modified');
            return response.text().then(data => {
                chrome.storage.local.set({
                    membersXML: data,
                    lastModified: lastModified,
                    lastUpdated: Date.now()
                }, () => {
                    console.log('XML file updated and saved.');
                    if (callback) callback(true);
                });
            });
        })
        .catch(error => {
            console.error('Error downloading the XML file:', error);
            if (callback) callback(false);
        });
}

// Function to check for updates
function checkForUpdates(initialInstall = false) {
    chrome.storage.local.get(['lastModified', 'lastUpdated'], result => {
        if (isDataStale(result.lastUpdated)) {
            fetch(XML_URL, { method: 'HEAD' })
                .then(response => {
                    const lastModified = response.headers.get('last-modified');
                    if (initialInstall || result.lastModified !== lastModified) {
                        if (!initialInstall) {
                            chrome.notifications.create('updateNotification', {
                                type: 'basic',
                                iconUrl: 'icons/icon128.png',
                                title: 'Update Available',
                                message: 'A new version of the members XML file is available. Click to download.',
                                buttons: [{ title: 'Download' }],
                                priority: 2
                            });
                        } else {
                            fetchAndStoreXML();
                        }
                    }
                })
                .catch(error => console.error('Error checking for updates:', error));
        }
    });
}

chrome.runtime.onInstalled.addListener(() => {
    checkForUpdates(true); // Check for updates on install
    chrome.alarms.create('checkForUpdates', { periodInMinutes: 60 }); // Check for updates every hour
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkForUpdates') {
        checkForUpdates(false);
    }
});

// Handle extension startup - ensure we have data
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension startup, checking data...');
    checkForUpdates();
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId === 'updateNotification' && buttonIndex === 0) {
        fetchAndStoreXML(() => {
            chrome.notifications.clear('updateNotification');
        });
    }
});