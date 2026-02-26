document.getElementById('btn').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: async () => {
            // 1. ऑटो-स्क्रॉल फंक्शन (ताकि ज्यादा डेटा लोड हो सके)
            async function autoScroll(container) {
                for (let i = 0; i < 5; i++) { // 5 बार स्क्रॉल करेगा, आप इसे बढ़ा सकते हैं
                    container.scrollBy(0, 1000);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // लोड होने का इंतज़ार
                }
            }

            const scrollContainer = document.querySelector('div[role="feed"]');
            if (scrollContainer) await autoScroll(scrollContainer);

            // 2. डेटा एक्सट्रैक्शन (Name, Rating, Phone, Website)
            const items = Array.from(document.querySelectorAll('.Nv2Y9b'));
            let leads = [];

            items.forEach(card => {
                const name = card.querySelector('.qBF1Pd')?.innerText?.replace(/,/g, "") || "N/A";
                const rating = card.querySelector('.MW4T7d')?.innerText || "N/A";
                const website = card.querySelector('a[aria-label*="Website"]')?.href || "N/A";
                
                // फोन नंबर निकालने के लिए Regex का उपयोग
                const allText = card.innerText;
                const phoneMatch = allText.match(/(\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/);
                const phone = phoneMatch ? phoneMatch[0] : "N/A";

                leads.push({ name, rating, phone, website });
            });

            return leads;
        }
    }, (results) => {
        const leads = results[0].result;
        if (!leads || leads.length === 0) {
            alert("DataUse: No leads found! Please search and scroll first.");
            return;
        }

        // 3. प्रोफेशनल CSV फॉर्मेटिंग
        let csvContent = "data:text/csv;charset=utf-8,Name,Rating,Phone,Website\n";
        leads.forEach(l => {
            csvContent += `${l.name},${l.rating},${l.phone},${l.website}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "DataUse_Premium_Leads.csv");
        document.body.appendChild(link);
        link.click();
        
        alert(`Success: ${leads.length} Verified Leads Downloaded!`);
    });
});
