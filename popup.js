document.getElementById('searchField').addEventListener('input', () => {
    const searchTerm = document.getElementById('searchField').value.toLowerCase();

    // Fetch the XML data from local storage
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
            <div class="result">
              <img src="${photoURL}" alt="Photo of ${capitalizeWords(firstname)} ${capitalizeWords(lastname)}">
              <div class="details">
                <div><strong>${capitalizeWords(prefix)} ${capitalizeWords(firstname)} ${capitalizeWords(middleName)} ${capitalizeWords(lastname)} ${capitalizeWords(suffix)} (${capitalizeWords(party)})</strong></div>
                <div>${capitalizeWords(state)} - District ${capitalizeWords(district)}</div>
                <div class="spacing">Office ID: <span>${officeID.toUpperCase()}</span>${createCopyIcon(officeID.toUpperCase(), 'Office ID')}</div>
                <div>Bioguide ID: <span>${bioguideID}</span>${createCopyIcon(bioguideID, 'Bioguide ID')}</div>
                <div>Office Audit ID: <span>${officeAuditID}</span>${createCopyIcon(officeAuditID, 'Office Audit ID')}</div>
              </div>
              <a class="website" href="${website}" target="_blank">Website</a>
            </div>`;
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
});

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
