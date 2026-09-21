import { apiFetch, getAuth, formatTime12h } from "./api.js";

const ALARM_NAME = "driveboard-poll";
const POLL_MINUTES = 5;
const UPCOMING_WINDOW_MINUTES = 15;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "driveboard-quickadd",
    title: 'Create DriveBoard appointment from "%s"',
    contexts: ["selection"],
  });
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLL_MINUTES });
  pollAndNotify();
});

chrome.runtime.onStartup.addListener(() => {
  pollAndNotify();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) pollAndNotify();
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "driveboard-quickadd") return;
  const text = (info.selectionText || "").trim();
  openQuickAdd({ customer_name: guessName(text), notes: text });
});

// content-capture.js (vAuto/KBB/etc. pages) messages this to open a
// prefilled quick-add tab, since a content script can't open new tabs
// itself and there's no way to programmatically pop the toolbar popup.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "OPEN_QUICKADD") {
    openQuickAdd(msg.prefill || {}).then(() => sendResponse({ ok: true }));
    return true; // keep the message channel open for the async response
  }
  return false;
});

function guessName(text) {
  const m = text.match(/[A-Z][a-z]+\s+[A-Z][a-z]+/);
  return m ? m[0] : "";
}

async function openQuickAdd(prefill) {
  await chrome.storage.local.set({ quickAddPrefill: prefill });
  chrome.tabs.create({ url: chrome.runtime.getURL("quickadd.html") });
}

function notify(id, title, message) {
  chrome.notifications.create(id, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-192.png"),
    title,
    message,
    priority: 1,
  });
}

// Polls today's appointments (every `periodInMinutes`) to keep the toolbar
// badge current and fire two kinds of desk notification: a brand-new
// appointment landing on the board, and one about to start that hasn't
// been marked showed yet. `knownIds`/notified-set live only in memory —
// they reset on browser restart, which just means one redundant round of
// "new appointment" notifications on the very first poll, not a bug worth
// persisting state to avoid.
let knownIds = null;
const notifiedUpcoming = new Set();

async function pollAndNotify() {
  const { token } = await getAuth();
  if (!token) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }

  let appointments;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await apiFetch(`/api/appointments?scope=everyone&from=${today}&to=${today}`);
    if (!res.ok) return;
    ({ appointments } = await res.json());
  } catch {
    return; // offline / network hiccup — the next alarm tick will retry
  }

  const activeCount = appointments.filter((a) => a.showed_status === "pending" || a.sold_status === "pending").length;
  chrome.action.setBadgeText({ text: activeCount ? String(activeCount) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#3568d4" });

  const ids = new Set(appointments.map((a) => a.id));
  if (knownIds) {
    for (const a of appointments) {
      if (!knownIds.has(a.id)) {
        notify(`new-${a.id}`, `New appointment: ${a.customer_name}`, `${a.vehicle} — today at ${formatTime12h(a.appt_time)}`);
      }
    }
  }
  knownIds = ids;

  const now = new Date();
  for (const a of appointments) {
    if (a.showed_status !== "pending" || notifiedUpcoming.has(a.id)) continue;
    const [h, m] = a.appt_time.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    const minsAway = (target.getTime() - now.getTime()) / 60000;
    if (minsAway > 0 && minsAway <= UPCOMING_WINDOW_MINUTES) {
      notify(`upcoming-${a.id}`, `${a.customer_name} in ${Math.round(minsAway)} min`, a.vehicle);
      notifiedUpcoming.add(a.id);
    }
  }
}
