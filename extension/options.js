import { getBaseUrl, DEFAULT_BASE_URL, clearAuth } from "./api.js";

const app = document.getElementById("app");

async function init() {
  const baseUrl = await getBaseUrl();

  app.innerHTML = `
    <div class="card">
      <div class="header"><img src="icons/icon-32.png" width="20" height="20" alt="" /><span>DriveBoard settings</span></div>
      <div class="pad">
        <label for="base-url">Site URL</label>
        <input id="base-url" value="${baseUrl}" placeholder="${DEFAULT_BASE_URL}" />
        <p style="font-size: 11px; color: var(--fg-muted); margin: 4px 0 0;">
          Only change this if DriveBoard is hosted somewhere other than the default deployment.
          Note: changing this to a different domain requires updating the extension's
          host_permissions in manifest.json too, or requests to it will be blocked by CORS.
        </p>
        <p id="msg" class="error"></p>
        <button id="save" class="btn-primary">Save</button>
        <button id="signout" class="link-btn" style="display: block; margin-top: 14px; width: 100%; text-align: center;">
          Sign out of the extension
        </button>
      </div>
    </div>
  `;

  document.getElementById("save").addEventListener("click", async () => {
    let value = document.getElementById("base-url").value.trim().replace(/\/+$/, "");
    if (!value) value = DEFAULT_BASE_URL;
    await chrome.storage.local.set({ baseUrl: value });
    const msg = document.getElementById("msg");
    msg.textContent = "Saved.";
    msg.className = "success";
  });

  document.getElementById("signout").addEventListener("click", async () => {
    await clearAuth();
    const msg = document.getElementById("msg");
    msg.textContent = "Signed out. Open the toolbar icon to sign back in.";
    msg.className = "success";
  });
}

init();
