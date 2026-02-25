document.getElementById('btn').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
            // Advanced Selectors for Google Maps
            const items = Array.from(document.querySelectorAll('.Nv2Y9b')); // Each business card
            let leads = [];

            items.forEach(card => {
                const name = card.querySelector('.qBF1Pd')?.innerText || "N/A";
                const rating = card.querySelector('.MW4T7d')?.innerText || "N/A";
                // Phone aur Website nikalne ke liye specific selectors
                const infoLines = Array.from(card.querySelectorAll('.W4Efsf')).map(el => el.innerText).join(" ");
                
                leads.push({
                    name: name.replace(/,/g, ""), 
                    rating: rating,
                    info: infoLines.replace(/,/g, " | ")
                });
            });

            if (leads.length === 0) {
                alert("DataUse 📊: No leads found! Please scroll the list first.");
                return;
            }

            // Professional CSV Formatting
            let csvContent = "data:text/csv;charset=utf-8,Name,Rating,Details\n" + 
                             leads.map(l => `${l.name},${l.rating},${l.info}`).join("\n");
            
            let encodedUri = encodeURI(csvContent);
            let link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "DataUse_Premium_Leads.csv");
            document.body.appendChild(link);
            link.click();
            
            alert(`DataUse 📊: ${leads.length} Professional Leads Downloaded!`);
        }
    });
});
