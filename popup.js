let searchInProgress = false;

document.getElementById('searchField').addEventListener('input', () => {
    const searchTerm = document.getElementById('searchField').value.toLowerCase();

    if (searchInProgress) {
        setTimeout(() => {
            const currentSearchTerm = document.getElementById('searchField').value.toLowerCase();
            if (currentSearchTerm === searchTerm) {
                performSearch(searchTerm);
            }
        }, 100);
        return;
    }

    performSearch(searchTerm);
    chrome.storage.local.set({
        lastSearch: {
            term: searchTerm,
            timestamp: Date.now()
        }
    });
});

document.getElementById('clearButton').addEventListener('click', () => {
    document.getElementById('searchField').value = '';
    document.getElementById('results').innerHTML = '';
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove('lastSearch');
    }
});

function restoreLastSearch() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
        return;
    }

    chrome.storage.local.get('lastSearch', result => {
        if (result.lastSearch) {
            const { term, timestamp } = result.lastSearch;
            const fifteenMinutes = 15 * 60 * 1000;

            if (Date.now() - timestamp < fifteenMinutes) {
                document.getElementById('searchField').value = term;
                performSearch(term);
            } else {
                chrome.storage.local.remove('lastSearch');
            }
        }
    });
}

function performSearch(searchTerm) {
    searchInProgress = true;
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
                const firstname = member.getAttribute('firstname') ? member.getAttribute('firstname') : '';
                const lastname = member.getAttribute('lastname') ? member.getAttribute('lastname') : '';
                const party = member.getAttribute('party') ? member.getAttribute('party').toUpperCase() : '';
                const state = member.getAttribute('state') ? member.getAttribute('state') : '';
                const district = member.getAttribute('district') ? member.getAttribute('district') : '';
                const listingName = member.getAttribute('listing_name') ? member.getAttribute('listing_name') : '';
                const officeID = member.getAttribute('office_id') ? member.getAttribute('office_id') : '';
                const website = member.getAttribute('websiteURL') ? member.getAttribute('websiteURL') : '';
                const bioguideID = member.getAttribute('bioguide_id') ? member.getAttribute('bioguide_id') : '';
                const officeAuditID = member.getAttribute('office_audit_id') ? member.getAttribute('office_audit_id') : '';
                const prefix = member.getAttribute('prefix') ? member.getAttribute('prefix') : '';
                const middleName = member.getAttribute('middle_name') ? member.getAttribute('middle_name') : '';
                const suffix = member.getAttribute('suffix') ? member.getAttribute('suffix') : '';
                const phone = member.getAttribute('phone') ? member.getAttribute('phone') : '';
                const roomNum = member.getAttribute('room_num') ? member.getAttribute('room_num') : '';
                const hob = member.getAttribute('HOB') ? member.getAttribute('HOB') : '';
                const photoURL = member.getAttribute('photoURL') ? member.getAttribute('photoURL') : '';

                if (
                    firstname.toLowerCase().includes(searchTerm) ||
                    lastname.toLowerCase().includes(searchTerm) ||
                    party.toLowerCase().includes(searchTerm) ||
                    state.toLowerCase().includes(searchTerm) ||
                    district.toLowerCase().includes(searchTerm) ||
                    listingName.toLowerCase().includes(searchTerm) ||
                    officeID.toLowerCase().includes(searchTerm) ||
                    bioguideID.toLowerCase().includes(searchTerm) ||
                    officeAuditID.toLowerCase().includes(searchTerm) ||
                    prefix.toLowerCase().includes(searchTerm) ||
                    middleName.toLowerCase().includes(searchTerm) ||
                    suffix.toLowerCase().includes(searchTerm)
                ) {
                    const fullName = `${prefix} ${firstname} ${middleName} ${lastname} ${suffix}`.replace(/\s+/g, ' ').trim();
                    const stateDistrict = `${state} ${district}`;
                    const office = `${roomNum} ${hob}`;

                    let committeesHTML = '';
                    const committeeAssignments = member.getElementsByTagName('assignment');
                    if (committeeAssignments.length > 0) {
                        committeesHTML += '<div class="committees"><span class="label">Committees:</span><ul class="committee-list">';
                        for (let assignment of committeeAssignments) {
                            committeesHTML += `<li>${assignment.textContent}</li>`;
                        }
                        committeesHTML += '</ul></div>';
                    }

                    let photoHTML = '';
                    if (photoURL) {
                        photoHTML = `<img src="${photoURL}" alt="${fullName}" class="member-photo">`;
                    }

                    results += `
<div class="wrapper">
  <div class="result">
    ${photoHTML}
    <div class="details">
      <div class="name-container">
        <div class="name-row">
          <div class="name">
            <strong>${fullName} (${party})</strong>
          </div>
          <span class="copy-icon">${createCopyIcon(fullName, 'Name')}</span>
        </div>
      </div>
      <div class="office-details">
        <div class="state-district-row">
            <span class="label">State & District:</span>
            <span class="info">${stateDistrict}</span>
            <span class="copy-icon">${createCopyIcon(stateDistrict, 'State & District')}</span>
        </div>
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
                }
            }
            document.getElementById('results').innerHTML = results;

            document.querySelectorAll('.icon').forEach(icon => {
                icon.addEventListener('click', (event) => {
                    const text = event.currentTarget.getAttribute('data-text');
                    const id = event.currentTarget.getAttribute('data-id');
                    copyToClipboard(text, id);
                });
            });
        }
        searchInProgress = false;
    });
}

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