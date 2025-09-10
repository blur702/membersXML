const JSON_URL = 'https://housegovfeeds.house.gov/feeds/Member/Json';
const XML_URL = 'https://member-info.house.gov/members.xml';

chrome.runtime.onInstalled.addListener(() => {
    checkForUpdates(true); // Check for updates on install
    chrome.alarms.create('checkForUpdates', { periodInMinutes: 1440 }); // Check for updates daily
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkForUpdates') {
        checkForUpdates(false);
    }
});

// Handle extension startup - ensure we have data
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension startup, checking data...');
    // Check if we have recent data, if not fetch it
    chrome.storage.local.get(['membersJSON', 'lastUpdated'], (result) => {
        if (!result.membersJSON || isDataStale(result.lastUpdated)) {
            console.log('Data is missing or stale, fetching...');
            fetchMembersData();
        }
    });
});

function checkAndUpdateData() {
    chrome.storage.local.get(['lastUpdated'], (result) => {
        if (isDataStale(result.lastUpdated)) {
            console.log('Data is stale, updating...');
            fetchMembersData();
        }
    });
}

function fetchMembersData() {
    console.log('Fetching members data from:', JSON_URL);
    
    // Try JSON API first
    return fetch(JSON_URL)
        .then(response => {
            const lastModified = response.headers.get('last-modified');
            chrome.storage.local.get('lastModified', result => {
                if (initialInstall || result.lastModified !== lastModified) {
                    if (!initialInstall) {
                        chrome.notifications.create({
                            type: 'basic',
                            iconUrl: 'icons/icon128.png',
                            title: 'Update Available',
                            message: 'A new version of the members XML file is available. Click to download.',
                            buttons: [{ title: 'Download' }],
                            priority: 0
                        });
                    }
                    // Save the new last modified date
                    chrome.storage.local.set({ lastModified: lastModified });
                }
            });
        })
        .catch(error => console.error('Error checking for updates:', error));
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 0) { // User clicked 'Download'
        fetch(XML_URL)
            .then(response => response.text())
            .then(data => {
                chrome.storage.local.set({ membersXML: data }, () => {
                    chrome.notifications.clear(notificationId);
                    console.log('XML file updated and saved.');
                });
            })
            .catch(error => console.error('Error downloading the XML file:', error));
    }
});
