document.getElementById('btn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    statusDiv.style.display = 'block';
    statusDiv.innerText = '⏳ Processing...';
    statusDiv.style.background = '#fff3cd';

    try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: extractData
        }, (results) => {
            if (!results || !results[0]) {
                showStatus('❌ Error: No data returned', 'danger');
                return;
            }

            if (results[0].error) {
                showStatus(`❌ ${results[0].error.message}`, 'danger');
                return;
            }

            const leads = results[0].result;
            if (!leads || leads.length === 0) {
                showStatus('❌ No leads found', 'danger');
                return;
            }

            downloadCSV(leads);
            showStatus(`✅ ${leads.length} leads downloaded!`, 'success');
        });

    } catch (error) {
        showStatus(`❌ ${error.message}`, 'danger');
    }
});

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.innerText = message;
    statusDiv.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
    statusDiv.style.color = type === 'success' ? '#155724' : '#721c24';
}

function extractData() {
    try {
        // Scroll करो
        const scrollContainer = document.querySelector('[role="feed"]') || 
                               document.querySelector('.section-scrollable') || 
                               document.querySelector('[role="main"]');

        if (!scrollContainer) {
            throw new Error('Google Maps page not detected');
        }

        // Scroll करो 8 बार
        for (let i = 0; i < 8; i++) {
            scrollContainer.scrollBy(0, 800);
        }

        // Wait करो
        setTimeout(() => {}, 2000);

        // Data निकालो
        const items = document.querySelectorAll('[data-item-id], .Nv2Y9b, [role="listitem"]');
        
        if (items.length === 0) {
            throw new Error('No businesses found');
        }

        let leads = [];

        items.forEach((item) => {
            try {
                // Name निकालो
                const nameEl = item.querySelector('h2, h3, [role="heading"], .qBF1Pd');
                const name = nameEl?.innerText?.trim() || 'N/A';

                // Rating निकालो
                const ratingEl = item.querySelector('[aria-label*="stars"]');
                const rating = ratingEl?.getAttribute('aria-label')?.split(' ')[0] || 'N/A';

                // Phone निकालो
                const allText = item.innerText || '';
                const phoneRegex = /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/;
                const phoneMatch = allText.match(phoneRegex);
                const phone = phoneMatch ? phoneMatch[0].trim() : 'N/A';

                // Website निकालो
                const websiteEl = item.querySelector('a[href*="http"]');
                const website = websiteEl?.href || 'N/A';

                // Valid data हो तो add करो
                if (name && name !== 'N/A' && name.length > 1) {
                    leads.push({
                        name: name,
                        rating: rating,
                        phone: phone,
                        website: website
                    });
                }
            } catch (e) {
                console.log('Skip item:', e.message);
            }
        });

        return leads.length > 0 ? leads : null;

    } catch (error) {
        throw new Error(error.message);
    }
}

function downloadCSV(leads) {
    // CSV content बनाओ
    let csv = 'Business Name,Rating,Phone Number,Website\n';

    leads.forEach(lead => {
        const name = escapeCSV(lead.name);
        const rating = escapeCSV(lead.rating);
        const phone = escapeCSV(lead.phone);
        const website = escapeCSV(lead.website);

        csv += `${name},${rating},${phone},${website}\n`;
    });

    // BOM add करो (Hindi support के लिए)
    const BOM = '\uFEFF';
    const csvData = BOM + csv;

    // Blob बनाओ
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Link बनाओ
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Google_Maps_Leads_${Date.now()}.csv`);
    link.style.visibility = 'hidden';

    // Download करो
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

function escapeCSV(str) {
    if (!str || str === 'N/A') return 'N/A';
    
    str = String(str);
    
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    
    return str;
}
