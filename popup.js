document.getElementById('btn').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: async () => {
            // 1. स्मार्ट ऑटो-स्क्रॉल
            async function autoScroll(container) {
                for (let i = 0; i < 10; i++) { 
                    container.scrollBy(0, 1000);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            const scrollContainer = document.querySelector('div[role="feed"]');
            if (scrollContainer) await autoScroll(scrollContainer);

            // 2. डेटा एक्सट्रैक्शन
            const items = Array.from(document.querySelectorAll('.Nv2Y9b, .Ua6pS, .VkpSyc'));
            let leads = [];

            items.forEach(card => {
                // नाम (Name)
                const name = card.querySelector('.qBF1Pd, .fontHeadlineSmall')?.innerText?.replace(/,/g, "") || "N/A";
                
                // रेटिंग (Rating)
                const ratingElement = card.querySelector('span[aria-label*="stars"]');
                const rating = ratingElement ? ratingElement.getAttribute('aria-label').split(" ")[0] : "N/A";
                
                // वेबसाइट (Website)
                const website = card.querySelector('a[aria-label*="Website"]')?.href || "N/A";
                
                // फोन नंबर (Phone) - सुरक्षित Regex Match
                const allText = card.innerText;
                const phoneMatch = allText.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/);
                const phone = phoneMatch ? phoneMatch[0].trim() : "N/A";

                leads.push({ name, rating, phone, website });
            });

            return leads;
        }
    }, (results) => {
        // यहाँ results[0].result का सही इस्तेमाल
        if (!results || !results[0] || !results[0].result) {
            alert("DataUse: No leads found! Please make sure you are on Google Maps results.");
            return;
        }

        const leads = results[0].result;

        // 3. प्रोफेशनल CSV फॉर्मेटिंग
        let csvContent = "data:text/csv;charset=utf-8,Business Name,Rating,Phone Number,Website\n";
        leads.forEach(l => {
            csvContent += `"${l.name}","${l.rating}","${l.phone}","${l.website}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Leads_Export_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        
        alert(`बधाई हो! ${leads.length} बिज़नेस लीड्स डाउनलोड हो गई हैं।`);
    });
});
