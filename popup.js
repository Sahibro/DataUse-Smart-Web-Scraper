document.getElementById('btn').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // चेक करें कि यूज़र गूगल मैप्स पर है या नहीं
    if (!tab.url.includes("://google.com")) {
        alert("कृपया पहले Google Maps पर जाकर कुछ सर्च करें!");
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: async () => {
            // 1. स्मार्ट ऑटो-स्क्रॉल
            async function autoScroll(container) {
                for (let i = 0; i < 10; i++) { 
                    container.scrollBy(0, 1000);
                    await new Promise(r => setTimeout(r, 1500)); 
                }
            }

            const scrollContainer = document.querySelector('div[role="feed"]');
            if (scrollContainer) await autoScroll(scrollContainer);

            // 2. डेटा एक्सट्रैक्शन
            const items = Array.from(document.querySelectorAll('.Nv2Y9b, .Ua6pS, .VkpSyc'));
            let leads = [];

            items.forEach(card => {
                try {
                    const name = card.querySelector('.qBF1Pd, .fontHeadlineSmall')?.innerText?.replace(/,/g, "") || "N/A";
                    
                    const ratingLabel = card.querySelector('span[aria-label*="stars"]')?.getAttribute('aria-label');
                    const rating = ratingLabel ? ratingLabel.split(" ")[0] : "N/A";
                    
                    const website = card.querySelector('a[aria-label*="Website"]')?.href || "N/A";
                    
                    const allText = card.innerText || "";
                    const phoneMatch = allText.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/);
                    const phone = phoneMatch ? phoneMatch[0].trim() : "N/A";

                    if (name !== "N/A") {
                        leads.push({ name, rating, phone, website });
                    }
                } catch (e) { console.error("Skipping record"); }
            });

            return leads;
        }
    }, (results) => {
        if (!results || !results[0].result || results[0].result.length === 0) {
            alert("कोई डेटा नहीं मिला! कृपया लिस्ट को लोड होने दें।");
            return;
        }

        const leads = results[0].result;

        // 3. प्रोफेशनल CSV फॉर्मेटिंग
        let csvContent = "Business Name,Rating,Phone Number,Website\n";
        leads.forEach(l => {
            // कॉमा और कोट्स को हैंडल करना ताकि Excel खराब न हो
            const row = [
                `"${l.name.replace(/"/g, '""')}"`,
                `"${l.rating}"`,
                `"${l.phone}"`,
                `"${l.website}"`
            ].join(",");
            csvContent += row + "\n";
        });

        // 4. सुरक्षित डाउनलोड (Chrome Downloads API)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const reader = new FileReader();
        reader.onload = function() {
            chrome.downloads.download({
                url: reader.result,
                filename: `DataUse_Leads_${new Date().getTime()}.csv`,
                saveAs: true
            });
        };
        reader.readAsDataURL(blob);

        alert(`सफलता! ${leads.length} लीड्स डाउनलोड के लिए तैयार हैं।`);
    });
});
