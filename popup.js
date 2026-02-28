// UI Load setup
chrome.storage.local.get(['leads'], (res) => {
    if (res.leads && res.leads.length > 0) {
        document.getElementById('count').innerText = res.leads.length;
        document.getElementById('downloadBtn').style.display = 'block';
    }
});

document.getElementById('startBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url.includes("google.com/maps")) {
        alert("Pehle Google Maps par results search karein!");
        return;
    }
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'block';
    document.getElementById('statusText').innerText = "Scraping... Please wait";
    
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: runScraper });
});

document.getElementById('stopBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { window.stopExtraction = true; } });
    
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('stopBtn').style.display = 'none';
    document.getElementById('statusText').innerText = "Stopped";
});

// --- THIS RUNS IN THE TAB ---
async function runScraper() {
    window.stopExtraction = false;
    let leads = [];
    const processed = new Set();

    // Load existing
    const store = await chrome.storage.local.get(['leads']);
    if (store.leads) {
        leads = store.leads;
        leads.forEach(l => processed.add(l.name));
    }

    const scrollDiv = document.querySelector('div[role="feed"]') || window;

    while (!window.stopExtraction) {
        const items = document.querySelectorAll('a[href*="/maps/place/"]');
        
        for (let item of items) {
            if (window.stopExtraction) break;

            const name = item.getAttribute('aria-label');
            if (!name || processed.has(name)) continue;

            // Deep Click
            item.click();
            await new Promise(r => setTimeout(r, 2500)); // Panel loading time

            // Extract Data
            const websiteEl = document.querySelector('a[data-item-id="authority"], a[aria-label*="website"]');
            const phoneEl = document.querySelector('button[data-item-id^="phone:tel:"], a[data-item-id^="phone:tel:"]');
            const ratingEl = document.querySelector('span[aria-label*="stars"]');

            const phone = phoneEl ? phoneEl.getAttribute('data-item-id').replace('phone:tel:', '') : "N/A";
            const website = websiteEl ? websiteEl.href : "N/A";
            const rating = ratingEl ? ratingEl.getAttribute('aria-label').split(' ')[0] : "N/A";

            leads.push({
                name: name.replace(/"/g, '""'),
                phone: phone,
                website: website,
                rating: rating
            });
            processed.add(name);

            // Save immediately
            await chrome.storage.local.set({ leads: leads });
            item.scrollIntoView();
        }

        // Auto Scroll
        if (scrollDiv) {
            scrollDiv.scrollBy(0, 600);
            await new Promise(r => setTimeout(r, 2000));
        }
        
        if (items.length === 0) break;
    }
}

// Live UI Update
chrome.storage.onChanged.addListener((changes) => {
    if (changes.leads) {
        document.getElementById('count').innerText = changes.leads.newValue.length;
        document.getElementById('downloadBtn').style.display = 'block';
    }
});

// DOWNLOAD LOGIC (Satik Fix)
document.getElementById('downloadBtn').addEventListener('click', async () => {
    const res = await chrome.storage.local.get(['leads']);
    if (!res.leads || res.leads.length === 0) return;

    let csvContent = "\ufeff"; // BOM for Excel formatting
    csvContent += "Business Name,Phone,Website,Rating\n";
    
    res.leads.forEach(l => {
        csvContent += `"${l.name}","${l.phone}","${l.website}","${l.rating}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.href = url;
    link.download = `Leads_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);

    // Optional: chrome.storage.local.clear(); // Download ke baad clear karna ho toh
});
