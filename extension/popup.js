import { apiFetch, getAuth, clearAuth, login, getBaseUrl, formatTime12h, escapeHtml } from "./api.js";

const app = document.getElementById("app");

async function render() {
  const { token, user } = await getAuth();
  if (!token || !user) {
    renderLogin();
    return;
  }
  renderHome(user);
}

function renderLogin() {
  app.innerHTML = `
    <div class="header">
      <img src="icons/icon-32.png" width="20" height="20" alt="" />
      <span>DriveBoard</span>
    </div>
    <form id="login-form" class="pad">
      <label for="email">Email</label>
      <input id="email" type="email" required autofocus autocomplete="username" />
      <label for="password">Password</label>
      <input id="password" type="password" required autocomplete="current-password" />
      <p id="login-error" class="error"></p>
      <button type="submit" class="btn-primary" id="login-btn">Sign in</button>
    </form>
  `;

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const errorEl = document.getElementById("login-error");
    const btn = document.getElementById("login-btn");
    errorEl.textContent = "";
    btn.disabled = true;
    btn.textContent = "Signing in…";
    try {
      await login(email, password);
      render();
    } catch (err) {
      errorEl.textContent = err.message;
      btn.disabled = false;
      btn.textContent = "Sign in";
    }
  });
}

async function renderHome(user) {
  app.innerHTML = `
    <div class="header">
      <img src="icons/icon-32.png" width="20" height="20" alt="" />
      <span>DriveBoard</span>
      <span class="spacer"></span>
      <button id="logout" class="link-btn">Log out</button>
    </div>
    <div class="pad" id="content">Loading…</div>
  `;
  document.getElementById("logout").addEventListener("click", async () => {
    await clearAuth();
    render();
  });

  const content = document.getElementById("content");
  const baseUrl = await getBaseUrl();
  const today = new Date().toISOString().slice(0, 10);

  const res = await apiFetch(`/api/appointments?scope=everyone&from=${today}&to=${today}`);
  if (res.status === 401) {
    renderLogin();
    return;
  }
  const { appointments } = res.ok ? await res.json() : { appointments: [] };

  const stats = {
    set: appointments.length,
    confirmed: appointments.filter((a) => a.confirmed_status === "yes").length,
    showed: appointments.filter((a) => a.showed_status === "yes").length,
    sold: appointments.filter((a) => a.sold_status === "yes").length,
  };
  const next = appointments
    .filter((a) => a.showed_status === "pending")
    .sort((a, b) => a.appt_time.localeCompare(b.appt_time))[0];

  content.innerHTML = `
    <div class="stats">
      <div class="stat"><b>${stats.set}</b><span>Set</span></div>
      <div class="stat"><b>${stats.confirmed}</b><span>Confirmed</span></div>
      <div class="stat"><b>${stats.showed}</b><span>Showed</span></div>
      <div class="stat"><b>${stats.sold}</b><span>Sold</span></div>
    </div>
    ${
      next
        ? `<p class="next">Next up: <b>${escapeHtml(next.customer_name)}</b> at ${formatTime12h(next.appt_time)}</p>`
        : `<p class="next muted">Nothing left pending today.</p>`
    }

    <h3>Quick add</h3>
    <form id="quick-form">
      <label for="qa-name">Customer name</label>
      <input id="qa-name" required autofocus />
      <label for="qa-vehicle">Vehicle</label>
      <input id="qa-vehicle" placeholder="2024 Toyota Camry" required />
      <div class="row">
        <div>
          <label for="qa-date">Date</label>
          <input id="qa-date" type="date" value="${today}" required />
        </div>
        <div>
          <label for="qa-time">Time</label>
          <input id="qa-time" type="time" value="09:00" required />
        </div>
      </div>
      <p id="qa-error" class="error"></p>
      <button type="submit" class="btn-primary" id="qa-submit">Add appointment</button>
    </form>

    <div class="links">
      <a href="${baseUrl}/dashboard" target="_blank" rel="noopener">Dashboard</a>
      <a href="${baseUrl}/tv" target="_blank" rel="noopener">Live board</a>
      ${user.role === "manager" ? `<a href="${baseUrl}/admin" target="_blank" rel="noopener">Admin</a>` : ""}
      <a href="${baseUrl}/settings" target="_blank" rel="noopener">Settings</a>
    </div>
  `;

  document.getElementById("quick-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("qa-error");
    const btn = document.getElementById("qa-submit");
    errorEl.textContent = "";
    btn.disabled = true;
    btn.textContent = "Adding…";

    const payload = {
      customer_name: document.getElementById("qa-name").value.trim(),
      vehicle: document.getElementById("qa-vehicle").value.trim(),
      appt_date: document.getElementById("qa-date").value,
      appt_time: `${document.getElementById("qa-time").value}:00`,
    };

    const saveRes = await apiFetch("/api/appointments", { method: "POST", body: JSON.stringify(payload) });
    if (saveRes.ok) {
      renderHome(user);
    } else {
      const data = await saveRes.json().catch(() => ({}));
      errorEl.textContent = data.error || "Failed to add appointment.";
      btn.disabled = false;
      btn.textContent = "Add appointment";
    }
  });
}

render();
