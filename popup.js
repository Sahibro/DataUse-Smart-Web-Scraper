// Storage se data check karein
chrome.storage.local.get(['leads'], (res) => {
    if (res.leads && res.leads.length > 0) {
        document.getElementById('count').innerText = res.leads.length;
        document.getElementById('downloadBtn').style.display = 'block';
    }
});

document.getElementById('startBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url.includes("google.com/maps")) {
        alert("Pehle Google Maps par results search karke kholiye!");
        return;
    }
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'block';
    document.getElementById('status').innerText = "Scraping... Stay on this tab";
    
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: startUniversalScraper });
});

document.getElementById('stopBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { window.stopMapsScraper = true; } });
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('stopBtn').style.display = 'none';
    document.getElementById('status').innerText = "Stopped";
});

// --- BROWSER CONTEXT SCRIPT ---
async function startUniversalScraper() {
    window.stopMapsScraper = false;
    let leads = [];
    const seenNames = new Set();

    // Load existing leads
    const store = await chrome.storage.local.get(['leads']);
    if (store.leads) {
        leads = store.leads;
        leads.forEach(l => seenNames.add(l.name));
    }

    const scrollPanel = document.querySelector('div[role="feed"]') || window;

    while (!window.stopMapsScraper) {
        // 1. Dhoondho saare shop links (Google Maps standard link pattern)
        const itemLinks = document.querySelectorAll('a[href*="/maps/place/"]');
        
        for (let link of itemLinks) {
            if (window.stopMapsScraper) break;

            const name = link.getAttribute('aria-label');
            if (!name || seenNames.has(name)) continue;

            // 2. Click to open sidebar
            link.click();
            await new Promise(r => setTimeout(r, 2000)); // Wait for sidebar

            // 3. Extract using stable attributes (Labels & Tooltips)
            // Name: Sidebar ki main heading
            const sidebarName = document.querySelector('h1.fontHeadlineLarge')?.innerText || name;

            // Phone: Google Maps hamesha aria-label mein "Phone" ya "Copy phone" likhta hai
            const phoneEl = document.querySelector('[aria-label*="Phone"], [data-tooltip*="phone"], [data-item-id^="phone:tel:"]');
            let phone = "N/A";
            if (phoneEl) {
                // Number nikalne ke liye aria-label ya text scan
                phone = phoneEl.getAttribute('aria-label') || phoneEl.innerText;
                phone = phone.replace(/[^0-9+ ]/g, "").trim(); 
            }

            // Website: Website wala button ya link
            const webEl = document.querySelector('a[aria-label*="website"], a[data-tooltip*="website"], a[data-item-id="authority"]');
            const website = webEl ? webEl.href : "N/A";

            // Rating
            const ratingEl = document.querySelector('span[aria-label*="stars"]');
            const rating = ratingEl ? ratingEl.getAttribute('aria-label').split(' ')[0] : "N/A";

            // 4. Save if valid
            if (sidebarName) {
                leads.push({
                    name: sidebarName.replace(/,/g, ""),
                    phone: phone || "N/A",
                    website: website || "N/A",
                    rating: rating || "N/A"
                });
                seenNames.add(name);
                await chrome.storage.local.set({ leads: leads });
            }
            link.scrollIntoView();
        }

        // 5. Scroll and Wait
        scrollPanel.scrollBy(0, 500);
        await new Promise(r => setTimeout(r, 2000));

        if (itemLinks.length === 0) break;
    }
}

// Live counter listener
chrome.storage.onChanged.addListener((changes) => {
    if (changes.leads) {
        document.getElementById('count').innerText = changes.leads.newValue.length;
        document.getElementById('downloadBtn').style.display = 'block';
    }
});

// Download Logic (Tested & Fixed)
document.getElementById('downloadBtn').addEventListener('click', async () => {
    const res = await chrome.storage.local.get(['leads']);
    if (!res.leads || res.leads.length === 0) return;

    let csvContent = "\ufeffName,Phone,Website,Rating\n"; // Added BOM for Excel
    res.leads.forEach(l => {
        csvContent += `"${l.name}","${l.phone}","${l.website}","${l.rating}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GoogleMapsLeads_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    
    // Safety delay before cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 500);
});
