document.addEventListener('DOMContentLoaded', function() {
    loadChanges();
});

function loadChanges() {
    chrome.storage.local.get(['latestChanges'], function(result) {
        const changesContent = document.getElementById('changesContent');
        const timestampElement = document.getElementById('timestamp');
        
        if (result.latestChanges) {
            const changes = result.latestChanges;
            timestampElement.textContent = `Last updated: ${new Date(changes.timestamp).toLocaleString()}`;
            
            let hasAnyChanges = changes.added.length > 0 || 
                              changes.removed.length > 0 || 
                              changes.modified.length > 0;
            
            if (!hasAnyChanges) {
                changesContent.innerHTML = `
                    <div class="no-changes">
                        <i class="fas fa-check-circle"></i>
                        <p>No changes detected in the latest XML update.</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            
            // Added members section
            if (changes.added.length > 0) {
                html += `
                    <div class="changes-section added-section">
                        <h2><i class="fas fa-plus-circle"></i> Added Members (${changes.added.length})</h2>
                `;
                
                changes.added.forEach(member => {
                    html += createMemberChangeHTML(member, 'added');
                });
                
                html += '</div>';
            }
            
            // Removed members section
            if (changes.removed.length > 0) {
                html += `
                    <div class="changes-section removed-section">
                        <h2><i class="fas fa-minus-circle"></i> Removed Members (${changes.removed.length})</h2>
                `;
                
                changes.removed.forEach(member => {
                    html += createMemberChangeHTML(member, 'removed');
                });
                
                html += '</div>';
            }
            
            // Modified members section
            if (changes.modified.length > 0) {
                html += `
                    <div class="changes-section modified-section">
                        <h2><i class="fas fa-edit"></i> Modified Members (${changes.modified.length})</h2>
                `;
                
                changes.modified.forEach(change => {
                    html += createModifiedMemberHTML(change);
                });
                
                html += '</div>';
            }
            
            changesContent.innerHTML = html;
            
        } else {
            changesContent.innerHTML = `
                <div class="no-changes">
                    <i class="fas fa-info-circle"></i>
                    <p>No change data available. Changes will be tracked after the next XML update.</p>
                </div>
            `;
            timestampElement.textContent = '';
        }
    });
}

function createMemberChangeHTML(member, changeType) {
    const fullName = `${member.firstname} ${member.lastname}`.trim();
    const party = member.party || '';
    const stateDistrict = `${member.state || ''} ${member.district || ''}`.trim();
    const committees = member.committees && member.committees.length > 0 ? 
                      member.committees.join(', ') : 'No committees';
    
    return `
        <div class="member-change">
            <div class="member-name">${fullName} (${party})</div>
            <div class="member-details">
                <div><strong>State/District:</strong> ${stateDistrict}</div>
                <div><strong>Office ID:</strong> ${member.office_id || 'N/A'}</div>
                <div><strong>Phone:</strong> ${member.phone || 'N/A'}</div>
                <div><strong>Office:</strong> ${member.room_num || ''} ${member.HOB || ''}</div>
                <div><strong>Committees:</strong> ${committees}</div>
                ${member.websiteURL ? `<div><strong>Website:</strong> <a href="${member.websiteURL}" target="_blank">${member.websiteURL}</a></div>` : ''}
            </div>
        </div>
    `;
}

function createModifiedMemberHTML(change) {
    const previous = change.previous;
    const current = change.current;
    
    const fullName = `${current.firstname} ${current.lastname}`.trim();
    const party = current.party || '';
    
    let html = `
        <div class="member-change">
            <div class="member-name">${fullName} (${party})</div>
            <div class="change-diff">
    `;
    
    // Compare each field and show differences
    const fields = [
        { key: 'firstname', label: 'First Name' },
        { key: 'lastname', label: 'Last Name' },
        { key: 'party', label: 'Party' },
        { key: 'state', label: 'State' },
        { key: 'district', label: 'District' },
        { key: 'office_id', label: 'Office ID' },
        { key: 'phone', label: 'Phone' },
        { key: 'room_num', label: 'Room Number' },
        { key: 'HOB', label: 'House Office Building' },
        { key: 'websiteURL', label: 'Website' }
    ];
    
    fields.forEach(field => {
        const prevValue = previous[field.key] || '';
        const currValue = current[field.key] || '';
        
        if (prevValue !== currValue) {
            html += `
                <div><strong>${field.label}:</strong> 
                    <span class="diff-removed">${prevValue || '(empty)'}</span> → 
                    <span class="diff-added">${currValue || '(empty)'}</span>
                </div>
            `;
        }
    });
    
    // Compare committees
    const prevCommittees = previous.committees || [];
    const currCommittees = current.committees || [];
    
    if (JSON.stringify(prevCommittees.sort()) !== JSON.stringify(currCommittees.sort())) {
        html += `
            <div><strong>Committees:</strong><br>
                <span class="diff-removed">- ${prevCommittees.join(', ') || '(none)'}</span><br>
                <span class="diff-added">+ ${currCommittees.join(', ') || '(none)'}</span>
            </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}