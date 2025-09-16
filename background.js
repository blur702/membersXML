const XML_URL = 'https://member-info.house.gov/members.xml';

// Function to detect and store changes between XML versions
function detectAndStoreChanges(previousXML, currentXML) {
    try {
        const parser = new DOMParser();
        const previousDoc = parser.parseFromString(previousXML, 'text/xml');
        const currentDoc = parser.parseFromString(currentXML, 'text/xml');
        
        const previousMembers = Array.from(previousDoc.getElementsByTagName('Member'));
        const currentMembers = Array.from(currentDoc.getElementsByTagName('Member'));
        
        const changes = {
            added: [],
            removed: [],
            modified: [],
            timestamp: Date.now()
        };
        
        // Create maps for easier lookup
        const previousMap = new Map();
        const currentMap = new Map();
        
        previousMembers.forEach(member => {
            const id = member.getAttribute('bioguide_id');
            if (id) previousMap.set(id, member);
        });
        
        currentMembers.forEach(member => {
            const id = member.getAttribute('bioguide_id');
            if (id) currentMap.set(id, member);
        });
        
        // Find added members
        for (const [id, member] of currentMap) {
            if (!previousMap.has(id)) {
                changes.added.push(memberToObject(member));
            }
        }
        
        // Find removed members
        for (const [id, member] of previousMap) {
            if (!currentMap.has(id)) {
                changes.removed.push(memberToObject(member));
            }
        }
        
        // Find modified members
        for (const [id, currentMember] of currentMap) {
            if (previousMap.has(id)) {
                const previousMember = previousMap.get(id);
                if (!membersEqual(previousMember, currentMember)) {
                    changes.modified.push({
                        previous: memberToObject(previousMember),
                        current: memberToObject(currentMember)
                    });
                }
            }
        }
        
        // Store changes
        chrome.storage.local.set({ latestChanges: changes }, () => {
            console.log('Changes detected and stored:', changes);
        });
        
    } catch (error) {
        console.error('Error detecting changes:', error);
    }
}

// Helper function to convert Member element to object
function memberToObject(memberElement) {
    const member = {
        bioguide_id: memberElement.getAttribute('bioguide_id'),
        firstname: memberElement.getAttribute('firstname'),
        lastname: memberElement.getAttribute('lastname'),
        party: memberElement.getAttribute('party'),
        state: memberElement.getAttribute('state'),
        district: memberElement.getAttribute('district'),
        office_id: memberElement.getAttribute('office_id'),
        phone: memberElement.getAttribute('phone'),
        websiteURL: memberElement.getAttribute('websiteURL'),
        room_num: memberElement.getAttribute('room_num'),
        HOB: memberElement.getAttribute('HOB'),
        committees: []
    };
    
    // Add committee assignments
    const assignments = memberElement.getElementsByTagName('assignment');
    for (const assignment of assignments) {
        member.committees.push(assignment.textContent);
    }
    
    return member;
}

// Helper function to compare two Member elements
function membersEqual(member1, member2) {
    const attributes = [
        'bioguide_id', 'firstname', 'lastname', 'party', 'state', 'district',
        'office_id', 'phone', 'websiteURL', 'room_num', 'HOB'
    ];
    
    // Compare attributes
    for (const attr of attributes) {
        if (member1.getAttribute(attr) !== member2.getAttribute(attr)) {
            return false;
        }
    }
    
    // Compare committee assignments
    const assignments1 = Array.from(member1.getElementsByTagName('assignment')).map(a => a.textContent);
    const assignments2 = Array.from(member2.getElementsByTagName('assignment')).map(a => a.textContent);
    
    if (assignments1.length !== assignments2.length) {
        return false;
    }
    
    assignments1.sort();
    assignments2.sort();
    
    for (let i = 0; i < assignments1.length; i++) {
        if (assignments1[i] !== assignments2[i]) {
            return false;
        }
    }
    
    return true;
}

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
                // Get current XML to store as previous before updating
                chrome.storage.local.get(['membersXML'], result => {
                    const previousXML = result.membersXML;
                    
                    chrome.storage.local.set({
                        membersXML: data,
                        previousMembersXML: previousXML || null,
                        lastModified: lastModified,
                        lastUpdated: Date.now(),
                        hasChanges: previousXML && previousXML !== data
                    }, () => {
                        console.log('XML file updated and saved.');
                        
                        // If we have changes, detect and store them
                        if (previousXML && previousXML !== data) {
                            detectAndStoreChanges(previousXML, data);
                        }
                        
                        if (callback) callback(true);
                    });
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

// Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'detectChanges') {
        detectAndStoreChanges(message.previousXML, message.currentXML);
        sendResponse({ success: true });
    }
    return true;
});