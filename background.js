const JSON_URL = 'https://housegovfeeds.house.gov/feeds/Member/Json';
const XML_URL = 'https://member-info.house.gov/members.xml';

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
    
    // Try JSON API first
    return fetch(JSON_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Successfully fetched JSON data, storing...');
            // Store the fetched data
            return new Promise((resolve) => {
                chrome.storage.local.set({
                    membersJSON: data,
                    lastUpdated: new Date().toISOString()
                }, () => {
                    console.log('Members JSON data updated and saved successfully');
                    resolve();
                });
            });
        })
        .catch(error => {
            console.log('JSON API failed, trying XML fallback:', error.message);
            
            // Fallback to XML API
            console.log('Fetching members data from XML:', XML_URL);
            return fetch(XML_URL)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(xmlText => {
                    console.log('Successfully fetched XML data, parsing...');
                    // Parse XML and convert to JSON format
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                    const members = xmlDoc.getElementsByTagName('member');
                    
                    const jsonData = {
                        MemberData: {
                            Members: Array.from(members).map(member => ({
                                Name: getXMLElementText(member, 'full-name'),
                                FirstName: getXMLElementText(member, 'firstname'),
                                LastName: getXMLElementText(member, 'lastname'),
                                District: getXMLElementText(member, 'state') + '-' + getXMLElementText(member, 'district'),
                                Party: getXMLElementText(member, 'party'),
                                State: getXMLElementText(member, 'state'),
                                BioGuideID: getXMLElementText(member, 'bioguide-id'),
                                Phone: getXMLElementText(member, 'phone'),
                                Office: getXMLElementText(member, 'office-building') + ' ' + getXMLElementText(member, 'office-room')
                            }))
                        }
                    };
                    
                    // Store the converted data
                    return new Promise((resolve) => {
                        chrome.storage.local.set({
                            membersJSON: jsonData,
                            lastUpdated: new Date().toISOString()
                        }, () => {
                            console.log('Members XML data converted and saved successfully');
                            resolve();
                        });
                    });
                })
                .catch(xmlError => {
                    console.error('Both JSON and XML APIs failed:', xmlError);
                    throw xmlError;
                });
        });
}

function getXMLElementText(parent, tagName) {
    const element = parent.getElementsByTagName(tagName)[0];
    return element ? element.textContent : '';
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
