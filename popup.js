let scraping = false;

chrome.storage.local.get(['leads'], (res) => {
    if (res.leads) {
        document.getElementById('count').innerText = res.leads.length;
        document.getElementById('downloadBtn').style.display = 'block';
    }
});

document.getElementById('startBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url.includes("google.com/maps")) {
        alert("Pehle Google Maps par kuch search karein!");
        return;
    }
    document.getElementById('startBtn').innerText = "RUNNING...";
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: startMapsScraping });
});

document.getElementById('stopBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { window.stopScraping = true; } });
    document.getElementById('startBtn').innerText = "START SCRAPING";
});

// --- YE FUNCTION GOOGLE MAPS KE PAGE PAR CHALTA HAI ---
function startMapsScraping() {
    window.stopScraping = false;
    let leads = [];

    const scrollContainer = document.querySelector('div[role="feed"]') || window;

    const interval = setInterval(() => {
        if (window.stopScraping) {
            clearInterval(interval);
            return;
        }

        scrollContainer.scrollBy(0, 700);

        // Sabhi result cards ko dhoondhna (Google Maps uses role="article" or specific links)
        const cards = document.querySelectorAll('div[role="article"], a[href*="/maps/place/"]');

        cards.forEach(card => {
            // Agar card 'a' tag hai toh uska parent container lo, varna card khud container hai
            const container = card.tagName === 'A' ? card.closest('div[role="article"]') : card;
            if (!container) return;

            // 1. NAME (Har card mein 'fontHeadlineSmall' class abhi standard hai)
            const nameEl = container.querySelector('.fontHeadlineSmall');
            const name = nameEl ? nameEl.innerText : "";

            if (name && !leads.find(l => l.name === name)) {
                
                // 2. RATING (Aria-label se nikalna sabse satik hai)
                const ratingEl = container.querySelector('span[aria-label*="stars"]');
                const rating = ratingEl ? ratingEl.getAttribute('aria-label').split(' ')[0] : "N/A";

                // 3. WEBSITE (Aria-label="Website" wale link ko dhoondho)
                const webEl = container.querySelector('a[aria-label*="Website"], a[aria-label*="website"]');
                const website = webEl ? webEl.href : "N/A";

                // 4. PHONE (SABSE ZAROORI: Poore card ka text scan karo)
                // Hum card ke andar ke sabhi spans ko check karte hain jisme number jaisa kuch ho
                let phone = "N/A";
                const cardText = container.innerText;
                const phoneRegex = /(\+?\d{1,4}[- ]?)?\(?\d{3,4}\)?[- ]?\d{3,4}[- ]?\d{4}/g;
                const matches = cardText.match(phoneRegex);
                
                if (matches) {
                    // Filter: Numbers jo bahut chhote hain (jaise rating ya timing) unhe hatao
                    const validPhone = matches.find(m => m.replace(/\D/g, '').length >= 10);
                    phone = validPhone || "N/A";
                }

                leads.push({
                    name: name.replace(/,/g, ""),
                    rating: rating,
                    website: website,
                    phone: phone
                });
            }
        });

        chrome.storage.local.set({ leads: leads });
    }, 2000);
}

// Live Counter Update
chrome.storage.onChanged.addListener((changes) => {
    if (changes.leads) {
        document.getElementById('count').innerText = changes.leads.newValue.length;
        document.getElementById('downloadBtn').style.display = 'block';
    }
});

// CSV Download
document.getElementById('downloadBtn').addEventListener('click', async () => {
    const res = await chrome.storage.local.get(['leads']);
    if (!res.leads) return;

    let csv = "Name,Rating,Phone,Website\n";
    res.leads.forEach(l => {
        csv += `"${l.name}","${l.rating}","${l.phone}","${l.website}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GoogleMaps_Leads.csv`;
    a.click();
    chrome.storage.local.clear();
});
