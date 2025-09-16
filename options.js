document.getElementById('updateButton').addEventListener('click', () => {
    const url = 'https://member-info.house.gov/members.xml';
    document.getElementById('status').innerText = 'Updating XML file...';
    
    fetch(url)
        .then(response => response.text())
        .then(data => {
            // Get current XML to store as previous before updating
            chrome.storage.local.get(['membersXML'], result => {
                const previousXML = result.membersXML;
                
                // Save the downloaded XML data to local storage
                chrome.storage.local.set({ 
                    membersXML: data,
                    previousMembersXML: previousXML || null,
                    lastUpdated: Date.now(),
                    hasChanges: previousXML && previousXML !== data
                }, () => {
                    // If we have changes, trigger change detection
                    if (previousXML && previousXML !== data) {
                        // Call the change detection function from background.js context
                        chrome.runtime.sendMessage({
                            action: 'detectChanges',
                            previousXML: previousXML,
                            currentXML: data
                        });
                        document.getElementById('status').innerText = 'XML file updated successfully! Changes detected and saved.';
                    } else {
                        document.getElementById('status').innerText = 'XML file updated successfully! No changes detected.';
                    }
                });
            });
        })
        .catch(error => {
            document.getElementById('status').innerText = 'Failed to update XML file.';
            console.error('Error fetching the XML file:', error);
        });
});
