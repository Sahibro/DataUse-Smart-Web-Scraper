document.getElementById('startScrape').addEventListener('click', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab.url.includes("://google.com")) {
    document.getElementById('status').innerText = "Scraping started...";
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: scrapeData
    });
  } else {
    alert("Please open Google Maps first!");
  }
});

function scrapeData() {
  // Yeh function page ke elements se data nikalega
  const leads = [];
  const items = document.querySelectorAll('.Nv2Y72'); // Google Maps selector
  items.forEach(item => {
    leads.push({
      name: item.ariaLabel,
      link: item.href
    });
  });
  console.log("Leads Extracted:", leads);
  alert(leads.length + " leads found! Check console.");
}
