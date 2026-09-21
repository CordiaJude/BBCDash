import { getBaseUrl, DEFAULT_BASE_URL, clearAuth } from "./api.js";

const app = document.getElementById("app");

async function init() {
  const baseUrl = await getBaseUrl();

  app.innerHTML = `
    <div class="panel">
      <div class="header"><img src="icons/icon-32.png" class="logo" alt="" /><span class="wordmark text-headline">DriveBoard settings</span></div>
      <div class="pad">
        <label for="base-url" class="text-label">Site URL</label>
        <input id="base-url" value="${baseUrl}" placeholder="${DEFAULT_BASE_URL}" />
        <p class="hint">
          Only change this if DriveBoard is hosted somewhere other than the default deployment.
          Changing it to a different domain also requires updating <code>host_permissions</code>
          in the extension's manifest.json, or requests to it will be blocked.
        </p>
        <p id="msg" class="error"></p>
        <button id="save" class="btn-primary">Save</button>
        <button id="signout" class="link-btn" style="display: block; margin-top: 16px; width: 100%; text-align: center;">
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
