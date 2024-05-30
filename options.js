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
