document.getElementById('searchField').addEventListener('input', () => {
    const searchTerm = document.getElementById('searchField').value.toLowerCase();
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
    chrome.storage.local.get('membersXML', result => {
        if (result.membersXML) {
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
                const middleName = member.getAttribute('middle_name') ? member.getAttribute('middle_name').toLowerCase() : '';
                const suffix = member.getAttribute('suffix') ? member.getAttribute('suffix').toLowerCase() : '';
                const photoURL = member.getAttribute('photoURL') ? member.getAttribute('photoURL') : '';

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
                    results += `
<div class="wrapper">
  <div class="result">
    <img src="${photoURL}" alt="Photo of ${capitalizeWords(firstname)} ${capitalizeWords(lastname)}">
    <div class="details">
      <div class="name-state-district">
        <div class="name"><strong>${capitalizeWords(prefix)} ${capitalizeWords(firstname)} ${capitalizeWords(middleName)} ${capitalizeWords(lastname)} ${capitalizeWords(suffix)} (${capitalizeWords(party)})</strong></div>
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
        </div>      <div class="links">
      <a class="website" href="${website}" target="_blank">Visit Website</a>
    </div>
      </div>
    </div>
  </div>

</div>
`;
                }
            }
            document.getElementById('results').innerHTML = results;

            // Add event listeners for copy icons
            document.querySelectorAll('.icon').forEach(icon => {
                icon.addEventListener('click', (event) => {
                    const text = event.currentTarget.getAttribute('data-text');
                    const id = event.currentTarget.getAttribute('data-id');
                    copyToClipboard(text, id);
                });
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
