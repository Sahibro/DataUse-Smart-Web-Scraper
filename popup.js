let scraping = false;

// UI update ke liye storage check
async function refreshCount() {
    const res = await chrome.storage.local.get(['leads']);
    if (res.leads) {
        document.getElementById('count').innerText = res.leads.length;
        document.getElementById('downloadBtn').style.display = 'block';
    }
}
refreshCount();

document.getElementById('startBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url.includes("google.com/maps")) {
        alert("Pehle Google Maps search results kholiye!");
        return;
    }
    document.getElementById('startBtn').innerText = "SCRAPING...";
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: startSmartScraping });
});

document.getElementById('stopBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { window.stopExtraction = true; } });
    document.getElementById('startBtn').innerText = "START SCRAPING";
});

// --- MAIN FUNCTION (Browser Context) ---
async function startSmartScraping() {
    window.stopExtraction = false;
    const storage = await chrome.storage.local.get(['leads']);
    let leads = storage.leads || [];
    let processedNames = new Set(leads.map(l => l.name));

    const scrollContainer = document.querySelector('div[role="feed"]');

    while (!window.stopExtraction) {
        const cards = document.querySelectorAll('a[href*="/maps/place/"]');
        
        for (let card of cards) {
            if (window.stopExtraction) break;

            const cardName = card.getAttribute('aria-label');
            if (!cardName || processedNames.has(cardName)) continue;

            // 1. Click karo shop par
            card.click();
            
            // 2. WAIT LOGIC: Tab tak wait karo jab tak detail panel mein sahi naam na aa jaye
            let isPanelReady = false;
            for (let i = 0; i < 15; i++) { // Max 3 seconds wait
                const panelTitle = document.querySelector('h1.fontHeadlineLarge')?.innerText;
                if (panelTitle === cardName) {
                    isPanelReady = true;
                    break;
                }
                await new Promise(r => setTimeout(r, 200)); 
            }

            if (!isPanelReady) continue; // Agar panel update nahi hua toh skip karein

            // 3. AB DATA UTHAO (Panel ab sahi shop ka hai)
            const detailPanel = document.body;

            // Website dhoondhne ka sabse satik tarika
            const webEl = document.querySelector('a[data-item-id="authority"]');
            const website = webEl ? webEl.href : "N/A";

            // Phone dhoondhne ka sabse satik tarika
            const phoneEl = document.querySelector('button[data-item-id^="phone:tel:"]');
            let phone = "N/A";
            if (phoneEl) {
                phone = phoneEl.getAttribute('data-item-id').replace('phone:tel:', '');
            } else {
                // Alternative phone check
                const phoneMatch = detailPanel.innerText.match(/(\+?\d{1,4}[- ]?)?\(?\d{3,4}\)?[- ]?\d{3,4}[- ]?\d{4}/g);
                phone = phoneMatch ? phoneMatch[0] : "N/A";
            }

            // Rating
            const ratingEl = document.querySelector('div.F7nice span span[aria-hidden="true"]');
            const rating = ratingEl ? ratingEl.innerText : "N/A";

            // 4. Save Leads
            leads.push({
                name: cardName.replace(/,/g, ""),
                phone: phone,
                website: website,
                rating: rating
            });

            processedNames.add(cardName);
            await chrome.storage.local.set({ leads: leads });
            
            card.scrollIntoView();
        }

        // Scroll for more
        if (scrollContainer) {
            scrollContainer.scrollBy(0, 500);
            await new Promise(r => setTimeout(r, 2000));
        }
        if (cards.length === 0) break;
    }
}

// Storage Listener
chrome.storage.onChanged.addListener((changes) => {
    if (changes.leads) {
        document.getElementById('count').innerText = changes.leads.newValue.length;
        document.getElementById('downloadBtn').style.display = 'block';
    }
});

// CSV Download
document.getElementById('downloadBtn').addEventListener('click', async () => {
    const res = await chrome.storage.local.get(['leads']);
    if (!res.leads || res.leads.length === 0) return;

    let csv = "Business Name,Phone,Website,Rating\n";
    res.leads.forEach(l => {
        csv += `"${l.name}","${l.phone}","${l.website}","${l.rating}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Satik_Leads_${new Date().getTime()}.csv`;
    a.click();
    chrome.storage.local.clear();
});
