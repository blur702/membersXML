let searchInProgress = false;

document.getElementById('searchField').addEventListener('input', () => {
    const searchTerm = document.getElementById('searchField').value.toLowerCase();
    
    // Set searching state
    if (searchInProgress) {
        // If a search is already in progress, wait and try again
        setTimeout(() => {
            const currentSearchTerm = document.getElementById('searchField').value.toLowerCase();
            if (currentSearchTerm === searchTerm) {
                performSearch(searchTerm);
            }
        }, 100);
        return;
    }
    
    performSearch(searchTerm);
    
    // Save search term to storage with timestamp
    chrome.storage.local.set({
        lastSearch: {
            term: searchTerm,
            timestamp: Date.now()
        }
    });
});

// Add clear button event listener
document.getElementById('clearButton').addEventListener('click', () => {
    document.getElementById('searchField').value = '';
    document.getElementById('results').innerHTML = '';
    chrome.storage.local.remove('lastSearch');
});

// Function to check and restore last search
function restoreLastSearch() {
    chrome.storage.local.get('lastSearch', result => {
        if (result.lastSearch) {
            const { term, timestamp } = result.lastSearch;
            const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
            
            if (Date.now() - timestamp < fifteenMinutes) {
                document.getElementById('searchField').value = term;
                performSearch(term);
            } else {
                // Clear expired search
                chrome.storage.local.remove('lastSearch');
            }
        }
    });
}

