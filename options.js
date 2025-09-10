document.getElementById('updateButton').addEventListener('click', () => {
    const url = 'https://member-info.house.gov/members.xml';
    fetch(url)
        .then(response => response.text())
        .then(data => {
            // Save the downloaded XML data to local storage
            chrome.storage.local.set({ membersXML: data }, () => {
                document.getElementById('status').innerText = 'XML file updated successfully!';
            });
        })
        .catch(error => {
            document.getElementById('status').innerText = 'Failed to update XML file.';
            console.error('Error fetching the XML file:', error);
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