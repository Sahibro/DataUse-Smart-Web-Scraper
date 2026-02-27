let scrapingInterval;

// Data persistence check
chrome.storage.local.get(['leads'], (res) => {
    if (res.leads) {
        document.getElementById('count').innerText = res.leads.length;
        document.getElementById('downloadBtn').style.display = 'block';
    }
});

document.getElementById('startBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // UI Updates
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'block';
    document.getElementById('status').innerText = "Running...";

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeGoogleMapsLeads
    });
});

document.getElementById('stopBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => { window.stopExtraction = true; }
    });

    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('stopBtn').style.display = 'none';
    document.getElementById('status').innerText = "Stopped";
});

function scrapeGoogleMapsLeads() {
    window.stopExtraction = false;
    let leads = [];

    // Google Maps uses a specific feed container for results
    const scrollContainer = document.querySelector('div[role="feed"]') || window;

    const scraper = setInterval(() => {
        if (window.stopExtraction) {
            clearInterval(scraper);
            return;
        }

        // 1. Better Scroll Logic
        scrollContainer.scrollBy(0, 800);

        // 2. Data Extraction with accurate selectors
        // Nv2Ybe, lI97zE are current card classes
        const cards = document.querySelectorAll('.Nv2Ybe, .lI97zE, .Ua6G7e');

        cards.forEach(card => {
            const nameEl = card.querySelector('.fontHeadlineSmall');
            if (nameEl) {
                const name = nameEl.innerText.trim();
                
                // Prevent duplicate entries
                if (!leads.find(l => l.name === name)) {
                    
                    // PHONE: Looking for specific phone patterns in text
                    const phoneRegex = /(\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g;
                    const phoneMatch = card.innerText.match(phoneRegex);

                    // RATING: Google uses aria-labels for stars
                    const ratingEl = card.querySelector('span[aria-label*="stars"]');
                    const rating = ratingEl ? ratingEl.getAttribute('aria-label').split(' ')[0] : "N/A";

                    // REVIEWS:
                    const reviewsEl = card.querySelector('span[aria-label*="reviews"]');
                    const reviews = reviewsEl ? reviewsEl.getAttribute('aria-label').replace(/\D/g, "") : "0";

                    // WEBSITE:
                    const webEl = card.querySelector('a[aria-label*="website"]');
                    const website = webEl ? webEl.href : "N/A";

                    leads.push({
                        name: name.replace(/,/g, ""), // Remove commas for CSV
                        phone: phoneMatch ? phoneMatch[0] : "N/A",
                        website: website,
                        rating: rating,
                        reviews: reviews
                    });
                }
            }
        });

        // Sync data to storage so popup can see it
        chrome.storage.local.set({ leads: leads });

    }, 2000); // 2 seconds delay to allow for loading
}

// UI Update listener
chrome.storage.onChanged.addListener((changes) => {
    if (changes.leads) {
        document.getElementById('count').innerText = changes.leads.newValue.length;
        document.getElementById('downloadBtn').style.display = 'block';
    }
});

// CSV Download Logic
document.getElementById('downloadBtn').addEventListener('click', async () => {
    const data = await chrome.storage.local.get(['leads']);
    if (!data.leads || data.leads.length === 0) return;

    let csv = "\ufeff"; // BOM for Excel encoding
    csv += "Business Name,Phone,Website,Rating,Reviews\n";
    
    data.leads.forEach(l => {
        csv += `"${l.name}","${l.phone}","${l.website}","${l.rating}","${l.reviews}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Leads_${new Date().getTime()}.csv`;
    a.click();
    
    // Optional: Clear storage after download
    // chrome.storage.local.remove('leads');
});
