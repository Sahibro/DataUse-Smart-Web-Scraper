let scraping = false;

// Storage se purana data load karein
chrome.storage.local.get(['leads'], (res) => {
    if (res.leads) {
        document.getElementById('count').innerText = res.leads.length;
        document.getElementById('downloadBtn').style.display = 'block';
    }
});

document.getElementById('startBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url.includes("google.com/maps")) {
        alert("Pehle Google Maps par search results kholiye!");
        return;
    }
    document.getElementById('startBtn').innerText = "SCRAPING (CLICK MODE)...";
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: startDeepScraping });
});

document.getElementById('stopBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { window.stopExtraction = true; } });
    document.getElementById('startBtn').innerText = "START SCRAPING";
});

// --- YE FUNCTION BROWSER KE ANDAR CHALEGA ---
async function startDeepScraping() {
    window.stopExtraction = false;
    let leads = [];
    const processedNames = new Set();

    const scrollContainer = document.querySelector('div[role="feed"]');

    while (!window.stopExtraction) {
        // 1. Saare visible cards dhoondho
        const cards = document.querySelectorAll('a[href*="/maps/place/"]');
        
        for (let card of cards) {
            if (window.stopExtraction) break;

            const name = card.getAttribute('aria-label');
            if (!name || processedNames.has(name)) continue;

            // 2. Card par click karo taki detail panel khule
            card.click();
            
            // 3. Wait karein (Detail panel load hone ke liye)
            await new Promise(r => setTimeout(r, 2000));

            // 4. Detail Panel se data uthao (Right side window)
            const detailPanel = document.body; // Poora body scan karein detail ke liye
            
            // --- WEBSITE ---
            const webEl = detailPanel.querySelector('a[aria-label*="website"], a[aria-label*="Website"]');
            const website = webEl ? webEl.href : "N/A";

            // --- PHONE ---
            // Google Maps phone ko aria-label="Phone: [number]" mein rakhta hai
            const phoneEl = detailPanel.querySelector('button[aria-label*="Phone:"], a[aria-label*="Phone:"]');
            let phone = "N/A";
            if (phoneEl) {
                phone = phoneEl.getAttribute('aria-label').replace('Phone: ', '').trim();
            } else {
                // Agar button nahi mila toh text scan karo
                const phoneRegex = /(\+?\d{1,4}[- ]?)?\(?\d{3,4}\)?[- ]?\d{3,4}[- ]?\d{4}/g;
                const matches = detailPanel.innerText.match(phoneRegex);
                if (matches) phone = matches[0];
            }

            // --- RATING ---
            const ratingEl = detailPanel.querySelector('div.F7nice span span[aria-hidden="true"]');
            const rating = ratingEl ? ratingEl.innerText : "N/A";

            // 5. List mein add karein
            leads.push({
                name: name.replace(/,/g, ""),
                phone: phone,
                website: website,
                rating: rating
            });

            processedNames.add(name);

            // Storage update karein taki popup dekh sake
            chrome.storage.local.set({ leads: leads });

            // 6. Scroll into view next items
            card.scrollIntoView();
        }

        // 7. Thoda aur scroll karein naye results ke liye
        if (scrollContainer) {
            scrollContainer.scrollBy(0, 500);
            await new Promise(r => setTimeout(r, 1500));
        }

        // Agar aur naye cards nahi mil rahe toh break
        if (cards.length === 0) break;
    }
}

// Counter update
chrome.storage.onChanged.addListener((changes) => {
    if (changes.leads) {
        document.getElementById('count').innerText = changes.leads.newValue.length;
        document.getElementById('downloadBtn').style.display = 'block';
    }
});

// CSV Download Logic
document.getElementById('downloadBtn').addEventListener('click', async () => {
    const res = await chrome.storage.local.get(['leads']);
    if (!res.leads) return;

    let csv = "Business Name,Phone,Website,Rating\n";
    res.leads.forEach(l => {
        csv += `"${l.name}","${l.phone}","${l.website}","${l.rating}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GoogleMaps_Deep_Leads.csv`;
    a.click();
    chrome.storage.local.clear();
});
