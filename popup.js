document.getElementById('btn').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: async () => {
            // ============================================
            // 1. स्मार्ट ऑटो-स्क्रॉल फंक्शन
            // ============================================
            async function autoScroll(container) {
                try {
                    for (let i = 0; i < 8; i++) { 
                        container.scrollBy(0, 800);
                        await new Promise(resolve => setTimeout(resolve, 1500)); 
                    }
                    console.log("✅ Scrolling completed");
                } catch (error) {
                    console.error("❌ Scroll error:", error);
                }
            }

            // ============================================
            // 2. Scroll Container खोजें
            // ============================================
            const scrollContainer = document.querySelector(
                'div[role="feed"], .section-scrollable, [role="main"]'
            );

            if (!scrollContainer) {
                throw new Error("❌ Google Maps feed container नहीं मिला। कृपया Google Maps में search करें।");
            }

            await autoScroll(scrollContainer);

            // ============================================
            // 3. डेटा एक्सट्रैक्शन (सभी selectors के साथ)
            // ============================================
            const items = Array.from(
                document.querySelectorAll(
                    '.Nv2Y9b, .Ua6pS, .VkpSyc, [data-index], .jANwpb, div[role="listitem"]'
                )
            );

            if (items.length === 0) {
                throw new Error("❌ कोई Business listing नहीं मिली। कृपया search करने के बाद try करें।");
            }

            console.log(`📊 कुल ${items.length} listings मिलीं`);

            let leads = [];

            // ============================================
            // 4. हर Business से डेटा निकालें
            // ============================================
            items.forEach((card, index) => {
                try {
                    // --------- नाम निकालना ---------
                    const nameElement = card.querySelector(
                        '.qBF1Pd, .fontHeadlineSmall, [role="heading"], h3'
                    );
                    const name = nameElement?.innerText?.replace(/,/g, "")?.trim() || "N/A";

                    // --------- रेटिंग निकालना ---------
                    const ratingSpan = card.querySelector('span[aria-label*="stars"]');
                    const ratingLabel = ratingSpan?.getAttribute('aria-label') || "";
                    const rating = ratingLabel ? ratingLabel.split(" ")[0] : "N/A";

                    // --------- Website निकालना ---------
                    const websiteLink = card.querySelector(
                        'a[data-value="Website"], a[href*="http"], [aria-label*="Website"]'
                    );
                    const website = websiteLink?.href || "N/A";

                    // --------- Phone नंबर निकालना (Improved Regex) ---------
                    const allText = card.innerText || "";
                    const phoneMatch = allText.match(
                        /(?:\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/
                    );
                    const phone = (phoneMatch && phoneMatch[0]) ? phoneMatch[0].trim() : "N/A";

                    // --------- केवल valid data को leads में add करें ---------
                    if (name !== "N/A" && name.length > 0) {
                        leads.push({
                            name: name,
                            rating: rating,
                            phone: phone,
                            website: website
                        });
                        console.log(`✅ Added: ${name}`);
                    }

                } catch (err) {
                    console.log(`⚠️ Skipping record ${index}:`, err.message);
                }
            });

            if (leads.length === 0) {
                throw new Error("❌ कोई valid data extract नहीं हो सका।");
            }

            return leads;

        }
    }, (results) => {
        // ============================================
        // 5. Results को handle करें
        // ============================================
        if (!results) {
            alert("❌ Error: Script execution failed. Please try again.");
            return;
        }

        if (!results[0]) {
            alert("❌ Error: No results returned. Please check console for errors.");
            return;
        }

        if (results[0].error) {
            alert(`❌ Error: ${results[0].error.message}`);
            return;
        }

        const leads = results[0].result;

        if (!leads || leads.length === 0) {
            alert("❌ कोई business leads नहीं मिले। कृपया Google Maps में search करें।");
            return;
        }

        // ============================================
        // 6. CSV के लिए special characters को escape करें
        // ============================================
        const escapeCSV = (str) => {
            if (!str || str === "N/A") return "N/A";
            
            str = String(str);
            
            // Double quotes को escape करें
            if (str.includes('"') || str.includes(',') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            
            return str;
        };

        // ============================================
        // 7. CSV Content बनाएं
        // ============================================
        let csvContent = "Business Name,Rating,Phone Number,Website\n";

        leads.forEach((lead) => {
            const row = [
                escapeCSV(lead.name),
                escapeCSV(lead.rating),
                escapeCSV(lead.phone),
                escapeCSV(lead.website)
            ].join(",");
            
            csvContent += row + "\n";
        });

        // ============================================
        // 8. Blob का उपयोग करके CSV download करें ✅ FIXED
        // ============================================
        try {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            
            link.setAttribute("href", url);
            
            const fileName = `Google_Maps_Leads_${new Date().getTime()}.csv`;
            link.setAttribute("download", fileName);
            
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);

            // ============================================
            // 9. Success message दिखाएं
            // ============================================
            alert(`✅ SUCCESS!\n\n${leads.length} बिज़नेस लीड्स डाउनलोड हो गई हैं।\n\nFile: ${fileName}`);
            
            console.log("📊 Extracted Leads:", leads);

        } catch (error) {
            alert(`❌ Download Error: ${error.message}`);
            console.error("Download Error:", error);
        }
    });
});
