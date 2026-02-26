document.getElementById('btn').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: async () => {
            // 1. बेहतर ऑटो-स्क्रॉल (डेटा लोड होने के लिए रुकता है)
            async function autoScroll(container) {
                for (let i = 0; i < 8; i++) { 
                    container.scrollBy(0, 800);
                    await new Promise(resolve => setTimeout(resolve, 1500)); 
                }
            }

            const scrollContainer = document.querySelector('div[role="feed"]');
            if (scrollContainer) await autoScroll(scrollContainer);

            // 2. डेटा एक्सट्रैक्शन (Name, Rating, Phone, Website)
            const items = Array.from(document.querySelectorAll('.Nv2Y9b, .Ua6pS, .VkpSyc'));
            let leads = [];

            items.forEach(card => {
                // नाम (Business Name)
                const name = card.querySelector('.qBF1Pd, .fontHeadlineSmall')?.innerText?.replace(/,/g, "") || "N/A";
                
                // रेटिंग (Rating) - aria-label से निकालना सबसे सुरक्षित है
                const ratingLabel = card.querySelector('span[aria-label*="stars"]')?.getAttribute('aria-label');
                const rating = ratingLabel ? ratingLabel.split(" ")[0] : "N/A";
                
                // वेबसाइट (Website) - अलग-अलग सेलेक्टर्स का इस्तेमाल
                const websiteLink = card.querySelector('a[aria-label*="Website"], a[data-value="Website"]');
                const website = websiteLink ? websiteLink.href : "N/A";
                
                // फोन नंबर (Phone) - कार्ड के अंदर के पूरे टेक्स्ट में सर्च
                const allText = card.innerText;
                // यह Regex भारतीय और इंटरनेशनल नंबर्स को पहचानता है
                const phoneMatch = allText.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/);
                const phone = phoneMatch ? phoneMatch[0].trim() : "N/A";

                leads.push({ name, rating, phone, website });
            });

            return leads;
        }
    }, (results) => {
        if (!results || !results[0].result) {
            alert("DataUse: No data found. Please search on Google Maps first.");
            return;
        }

        const leads = results[0].result;

        // 3. प्रोफेशनल CSV फ़ॉर्मेटिंग (एक्सेल के लिए परफेक्ट)
        let csvContent = "data:text/csv;charset=utf-8,Business Name,Rating,Phone Number,Website\n";
        leads.forEach(l => {
            csvContent += `"${l.name}","${l.rating}","${l.phone}","${l.website}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Google_Maps_Leads_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        
        alert(`सफलता! ${leads.length} बिज़नेस लीड्स डाउनलोड हो गई हैं।`);
    });
});
