const JSON_URL = 'https://housegovfeeds.house.gov/feeds/Member/Json';

chrome.runtime.onInstalled.addListener(() => {
    // Load initial data on install
    fetchMembersData();
    
    // Set up periodic updates (daily)
    chrome.alarms.create('updateMembersData', { periodInMinutes: 1440 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateMembersData') {
        fetchMembersData();
    }
});

function fetchMembersData() {
    fetch(JSON_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Store the fetched data
            chrome.storage.local.set({ 
                membersJSON: data,
                lastUpdated: new Date().toISOString()
            }, () => {
                console.log('Members data updated successfully');
            });
        })
        .catch(error => {
            console.error('Error fetching members data:', error);
            // On error, we'll just use cached data if available
        });
}

// Handle extension startup - ensure we have data
chrome.runtime.onStartup.addListener(() => {
    // Check if we have recent data, if not fetch it
    chrome.storage.local.get(['membersJSON', 'lastUpdated'], (result) => {
        if (!result.membersJSON || isDataStale(result.lastUpdated)) {
            fetchMembersData();
        }
    });
});

function isDataStale(lastUpdated) {
    if (!lastUpdated) return true;
    const lastUpdate = new Date(lastUpdated);
    const now = new Date();
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
    return hoursSinceUpdate > 24; // Consider data stale after 24 hours
}
