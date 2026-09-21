// Injected on vAuto/KBB/DealerCenter/Carfax/VinAudit pages (see manifest
// content_scripts matches). Adds a small floating button that scrapes a
// price and VIN off the page (or just the current text selection) and
// hands them to background.js, which opens a prefilled DriveBoard
// quick-add tab. Runs in the page's own context, so it never talks to the
// DriveBoard API directly — only background.js/popup.js do that, since
// only they get the CORS/host_permissions bypass this extension relies on.
(function () {
  if (window.__driveboardCaptureInjected) return;
  window.__driveboardCaptureInjected = true;

  const btn = document.createElement("button");
  btn.id = "driveboard-capture-btn";
  btn.type = "button";
  btn.textContent = "→ DriveBoard";
  btn.title = "Send the selected price/VIN to a new DriveBoard appointment";
  document.documentElement.appendChild(btn);

  btn.addEventListener("click", () => {
    const selection = (window.getSelection ? window.getSelection().toString() : "").trim();
    const pageText = document.body ? document.body.innerText : "";

    const price = extractPrice(selection) ?? extractPrice(pageText);
    const vin = extractVin(selection) ?? extractVin(pageText);
    const noteParts = [];
    if (vin) noteParts.push(`VIN ${vin}`);
    if (selection && selection.length < 240) noteParts.push(selection);
    noteParts.push(`Captured from ${location.hostname}`);

    chrome.runtime.sendMessage({
      type: "OPEN_QUICKADD",
      prefill: {
        notes: noteParts.join(" — "),
        asking_price: price ?? undefined,
      },
    });

    btn.textContent = "✓ Sent";
    setTimeout(() => {
      btn.textContent = "→ DriveBoard";
    }, 1400);
  });

  function extractPrice(text) {
    if (!text) return null;
    const match = text.match(/\$\s?([\d]{1,3}(?:,\d{3})*)(?:\.\d{2})?/);
    if (!match) return null;
    const value = Number(match[1].replace(/,/g, ""));
    return Number.isFinite(value) ? value : null;
  }

  function extractVin(text) {
    if (!text) return null;
    const match = text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
    return match ? match[0] : null;
  }
})();