// Extract search functionality into separate function
function performSearch(searchTerm) {
    searchInProgress = true;
    document.getElementById('results').innerHTML = '<div class="loading">Searching...</div>';
    
    chrome.storage.local.get('membersXML', result => {
        if (result.membersXML) {
            try {
                const parser = new DOMParser();
                const data = parser.parseFromString(result.membersXML, 'text/xml');
                const members = data.getElementsByTagName('Member');
                let results = '';
                
                const createCopyIcon = (text, id) => {
                    return `<i class="fas fa-copy icon" data-text="${text}" data-id="${id}"></i>`;
                };

                for (let member of members) {
                    const firstname = member.getAttribute('firstname') ? member.getAttribute('firstname').toLowerCase() : '';
                    const lastname = member.getAttribute('lastname') ? member.getAttribute('lastname').toLowerCase() : '';
                    const party = member.getAttribute('party') ? member.getAttribute('party').toLowerCase() : '';
                    const state = member.getAttribute('state') ? member.getAttribute('state').toLowerCase() : '';
                    const district = member.getAttribute('district') ? member.getAttribute('district').toLowerCase() : '';
                    const listingName = member.getAttribute('listing_name') ? member.getAttribute('listing_name').toLowerCase() : '';
                    const officeID = member.getAttribute('office_id') ? member.getAttribute('office_id').toLowerCase() : ''; // Ensure this is lowercase for search comparison
                    const website = member.getAttribute('websiteURL') ? member.getAttribute('websiteURL') : '';
                    const bioguideID = member.getAttribute('bioguide_id') ? member.getAttribute('bioguide_id') : '';
                    const officeAuditID = member.getAttribute('office_audit_id') ? member.getAttribute('office_audit_id') : '';
                    const prefix = member.getAttribute('prefix') ? member.getAttribute('prefix').toLowerCase() : '';
                    const middleName = member.getAttribute('middlename') ? member.getAttribute('middlename').toLowerCase() : '';
                    const suffix = member.getAttribute('suffix') ? member.getAttribute('suffix').toLowerCase() : '';
                    const photoURL = member.getAttribute('photoURL') ? member.getAttribute('photoURL') : '';

                    // Get committee assignments
                    const committeesElement = member.getElementsByTagName('committee_assignments')[0];
                    const committees = committeesElement ? Array.from(committeesElement.getElementsByTagName('assignment')) : [];
                    
                    const committeeList = committees.map(committee => {
                        const title = committee.getAttribute('title') || '';
                        const name = committee.textContent || '';
                        return `${title} of ${name}`;
                    });

                    const capitalizeWords = (str) => {
                        return str.replace(/\b\w/g, char => char.toUpperCase());
                    };

                    if (
                        firstname.includes(searchTerm) ||
                        lastname.includes(searchTerm) ||
                        party.includes(searchTerm) ||
                        state.includes(searchTerm) ||
                        district.includes(searchTerm) ||
                        listingName.includes(searchTerm) ||
                        officeID.includes(searchTerm) ||
                        bioguideID.includes(searchTerm) ||
                        officeAuditID.includes(searchTerm) ||
                        prefix.includes(searchTerm) ||
                        middleName.includes(searchTerm) ||
                        suffix.includes(searchTerm)
                    ) {
                        const fullName = `${capitalizeWords(prefix)} ${capitalizeWords(firstname)} ${capitalizeWords(middleName)} ${capitalizeWords(lastname)} ${capitalizeWords(suffix)}`;
                        
                        // Generate committee dropdown HTML
                        let committeeDropdownHTML = '';
                        if (committeeList.length > 0) {
                            const memberId = bioguideID || officeID;
                            committeeDropdownHTML = `
                            <div class="committee-section">
                                <button class="committee-dropdown-btn" id="committee-btn-${memberId}">
                                    View Committees <i class="fas fa-chevron-down"></i>
                                </button>
                                <div id="committee-dropdown-${memberId}" class="committee-dropdown-content">
                                    <ul>
                                        ${committeeList.map(committee => `<li>${committee}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                            `;
                        } else {
                            committeeDropdownHTML = `
                            <div class="committee-section">
                                <button class="committee-dropdown-btn inactive">
                                    No Committee Assignments <i class="fas fa-info-circle"></i>
                                </button>
                            </div>`;
                        }
                        
                        results += `
<div class="wrapper">
  <div class="result">
    <img src="${photoURL}" alt="Photo of ${capitalizeWords(firstname)} ${capitalizeWords(lastname)}">
    <div class="details">
      <div class="name-container">
        <div class="name-row">
          <div class="name">
            <strong>${fullName} (${capitalizeWords(party)})</strong>
          </div>
          <span class="copy-icon">${createCopyIcon(fullName, 'Name')}</span>
        </div>
        <div class="state-district">${capitalizeWords(state)} - District ${capitalizeWords(district)}</div>
      </div>
      <div class="office-details">
        <div class="office-id">
          <span class="label">Office ID:</span>
          <span class="info">${officeID.toUpperCase()}</span>
          <span class="copy-icon">${createCopyIcon(officeID.toUpperCase(), 'Office ID')}</span>
        </div>
        <div class="bioguide">
          <span class="label">Bioguide ID:</span>
          <span class="info">${bioguideID}</span>
          <span class="copy-icon">${createCopyIcon(bioguideID, 'Bioguide ID')}</span>
        </div>
        <div class="auditid">
          <span class="label">Office Audit ID:</span>
          <span class="info">${officeAuditID}</span>
          <span class="copy-icon">${createCopyIcon(officeAuditID, 'Office Audit ID')}</span>
        </div>
        ${committeeDropdownHTML}
        <div class="links">
          <a class="website" href="${website}" target="_blank">Visit Website</a>
        </div>
      </div>
    </div>
  </div>
</div>`;
                    }
                }
                
                document.getElementById('results').innerHTML = results || '<div class="no-results">No results found</div>';
                
                // Add event listeners for copy icons
                document.querySelectorAll('.icon').forEach(icon => {
                    icon.addEventListener('click', (event) => {
                        const text = event.currentTarget.getAttribute('data-text');
                        const id = event.currentTarget.getAttribute('data-id');
                        copyToClipboard(text, id);
                    });
                });
                
                // Set up committee dropdown toggling
                setupCommitteeDropdowns();
                
            } catch (error) {
                document.getElementById('results').innerHTML = `<div class="error">Error parsing data: ${error.message}</div>`;
                console.error('Error parsing XML:', error);
            }
        } else {
            document.getElementById('results').innerHTML = '<div class="error">No member data available. Please update from settings.</div>';
        }
        searchInProgress = false;
    });
}

// Set up event listeners for committee dropdowns
function setupCommitteeDropdowns() {
    // Add click handlers to all dropdown buttons
    document.querySelectorAll('.committee-dropdown-btn:not(.inactive)').forEach(button => {
        // Skip if it already has a click handler
        if (button.getAttribute('data-has-handler') === 'true') return;
        
        // Get the member ID from the button's ID
        const buttonId = button.id;
        if (!buttonId || !buttonId.startsWith('committee-btn-')) return;
        
        const memberId = buttonId.replace('committee-btn-', '');
        
        button.addEventListener('click', function() {
            const dropdown = document.getElementById(`committee-dropdown-${memberId}`);
            if (dropdown) {
                dropdown.classList.toggle('show');
                button.classList.toggle('active');
                
                // Toggle the icon between down and up
                const icon = button.querySelector('i');
                if (icon) {
                    if (dropdown.classList.contains('show')) {
                        icon.classList.remove('fa-chevron-down');
                        icon.classList.add('fa-chevron-up');
                    } else {
                        icon.classList.remove('fa-chevron-up');
                        icon.classList.add('fa-chevron-down');
                    }
                }
            }
        });
        
        // Mark this button as having a handler
        button.setAttribute('data-has-handler', 'true');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.committee-dropdown-btn') && !event.target.closest('.committee-dropdown-content')) {
            // Close all dropdowns
            document.querySelectorAll('.committee-dropdown-content').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
            
            // Reset all buttons
            document.querySelectorAll('.committee-dropdown-btn').forEach(button => {
                button.classList.remove('active');
                const icon = button.querySelector('i.fa-chevron-up');
                if (icon) {
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                }
            });
        }
    });
}

// Call restoreLastSearch when popup opens
document.addEventListener('DOMContentLoaded', restoreLastSearch);

function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification(`Copied ${id} to clipboard: ${text}`);
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerText = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Function to compare XML data
function compareXMLData(oldXML, newXML) {
    const changes = {
        added: [],
        removed: [],
        modified: []
    };
    
    const oldDoc = new DOMParser().parseFromString(oldXML, 'text/xml');
    const newDoc = new DOMParser().parseFromString(newXML, 'text/xml');
    
    const oldMembers = Array.from(oldDoc.getElementsByTagName('Member'));
    const newMembers = Array.from(newDoc.getElementsByTagName('Member'));
    
    // Create maps for easier comparison
    const oldMemberMap = new Map(oldMembers.map(m => [m.getAttribute('bioguide_id'), m]));
    const newMemberMap = new Map(newMembers.map(m => [m.getAttribute('bioguide_id'), m]));
    
    // All attributes to check for changes
    const attributesToCheck = [
        'firstname', 'lastname', 'middlename', 'party', 'state', 
        'district', 'office_id', 'websiteURL', 'contactformURL', 
        'phone', 'office_audit_id', 'HOB', 'room_num', 'prefix', 'suffix'
    ];
    
    // Find added and modified members
    newMembers.forEach(member => {
        const bioguideId = member.getAttribute('bioguide_id');
        const oldMember = oldMemberMap.get(bioguideId);
        
        if (!oldMember) {
            changes.added.push(formatMemberData(member));
        } else if (membersAreDifferent(oldMember, member, attributesToCheck)) {
            const changedAttrs = getChangedAttributes(oldMember, member, attributesToCheck);
            changes.modified.push({
                old: formatMemberData(oldMember),
                new: formatMemberData(member),
                changedAttributes: changedAttrs
            });
        }
    });
    
    // Find removed members
    oldMembers.forEach(member => {
        const bioguideId = member.getAttribute('bioguide_id');
        if (!newMemberMap.has(bioguideId)) {
            changes.removed.push(formatMemberData(member));
        }
    });
    
    return changes;
}

function membersAreDifferent(oldMember, newMember, attributes) {
    return attributes.some(attr => 
        oldMember.getAttribute(attr) !== newMember.getAttribute(attr)
    );
}

function getChangedAttributes(oldMember, newMember, attributes) {
    return attributes.filter(attr => 
        oldMember.getAttribute(attr) !== newMember.getAttribute(attr)
    ).map(attr => ({
        name: attr,
        old: oldMember.getAttribute(attr),
        new: newMember.getAttribute(attr)
    }));
}

function formatMemberData(member) {
    return {
        name: `${member.getAttribute('firstname')} ${member.getAttribute('lastname')}`,
        party: member.getAttribute('party'),
        state: member.getAttribute('state'),
        district: member.getAttribute('district'),
        officeId: member.getAttribute('office_id')
    };
}

// Add this to your existing chrome.storage.onChanged listener
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.membersXML) {
        const oldXML = changes.membersXML.oldValue;
        const newXML = changes.membersXML.newValue;
        
        if (oldXML && newXML) {
            const xmlDiffs = compareXMLData(oldXML, newXML);
            if (xmlDiffs.added.length || xmlDiffs.removed.length || xmlDiffs.modified.length) {
                // Store the diffs for later viewing
                chrome.storage.local.set({ xmlDiffs: xmlDiffs });
                showXMLDiffNotification();
            }
        }
    }
});

function showXMLDiffNotification() {
    const notification = document.getElementById('xmlDiffNotification');
    notification.style.display = 'block';
}

// Add click handler for viewing changes
document.getElementById('viewChangesLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.storage.local.get('xmlDiffs', (result) => {
        if (result.xmlDiffs) {
            displayXMLDiffs(result.xmlDiffs);
        }
    });
});

function displayXMLDiffs(diffs) {
    let diffHTML = '<div class="diff-container">';
    
    if (diffs.added.length) {
        diffHTML += '<h3>Added Members:</h3>';
        diffs.added.forEach(member => {
            diffHTML += `<div class="diff-added">
                <p>+ ${member.name} (${member.party}-${member.state}) District ${member.district}</p>
            </div>`;
        });
    }
    
    if (diffs.removed.length) {
        diffHTML += '<h3>Removed Members:</h3>';
        diffs.removed.forEach(member => {
            diffHTML += `<div class="diff-removed">
                <p>- ${member.name} (${member.party}-${member.state}) District ${member.district}</p>
            </div>`;
        });
    }
    
    if (diffs.modified.length) {
        diffHTML += '<h3>Modified Members:</h3>';
        diffs.modified.forEach(change => {
            diffHTML += `<div class="diff-modified">
                <p>From: ${change.old.name} (${change.old.party}-${change.old.state}) District ${change.old.district}</p>
                <p>To: ${change.new.name} (${change.new.party}-${change.new.state}) District ${change.new.district}</p>`;
            
            // Add changed attributes details if available
            if (change.changedAttributes && change.changedAttributes.length > 0) {
                diffHTML += '<div class="changes-detail">';
                change.changedAttributes.forEach(attr => {
                    diffHTML += `<p>${attr.name}: "${attr.old}" → "${attr.new}"</p>`;
                });
                diffHTML += '</div>';
            }
                
            diffHTML += `</div>`;
        });
    }
    
    diffHTML += '</div>';
    
    document.getElementById('results').innerHTML = diffHTML;
}