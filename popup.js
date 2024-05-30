document.getElementById('searchField').addEventListener('input', () => {
    const searchTerm = document.getElementById('searchField').value.toLowerCase();
    fetch(chrome.runtime.getURL('xml/members.xml'))
        .then(response => response.text())
        .then(str => (new window.DOMParser()).parseFromString(str, 'text/xml'))
        .then(data => {
            const members = data.getElementsByTagName('Member');
            let results = '';

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
              <strong>${capitalizeWords(prefix)} ${capitalizeWords(firstname)} ${capitalizeWords(middleName)} ${capitalizeWords(lastname)} ${capitalizeWords(suffix)} (${capitalizeWords(party)})</strong><br>
              ${capitalizeWords(state)} - District ${capitalizeWords(district)}<br>
              Office ID: ${officeID.toUpperCase()}<br>
              Bioguide ID: ${bioguideID}<br>
              Office Audit ID: ${officeAuditID}<br>
              <a href="${website}" target="_blank">Website</a>
            </div>`;
                }
            }
            document.getElementById('results').innerHTML = results;
        });
});
