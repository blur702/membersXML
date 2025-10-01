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

// --- URL Management ---

const urlForm = document.getElementById('urlForm');
const urlList = document.getElementById('urlList');

// Handle form submission
urlForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const officeName = document.getElementById('officeName').value;
    const publicUrl = document.getElementById('publicUrl').value;
    const editUrl = document.getElementById('editUrl').value;

    const newUrlEntry = { officeName, publicUrl, editUrl, id: Date.now() };

    chrome.storage.local.get({ savedUrls: [] }, (result) => {
        const savedUrls = result.savedUrls;
        savedUrls.push(newUrlEntry);
        chrome.storage.local.set({ savedUrls }, () => {
            urlForm.reset();
            loadAndDisplayUrls();
        });
    });
});

// Function to load and display URLs
function loadAndDisplayUrls() {
    chrome.storage.local.get({ savedUrls: [] }, (result) => {
        const savedUrls = result.savedUrls;
        urlList.innerHTML = ''; // Clear the list

        if (savedUrls.length === 0) {
            const row = urlList.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 4;
            cell.textContent = 'No URLs saved yet.';
            return;
        }

        savedUrls.forEach(urlEntry => {
            const row = urlList.insertRow();
            row.dataset.id = urlEntry.id;

            row.innerHTML = `
                <td>${urlEntry.officeName}</td>
                <td><a href="${urlEntry.publicUrl}" target="_blank">${urlEntry.publicUrl}</a></td>
                <td><a href="${urlEntry.editUrl}" target="_blank">${urlEntry.editUrl}</a></td>
                <td class="action-buttons">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </td>
            `;

            row.querySelector('.edit-btn').addEventListener('click', () => editUrlEntry(urlEntry.id));
            row.querySelector('.delete-btn').addEventListener('click', () => deleteUrl(urlEntry.id));
        });
    });
}

// Function to enable editing for a URL entry
function editUrlEntry(id) {
    const row = document.querySelector(`tr[data-id='${id}']`);
    const cells = row.querySelectorAll('td');

    const officeName = cells[0].textContent;
    const publicUrl = cells[1].querySelector('a').href;
    const editUrl = cells[2].querySelector('a').href;

    cells[0].innerHTML = `<input type="text" value="${officeName}">`;
    cells[1].innerHTML = `<input type="url" value="${publicUrl}">`;
    cells[2].innerHTML = `<input type="url" value="${editUrl}">`;

    cells[3].innerHTML = `<button class="save-btn">Save</button>`;
    row.querySelector('.save-btn').addEventListener('click', () => saveUrlEntry(id));
}

// Function to save an updated URL entry
function saveUrlEntry(id) {
    const row = document.querySelector(`tr[data-id='${id}']`);
    const inputs = row.querySelectorAll('input');

    const updatedEntry = {
        officeName: inputs[0].value,
        publicUrl: inputs[1].value,
        editUrl: inputs[2].value,
        id: id
    };

    chrome.storage.local.get({ savedUrls: [] }, (result) => {
        let savedUrls = result.savedUrls;
        const index = savedUrls.findIndex(entry => entry.id === id);
        if (index !== -1) {
            savedUrls[index] = updatedEntry;
            chrome.storage.local.set({ savedUrls }, () => {
                loadAndDisplayUrls(); // Refresh the list
            });
        }
    });
}


// Function to delete a URL
function deleteUrl(id) {
    chrome.storage.local.get({ savedUrls: [] }, (result) => {
        let savedUrls = result.savedUrls;
        savedUrls = savedUrls.filter(urlEntry => urlEntry.id !== id);
        chrome.storage.local.set({ savedUrls }, () => {
            loadAndDisplayUrls();
        });
    });
}

// --- Import/Export ---

const importButton = document.getElementById('importButton');
const exportButton = document.getElementById('exportButton');
const importFile = document.getElementById('importFile');

exportButton.addEventListener('click', () => {
    chrome.storage.local.get({ savedUrls: [] }, (result) => {
        const savedUrls = result.savedUrls;
        const dataStr = JSON.stringify(savedUrls, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'urls.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});

importButton.addEventListener('click', () => {
    importFile.click();
});

importFile.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedUrls = JSON.parse(e.target.result);
            if (Array.isArray(importedUrls)) {
                chrome.storage.local.set({ savedUrls: importedUrls }, () => {
                    loadAndDisplayUrls();
                    alert('URLs imported successfully!');
                });
            } else {
                alert('Invalid file format.');
            }
        } catch (error) {
            alert('Error reading file. Please ensure it is a valid JSON file.');
            console.error('Error parsing JSON:', error);
        }
    };
    reader.readAsText(file);
});


// Initial load
loadAndDisplayUrls();