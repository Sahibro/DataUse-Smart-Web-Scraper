let scrapedData = [];

document.getElementById('scrapeBtn').addEventListener('click', async () => {
    const status = document.getElementById('status');
    const tbody = document.querySelector('#resultsTable tbody');
    
    status.innerText = "Analyzing page content...";
    tbody.innerHTML = ""; // Purana data saaf karein

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Browser script execute kar raha hai
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: performScraping,
        }, (results) => {
            if (chrome.runtime.lastError) {
                status.innerText = "Error: Cannot scrape this page.";
                return;
            }

            if (results && results[0].result) {
                scrapedData = results[0].result;
                displayResults(scrapedData);
                status.innerText = `Successfully found ${scrapedData.length} items!`;
                document.getElementById('downloadBtn').style.display = 'block';
            }
        });
    } catch (err) {
        status.innerText = "Fatal Error: " + err.message;
    }
});

// Ye function Page ke context mein chalta hai
function performScraping() {
    const results = [];
    // 1. Headings nikalo
    document.querySelectorAll('h1, h2, h3').forEach(el => {
        results.push({ type: 'Heading', content: el.innerText.trim() });
    });
    // 2. Links aur unka text nikalo
    document.querySelectorAll('a').forEach(el => {
        if (el.href.startsWith('http')) {
            results.push({ type: 'Link', content: el.href });
        }
    });
    // 3. Images nikalo
    document.querySelectorAll('img').forEach(el => {
        if (el.src) {
            results.push({ type: 'Image', content: el.src });
        }
    });
    return results;
}

function displayResults(data) {
    const tbody = document.querySelector('#resultsTable tbody');
    data.slice(0, 100).forEach(item => { // Sirf top 100 ka preview dikhao
        const row = document.createElement('tr');
        row.innerHTML = `<td><b>${item.type}</b></td><td>${item.content.substring(0, 80)}...</td>`;
        tbody.appendChild(row);
    });
}

// Optimized CSV Download Logic
document.getElementById('downloadBtn').addEventListener('click', () => {
    if (scrapedData.length === 0) return;

    let csvContent = "Type,Data\n";
    scrapedData.forEach(row => {
        // CSV Injection se bachne ke liye quotes use karein
        const cleanContent = `"${row.content.replace(/"/g, '""')}"`;
        csvContent += `${row.type},${cleanContent}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", "scraped_data.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
