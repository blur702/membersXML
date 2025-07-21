document.addEventListener('DOMContentLoaded', () => {
    // Check if chrome APIs are available (extension context vs standalone testing)
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('theme', (result) => {
            if (result.theme) {
                document.documentElement.setAttribute('data-theme', result.theme);
            }
        });
        
        // Check if we have data, if not show loading message and trigger fetch
        chrome.storage.local.get('membersJSON', (result) => {
            if (!result.membersJSON) {
                document.getElementById('results').innerHTML = '<div class="loading">Loading member data... This may take a moment on first run.</div>';
                // Trigger background fetch
                chrome.runtime.sendMessage({ action: 'refreshData' }, (response) => {
                    // Reload the search after data is fetched
                    setTimeout(() => {
                        restoreLastSearch();
                    }, 1000);
                });
            }
        });
        
        restoreLastSearch();
    } else {
        // Standalone testing mode - show demo data
        document.getElementById('results').innerHTML = `
            <div class="wrapper">
                <div class="result">
                    <div class="details">
                        <div class="name-container">
                            <div class="name-row">
                                <div class="name">
                                    <strong>Adam Smith (D)</strong>
                                </div>
                                <span class="copy-icon"><i class="fas fa-copy icon" data-text="Adam Smith" data-id="Name"></i></span>
                            </div>
                            <div class="state-district">WA-09</div>
                        </div>
                        <div class="office-details">
                            <div class="bioguide">
                                <span class="label">Bioguide ID:</span>
                                <span class="info">S000510</span>
                                <span class="copy-icon"><i class="fas fa-copy icon" data-text="S000510" data-id="Bioguide ID"></i></span>
                            </div>
                            <div class="committees-section">
                                <button class="committees-toggle" aria-expanded="false">
                                    <i class="fas fa-chevron-down"></i> Committees (2)
                                </button>
                                <div class="committees-content" hidden>
                                    <div class="committee-item">
                                        <strong>Committee on Armed Services</strong>
                                        <div class="committee-title">Ranking Member</div>
                                        <div class="committee-rank">Rank: 1</div>
                                    </div>
                                    <div class="committee-item">
                                        <strong>Subcommittee on Strategic Forces</strong>
                                        <div class="committee-title">Member</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        
        // Add event listeners for the demo data
        setupEventListeners();
    }
});

document.getElementById('searchField').addEventListener('input', () => {
    const searchTerm = document.getElementById('searchField').value.toLowerCase();
    performSearch(searchTerm);
    // Save search term to storage with timestamp (only in extension context)
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({
            lastSearch: {
                term: searchTerm,
                timestamp: Date.now()
            }
        });
    }
});

// Add clear button event listener
document.getElementById('clearButton').addEventListener('click', () => {
    document.getElementById('searchField').value = '';
    document.getElementById('results').innerHTML = '';
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove('lastSearch');
    }
});
// Function to setup event listeners (for standalone testing)
function setupEventListeners() {
    // Add event listeners for committee toggles
    document.querySelectorAll('.committees-toggle').forEach(toggle => {
        toggle.addEventListener('click', (event) => {
            const button = event.currentTarget;
            const content = button.nextElementSibling;
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            
            // Toggle aria-expanded
            button.setAttribute('aria-expanded', !isExpanded);
            // Toggle hidden attribute
            content.hidden = isExpanded;
            
            // Rotate chevron icon
            const icon = button.querySelector('i');
            icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    });

    // Add event listeners for copy icons
    document.querySelectorAll('.icon').forEach(icon => {
        icon.addEventListener('click', (event) => {
            const text = event.currentTarget.getAttribute('data-text');
            const id = event.currentTarget.getAttribute('data-id');
            console.log(`Copy ${id}: ${text}`);
        });
    });
}


// Function to check and restore last search
function restoreLastSearch() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
        return; // Skip in standalone mode
    }
    
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
    if (typeof chrome === 'undefined' || !chrome.storage) {
        // In standalone mode, just show message that this requires extension context
        document.getElementById('results').innerHTML = '<div class="loading">Search functionality requires Chrome extension context. Use demo data above.</div>';
        return;
    }
    
    chrome.storage.local.get('membersJSON', result => {
        if (!result.membersJSON) {
            document.getElementById('results').innerHTML = '<div class="error">No member data available yet. Please wait while we load the latest data from House.gov...</div>';
            // Try to trigger data fetch
            chrome.runtime.sendMessage({ action: 'refreshData' });
            return;
        }

        const data = result.membersJSON;
        let members = [];
        
        // Handle different possible JSON structures
        if (data.members && data.members.member && Array.isArray(data.members.member)) {
            // House.gov JSON API structure: data.members.member[]
            members = data.members.member;
        } else if (data.Members && Array.isArray(data.Members)) {
            members = data.Members;
        } else if (data.members && Array.isArray(data.members)) {
            members = data.members;
        } else if (Array.isArray(data)) {
            members = data;
        } else if (data.MemberData && data.MemberData.Members && Array.isArray(data.MemberData.Members)) {
            // XML converted format
            members = data.MemberData.Members;
        } else {
            console.error('Unexpected JSON structure:', data);
            console.log('Available keys:', Object.keys(data));
            document.getElementById('results').innerHTML = '<div class="error">Unable to parse member data format. Check console for details.</div>';
            return;
        }

        let results = '';

        const createCopyIcon = (text, id) => {
            return `<i class="fas fa-copy icon" data-text="${text}" data-id="${id}"></i>`;
        };

        const capitalizeWords = (str) => {
            if (!str) return '';
            return str.replace(/\b\w/g, char => char.toUpperCase());
        };

        const getSampleCommitteeData = (bioguideID, fullName) => {
            // Sample committee data for demonstration. In production, this would fetch from
            // Congress.gov API or another official source using the BioGuide ID.
            const committeeMap = {
                'S000510': [ // Adam Smith (WA-09)
                    { name: 'Committee on Armed Services', title: 'Ranking Member', rank: '1' },
                    { name: 'Subcommittee on Strategic Forces', title: 'Member', rank: '' }
                ],
                'S001172': [ // Adrian Smith (NE-03)
                    { name: 'Committee on Ways and Means', title: 'Member', rank: '' },
                    { name: 'Subcommittee on Trade', title: 'Chairman', rank: '1' }
                ],
                'S000522': [ // Chris Smith (NJ-04)
                    { name: 'Committee on Foreign Affairs', title: 'Member', rank: '' },
                    { name: 'Committee on Veterans\' Affairs', title: 'Member', rank: '' }
                ],
                'S001195': [ // Jason Smith (MO-08)
                    { name: 'Committee on Ways and Means', title: 'Chairman', rank: '1' },
                    { name: 'Committee on the Budget', title: 'Member', rank: '' }
                ]
            };

            // Return committee data if available, otherwise return empty array
            return committeeMap[bioguideID] || [];
        };

        const filteredMembers = members.filter(member => {
            if (!member) return false;
            
            // Handle nested member-info structure from House.gov JSON API
            const memberInfo = member['member-info'] || member;
            
            const firstname = (memberInfo.firstname || member.firstname || '').toLowerCase();
            const lastname = (memberInfo.lastname || member.lastname || '').toLowerCase();
            const party = (memberInfo.party || member.party || '').toLowerCase();
            const state = (memberInfo.state ? (memberInfo.state['postal-code'] || memberInfo.state) : member.state || '').toLowerCase();
            const district = (memberInfo.district || member.district || '').toLowerCase();
            const listingName = (member.listing_name || member['housegov-display-name'] || member.namelist || '').toLowerCase();
            const bioguideID = (memberInfo.bioguideID || member.bioguide_id || '').toLowerCase();
            
            // Create combined state-district formats handling both ordinal (1st, 2nd) and numeric (01, 02) formats
            const stateDistrict = district ? `${state}-${district}`.toLowerCase() : state;
            const stateDistrictNoDash = district ? `${state}${district}`.toLowerCase() : state;
            
            // Also create numeric versions for user searches like "az02" to match "AZ-2nd"
            let stateDistrictNumeric = '';
            let stateDistrictNoDashNumeric = '';
            if (district) {
                // Convert ordinal to numeric (1st->01, 2nd->02, etc.)
                const numericDistrict = district.replace(/(\d+)(st|nd|rd|th)/i, '$1').padStart(2, '0');
                stateDistrictNumeric = `${state}-${numericDistrict}`.toLowerCase();
                stateDistrictNoDashNumeric = `${state}${numericDistrict}`.toLowerCase();
            }
            
            const fullName = `${firstname} ${lastname}`.toLowerCase();

            return firstname.includes(searchTerm) ||
                   lastname.includes(searchTerm) ||
                   fullName.includes(searchTerm) ||
                   party.includes(searchTerm) ||
                   state.includes(searchTerm) ||
                   district.includes(searchTerm) ||
                   stateDistrict.includes(searchTerm) ||
                   stateDistrictNoDash.includes(searchTerm) ||
                   stateDistrictNumeric.includes(searchTerm) ||
                   stateDistrictNoDashNumeric.includes(searchTerm) ||
                   listingName.includes(searchTerm) ||
                   bioguideID.includes(searchTerm);
        });

        filteredMembers.forEach(member => {
            // Handle nested member-info structure from House.gov JSON API
            const memberInfo = member['member-info'] || member;
            
            const firstname = capitalizeWords(memberInfo.firstname || member.firstname || '');
            const lastname = capitalizeWords(memberInfo.lastname || member.lastname || '');
            const party = capitalizeWords(memberInfo.party || member.party || '');
            const state = capitalizeWords(memberInfo.state ? (memberInfo.state['postal-code'] || memberInfo.state) : member.state || '');
            const district = capitalizeWords(memberInfo.district || member.district || '');
            const bioguideID = memberInfo.bioguideID || member.bioguide_id || '';
            const phone = memberInfo.phone || member.phone || '';
            const office = (memberInfo['office-building'] && memberInfo['office-room']) ?
                          `${memberInfo['office-building']} ${memberInfo['office-room']}` :
                          (member.office || '');
            const website = member.website || member.websiteURL || member.website_url || '';

            const fullName = `${firstname} ${lastname}`.trim() || member['housegov-display-name'] || member.namelist || 'Unknown Member';
            const stateDistrict = district ? `${state}-${district}` : state;

            // Extract committee information
            // Since House.gov API doesn't include committee data, we'll use sample data
            // for demonstration. In production, this would fetch from Congress.gov API.
            const committees = getSampleCommitteeData(bioguideID, fullName);

            // Format committee information
            let committeesHTML = `
                <div class="committees-section">
                    <button class="committees-toggle" aria-expanded="false">
                        <i class="fas fa-chevron-down"></i> Committees ${committees.length ? `(${committees.length})` : ''}
                    </button>
                    <div class="committees-content" hidden>
                        ${committees.length ? 
                            committees.map(committee => `
                                <div class="committee-item">
                                    <strong>${committee.name}</strong>
                                    ${committee.title ? `<div class="committee-title">${committee.title}</div>` : ''}
                                    ${committee.rank ? `<div class="committee-rank">Rank: ${committee.rank}</div>` : ''}
                                </div>
                            `).join('') : 
                            '<div class="committee-item">No committee assignments found</div>'
                        }
                    </div>
                </div>`;

            results += `
<div class="wrapper">
  <div class="result">
    <div class="details">
      <div class="name-container">
        <div class="name-row">
          <div class="name">
            <strong>${fullName} (${party})</strong>
          </div>
          <span class="copy-icon">${createCopyIcon(fullName, 'Name')}</span>
        </div>
        <div class="state-district">${stateDistrict}</div>
      </div>
      <div class="office-details">
        ${bioguideID ? `<div class="bioguide">
          <span class="label">Bioguide ID:</span>
          <span class="info">${bioguideID}</span>
          <span class="copy-icon">${createCopyIcon(bioguideID, 'Bioguide ID')}</span>
        </div>` : ''}
        ${phone ? `<div class="phone">
          <span class="label">Phone:</span>
          <span class="info">${phone}</span>
          <span class="copy-icon">${createCopyIcon(phone, 'Phone')}</span>
        </div>` : ''}
        ${office ? `<div class="office">
          <span class="label">Office:</span>
          <span class="info">${office}</span>
          <span class="copy-icon">${createCopyIcon(office, 'Office')}</span>
        </div>` : ''}
        ${committeesHTML}
        ${website ? `<div class="links">
          <a class="website" href="${website}" target="_blank">Visit Website</a>
        </div>` : ''}
      </div>
    </div>
  </div>
</div>`;
        });
        
        document.getElementById('results').innerHTML = results || '<div class="no-results">No members found matching your search.</div>';

        // Add event listeners for copy icons
        document.querySelectorAll('.icon').forEach(icon => {
            icon.addEventListener('click', (event) => {
                const text = event.currentTarget.getAttribute('data-text');
                const id = event.currentTarget.getAttribute('data-id');
                copyToClipboard(text, id);
            });
        });

        // Add event listeners for committee toggles
        document.querySelectorAll('.committees-toggle').forEach(toggle => {
            toggle.addEventListener('click', (event) => {
                const button = event.currentTarget;
                const content = button.nextElementSibling;
                const isExpanded = button.getAttribute('aria-expanded') === 'true';
                
                // Toggle aria-expanded
                button.setAttribute('aria-expanded', !isExpanded);
                // Toggle hidden attribute
                content.hidden = isExpanded;
                
                // Rotate chevron icon
                const icon = button.querySelector('i');
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
            });
        });
    });
}

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
