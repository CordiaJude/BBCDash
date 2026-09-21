"use client";

import { CollapsibleSection } from "./CollapsibleSection";

const STEPS = [
  { title: "Download & unzip", body: "Click “Download extension” below, then find driveboard-extension.zip in your Downloads and unzip it (double-click it on Mac, or right-click → Extract All on Windows)." },
  { title: "Open Chrome's extensions page", body: "Go to chrome://extensions — paste that into the address bar, or open Chrome's menu → Extensions → Manage Extensions." },
  { title: "Turn on Developer mode", body: "Flip the “Developer mode” switch in the top-right corner of that page." },
  { title: "Load the extension", body: "Click “Load unpacked” and select the unzipped driveboard-extension folder (not the zip file itself)." },
  { title: "Pin it", body: "Click the puzzle-piece icon in Chrome's toolbar, find DriveBoard, and click the pin icon so it stays visible." },
  { title: "Sign in", body: "Click the DriveBoard icon and sign in with your usual email and password. You're set." },
];

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Manager-facing "get the Chrome extension" panel — a real download link to the zip the extension/ folder is built into (see scripts/build-extension-zip.mjs), plus install steps since it's unpacked/developer-mode only (not on the Chrome Web Store). */
export function ExtensionDownload() {
  return (
    <CollapsibleSection title="Chrome extension" defaultOpen={false}>
      <p className="text-sm text-[var(--foreground-muted)] mb-4">
        Quick-add appointments, today&rsquo;s stats, desk notifications, and a vAuto/KBB capture button — right from
        your browser toolbar, without opening the dashboard.
      </p>

      <a
        href="/driveboard-extension.zip"
        download
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium bg-[var(--accent)] text-white hover:brightness-110 active:scale-[0.98] transition mb-5"
      >
        <DownloadIcon />
        Download extension
      </a>

      <ol className="space-y-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-xs text-[var(--foreground-faint)] mt-5">
        It isn&rsquo;t on the Chrome Web Store, so Chrome will show it as an unpacked/developer-mode extension —
        that&rsquo;s expected, not an error.
      </p>
    </CollapsibleSection>
  );
}
