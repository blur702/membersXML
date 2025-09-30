document.getElementById('updateButton').addEventListener('click', () => {
    const url = 'https://member-info.house.gov/members.xml';

    // 1. Get the old XML from storage
    chrome.storage.local.get('membersXML', (result) => {
        const oldXML = result.membersXML;

        // 2. Fetch the new XML
        fetch(url)
            .then(response => response.text())
            .then(data => {
                const newXML = data;

                // 3. Compare the XMLs
                const changes = compareXML(oldXML, newXML);

                // 4. Store the new XML and the changes
                chrome.storage.local.set({ membersXML: newXML, changes: changes }, () => {
                    document.getElementById('status').innerText = 'XML file updated successfully!';
                    displayChanges(changes);
                    // Save changes to a JSON file
                    const blob = new Blob([JSON.stringify(changes, null, 2)], {type : 'application/json'});
                    const downloadUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = 'changes.json';
                    a.click();
                    URL.revokeObjectURL(downloadUrl);
                });
            })
            .catch(error => {
                document.getElementById('status').innerText = 'Failed to update XML file.';
                console.error('Error fetching the XML file:', error);
            });
    });
});

function compareXML(oldXML, newXML) {
    const parser = new DOMParser();
    const oldDoc = parser.parseFromString(oldXML, "application/xml");
    const newDoc = parser.parseFromString(newXML, "application/xml");

    const oldMembers = new Map();
    oldDoc.querySelectorAll('member').forEach(member => {
        const bioguideId = member.querySelector('bioguide-id').textContent;
        oldMembers.set(bioguideId, member.innerHTML);
    });

    const newMembers = new Map();
    newDoc.querySelectorAll('member').forEach(member => {
        const bioguideId = member.querySelector('bioguide-id').textContent;
        newMembers.set(bioguideId, member.innerHTML);
    });

    const changes = {
        added: [],
        removed: [],
        updated: []
    };

    // Check for added and updated members
    for (const [bioguideId, newMemberHTML] of newMembers.entries()) {
        if (!oldMembers.has(bioguideId)) {
            changes.added.push(bioguideId);
        } else if (oldMembers.get(bioguideId) !== newMemberHTML) {
            changes.updated.push(bioguideId);
        }
    }

    // Check for removed members
    for (const bioguideId of oldMembers.keys()) {
        if (!newMembers.has(bioguideId)) {
            changes.removed.push(bioguideId);
        }
    }

    return changes;
}

function displayChanges(changes) {
    const dropdown = document.getElementById('changesDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '';

    if (changes.added.length === 0 && changes.removed.length === 0 && changes.updated.length === 0) {
        const option = document.createElement('option');
        option.text = 'No changes detected.';
        dropdown.add(option);
    } else {
        if (changes.added.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = `Added (${changes.added.length})`;
            changes.added.forEach(id => {
                const option = document.createElement('option');
                option.text = id;
                optgroup.appendChild(option);
            });
            dropdown.add(optgroup);
        }
        if (changes.removed.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = `Removed (${changes.removed.length})`;
            changes.removed.forEach(id => {
                const option = document.createElement('option');
                option.text = id;
                optgroup.appendChild(option);
            });
            dropdown.add(optgroup);
        }
        if (changes.updated.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = `Updated (${changes.updated.length})`;
            changes.updated.forEach(id => {
                const option = document.createElement('option');
                option.text = id;
                optgroup.appendChild(option);
            });
            dropdown.add(optgroup);
        }
    }
}

// Load and display changes on page load
chrome.storage.local.get('changes', (result) => {
    if (result.changes) {
        displayChanges(result.changes);
    }
});