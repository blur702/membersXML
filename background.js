const JSON_URL = 'https://housegovfeeds.house.gov/feeds/Member/Json';

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed, fetching initial data...');
    // Load initial data on install
    fetchMembersData();
    
    // Set up periodic updates (daily)
    chrome.alarms.create('updateMembersData', { periodInMinutes: 1440 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateMembersData') {
        console.log('Daily alarm triggered, checking for data updates...');
        checkAndUpdateData();
    }
});

// Handle messages from popup/options pages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'refreshData') {
        fetchMembersData()
            .then(() => sendResponse({ success: true }))
            .catch(() => sendResponse({ success: false }));
        return true; // Keep the message channel open for async response
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
    return fetch(JSON_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Successfully fetched data, storing...');
            // Store the fetched data
            return new Promise((resolve) => {
                chrome.storage.local.set({ 
                    membersJSON: data,
                    lastUpdated: new Date().toISOString()
                }, () => {
                    console.log('Members data updated and saved successfully');
                    resolve();
                });
            });
        })
        .catch(error => {
            console.error('Error fetching members data:', error);
            // Re-throw to allow caller to handle
            throw error;
        });
}

function isDataStale(lastUpdated) {
    if (!lastUpdated) {
        console.log('No lastUpdated timestamp, data is stale');
        return true;
    }
    const lastUpdate = new Date(lastUpdated);
    const now = new Date();
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
    const isStale = hoursSinceUpdate > 24; // Consider data stale after 24 hours
    console.log(`Data age: ${hoursSinceUpdate.toFixed(1)} hours, stale: ${isStale}`);
    return isStale;
}
