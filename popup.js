document.getElementById('btn').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Google Maps se data extract karne ka logic
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
            const items = Array.from(document.querySelectorAll('.qBF1Pd')).map(i => i.innerText);
            
            if (items.length === 0) {
                alert("DataUse 📊: No leads found! Please search on Google Maps first.");
                return;
            }

            // CSV File Banane ka Logic (Zero Server Cost)
            let csvContent = "data:text/csv;charset=utf-8,Business Name\n" + items.join("\n");
            let encodedUri = encodeURI(csvContent);
            let link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "DataUse_Leads.csv");
            document.body.appendChild(link);
            link.click(); // Automatic Download
            
            alert("DataUse 📊: " + items.length + " leads downloaded as CSV!");
        }
    });
});
