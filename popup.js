document.getElementById('btn').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // URL चेक को फ्लेक्सिबल बनाया ताकि कोई एरर न आए
    if (!tab.url.includes("google")) {
        alert("❌ पहले Google Maps सर्च पेज पर जाएं!");
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: async () => {
            // 1. जबरदस्ती स्क्रॉलिंग (Brute Force Scroll)
            async function autoScroll() {
                const selectors = ['div[role="feed"]', '.m6B6fc', '.section-scrollable-y', '.scrollable-y'];
                let container = null;
                for (let s of selectors) {
                    container = document.querySelector(s);
                    if (container) break;
                }
                if (!container) container = window;

                for (let i = 0; i < 10; i++) {
                    container.scrollBy(0, 1000);
                    await new Promise(r => setTimeout(r, 1500));
                }
            }

            await autoScroll();

            // 2. डेटा का शिकार (Deep Extraction)
            const cards = Array.from(document.querySelectorAll('.Nv2Y9b, .Ua6pS, .VkpSyc, .hfpxzc'));
            let leads = [];

            cards.forEach(card => {
                try {
                    // नाम निकालने के मल्टीपल तरीके
                    const name = card.querySelector('.qBF1Pd, .fontHeadlineSmall, .header-title')?.innerText?.replace(/"/g, '""') || "N/A";
                    
                    // रेटिंग - aria-label से डेटा निचोड़ना
                    const ratingSpan = card.querySelector('span[aria-label*="stars"]');
                    const rating = ratingSpan ? (ratingSpan.getAttribute('aria-label') || "N/A").split(" ")[0] : "N/A";
                    
                    // वेबसाइट - सटीक एट्रिब्यूट से
                    const website = card.querySelector('a[aria-label*="Website"]')?.href || "N/A";
                    
                    // फोन नंबर - Regex से पूरे टेक्स्ट में सर्च (Crash-proof)
                    const allText = card.innerText || "";
                    const phoneMatch = allText.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/);
                    const phone = (phoneMatch && phoneMatch[0]) ? phoneMatch[0].trim() : "N/A";

                    if (name !== "N/A") {
                        leads.push({ name, rating, phone, website });
                    }
                } catch (e) { console.error("Skipped one record"); }
            });

            return leads;
        }
    }, (results) => {
        if (!results || !results[0] || !results[0].result || results[0].result.length === 0) {
            alert("❌ कचरा! कोई डेटा नहीं मिला। पेज को पूरी तरह लोड होने दें और फिर ट्राई करें।");
            return;
        }

        const leads = results[0].result;
        
        // 3. बुलेटप्रूफ CSV फ़ॉर्मेटिंग (UTF-8 BOM Excel के लिए)
        let csv = "\uFEFFBusiness Name,Rating,Phone Number,Website\n";
        leads.forEach(l => {
            csv += `"${l.name}","${l.rating}","${l.phone}","${l.website}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const reader = new FileReader();
        reader.onload = function() {
            chrome.downloads.download({
                url: reader.result,
                filename: `DataUse_PRO_Leads_${Date.now()}.csv`,
                saveAs: true
            });
        };
        reader.readAsDataURL(blob);

        alert(`✅ SUCCESS! ${leads.length} प्रीमियम लीड्स डाउनलोड हो गई हैं।`);
    });
});
