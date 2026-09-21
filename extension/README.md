# DriveBoard Chrome extension

A companion extension for the DriveBoard appointment board. Everything it does talks to the same API routes the web app uses.

## What it does

- **Toolbar popup** — sign in once, then see today's Set/Confirmed/Showed/Sold counts and the next pending appointment at a glance.
- **Quick add** — a short form right in the popup to add an appointment in a few seconds.
- **Desk notifications** — a background poll (every 5 minutes) fires a Chrome notification when a new appointment lands on the board, and again when one is about to start (within 15 minutes) and hasn't been marked showed yet. The toolbar badge shows today's active appointment count.
- **Right-click capture** — select any text on any page (a name, a phone number, a note) → right-click → "Create DriveBoard appointment from selection" → opens a prefilled quick-add tab.
- **vAuto/KBB/DealerCenter/Carfax/VinAudit capture** — a small floating "→ DriveBoard" button appears on those sites; it scrapes a price and VIN off the page (or your current selection) and opens a prefilled quick-add tab with the asking price and a note already filled in.
- **Live board / Admin / Settings shortcuts** — one-click links from the popup to open the full dashboard, the TV live board, Admin, or Settings in a new tab.

## Install (unpacked, for now)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Click the DriveBoard icon in the toolbar and sign in with your normal DriveBoard email/password.

## How auth works

The web app's session is an httpOnly cookie, which a browser won't send on cross-site requests from a `chrome-extension://` page. So instead, `/api/auth/login` also returns a signed token in its JSON response; the extension stores that itself and sends it as `Authorization: Bearer <token>` on every request. Nothing about the normal website login changes — it still gets its cookie exactly as before.

## Changing the site URL

The extension is hardcoded (in `manifest.json`'s `host_permissions` and `api.js`'s `DEFAULT_BASE_URL`) to the deployed DriveBoard URL. If you ever move to a different domain, open the extension's Options page (right-click the icon → Options) to point it at the new URL — but you'll also need to update `host_permissions` in `manifest.json` and reload the extension, or the browser will block those requests with CORS.

## Publishing to the Chrome Web Store (optional)

This is currently an unpacked/"load unpacked" extension for personal or dealership-internal use. To publish it: zip this folder, create a one-time $5 Chrome Web Store developer account, and submit it through the Developer Dashboard. Not done here since it requires a Google account and payment you'd need to provide.
