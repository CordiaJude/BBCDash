import { apiFetch, getAuth, escapeHtml } from "./api.js";

const app = document.getElementById("app");

async function init() {
  const { token, user } = await getAuth();
  if (!token || !user) {
    app.innerHTML = `
      <div class="card">
        <div class="header"><img src="icons/icon-32.png" width="20" height="20" alt="" /><span>DriveBoard</span></div>
        <div class="center-note">Sign in from the DriveBoard toolbar icon first, then try this again.</div>
      </div>
    `;
    return;
  }

  const { quickAddPrefill } = await chrome.storage.local.get("quickAddPrefill");
  const prefill = quickAddPrefill || {};
  await chrome.storage.local.remove("quickAddPrefill");

  let reps = [];
  if (user.role === "manager") {
    const res = await apiFetch("/api/reps");
    if (res.ok) ({ reps } = await res.json());
  }

  const today = new Date().toISOString().slice(0, 10);

  app.innerHTML = `
    <div class="card">
      <div class="header"><img src="icons/icon-32.png" width="20" height="20" alt="" /><span>Add appointment</span></div>
      <form id="form" class="pad">
        <label for="f-name">Customer name</label>
        <input id="f-name" value="${escapeHtml(prefill.customer_name || "")}" required autofocus />

        <label for="f-vehicle">Vehicle</label>
        <input id="f-vehicle" value="${escapeHtml(prefill.vehicle || "")}" placeholder="2024 Toyota Camry" required />

        <div class="row">
          <div>
            <label for="f-date">Date</label>
            <input id="f-date" type="date" value="${today}" required />
          </div>
          <div>
            <label for="f-time">Time</label>
            <input id="f-time" type="time" value="09:00" required />
          </div>
        </div>

        ${
          reps.length
            ? `<label for="f-rep">Assigned rep</label>
               <select id="f-rep">
                 ${reps.map((r) => `<option value="${r.id}" ${r.id === user.id ? "selected" : ""}>${escapeHtml(r.display_name)}</option>`).join("")}
               </select>`
            : ""
        }

        <div class="row">
          <div>
            <label for="f-asking">Asking price</label>
            <input id="f-asking" type="number" inputmode="decimal" value="${prefill.asking_price ?? ""}" />
          </div>
          <div>
            <label for="f-market">Market indicates (min)</label>
            <input id="f-market" type="number" inputmode="decimal" value="${prefill.market_indicates_min ?? ""}" />
          </div>
        </div>

        <label for="f-notes">Notes</label>
        <textarea id="f-notes">${escapeHtml(prefill.notes || "")}</textarea>

        <p id="error" class="error"></p>
        <button type="submit" class="btn-primary" id="submit-btn">Add appointment</button>
      </form>
    </div>
  `;

  document.getElementById("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("error");
    const btn = document.getElementById("submit-btn");
    errorEl.textContent = "";
    btn.disabled = true;
    btn.textContent = "Adding…";

    const payload = {
      customer_name: document.getElementById("f-name").value.trim(),
      vehicle: document.getElementById("f-vehicle").value.trim(),
      appt_date: document.getElementById("f-date").value,
      appt_time: `${document.getElementById("f-time").value}:00`,
      rep_id: reps.length ? document.getElementById("f-rep").value : undefined,
      asking_price: document.getElementById("f-asking").value || null,
      market_indicates_min: document.getElementById("f-market").value || null,
      notes: document.getElementById("f-notes").value.trim() || null,
    };

    const res = await apiFetch("/api/appointments", { method: "POST", body: JSON.stringify(payload) });
    if (res.ok) {
      app.innerHTML = `
        <div class="card">
          <div class="header"><img src="icons/icon-32.png" width="20" height="20" alt="" /><span>Add appointment</span></div>
          <div class="center-note">✅ Appointment added. You can close this tab.</div>
        </div>
      `;
    } else {
      const data = await res.json().catch(() => ({}));
      errorEl.textContent = data.error || "Failed to add appointment.";
      btn.disabled = false;
      btn.textContent = "Add appointment";
    }
  });
}

init();
