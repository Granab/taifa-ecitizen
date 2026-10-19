"use strict";

// Taifa eCitizen — educational front-end prototype.
// No official government, identity, or M-Pesa service is connected.

const SERVICES = [
  { id: "identity", icon: "🪪", title: "National Identity & Civil Registration", description: "ID, Birth Certificate, Marriage Registration", detail: "National ID and civil registration guidance" },
  { id: "transport", icon: "🚘", title: "Transport Services (NTSA)", description: "Driving Licence, Vehicle Registration, Logbook", detail: "Transport and vehicle-service guidance" },
  { id: "business", icon: "💼", title: "Business & Revenue Services", description: "Business Registration, County Permits, KRA", detail: "Business and revenue-service guidance" },
  { id: "huduma", icon: "👥", title: "Huduma & County Services", description: "Complaints, Enquiries, County Requests", detail: "County and public-service enquiries" },
  { id: "land", icon: "🏠", title: "Land & Housing Services", description: "Title Deeds, Land Search, Housing", detail: "Land and housing-service guidance" },
  { id: "education", icon: "🎓", title: "Education & Learning", description: "Certificates, Transcripts, School Services", detail: "Education and certificate guidance" },
  { id: "labour", icon: "🛡️", title: "Employment & Labour", description: "Work Permits, Labour Services", detail: "Employment and labour-service guidance" },
  { id: "immigration", icon: "📄", title: "Immigration & Citizen Services", description: "Passports, Travel Documents, Citizen Services", detail: "Passport and immigration-service guidance" }
];

const COUNTIES = [
  "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a","Nairobi City","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri","Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"
];

const KEYS = { profile: "taifaDemoProfileV2", accounts: "taifaDemoAccountsV2", requests: "taifaDemoRequestsV2" };
const $ = (selector) => document.querySelector(selector);
const authDialog = $("#auth-dialog");
const serviceDialog = $("#service-dialog");
const paymentDialog = $("#payment-dialog");
const messageDialog = $("#message-dialog");
let currentUser = readStore(KEYS.profile, null);
let accounts = readStore(KEYS.accounts, []);
let requests = readStore(KEYS.requests, []);
let authMode = "login";
let activeServiceId = null;
let toastTimer;

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { showToast("Browser storage is unavailable. Changes may not be saved."); return false; }
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[c]);
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}
function showMessage(title, body, emoji = "🌿", quote = "") {
  $("#message-title").textContent = title;
  $("#message-body").textContent = body;
  $("#message-emoji").textContent = emoji;
  $("#message-quote").textContent = quote;
  if (!messageDialog.open) messageDialog.showModal();
}
function showView(name) {
  const allowed = ["home","services","requests","help"];
  const view = allowed.includes(name) ? name : "home";
  document.querySelectorAll(".page-view").forEach(el => el.classList.toggle("hidden", el.id !== `${view}-view`));
  document.querySelectorAll(".nav-link").forEach(el => el.classList.toggle("active", el.dataset.view === view));
  $("#main-nav").classList.remove("open");
  $("#mobile-menu").setAttribute("aria-expanded", "false");
  if (view === "requests") renderRequests();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function updateAccountUI() {
  const signedIn = Boolean(currentUser);
  $("#account-label").textContent = signedIn ? currentUser.name : "Guest";
  $("#account-button").textContent = signedIn ? "Account" : "Sign in";
  $("#account-button").classList.toggle("hidden", signedIn);
  $("#logout-button").classList.toggle("hidden", !signedIn);
  $("#hero-name").textContent = signedIn ? `${currentUser.name}!` : "Welcome!";
  $("#welcome-message").textContent = signedIn
    ? "We are here to help you. Choose a service and take your next step."
    : "Explore freely. Sign in when you're ready to request a service.";
}
function renderServices(target, query = "") {
  const grid = $(target);
  const term = query.trim().toLowerCase();
  const filtered = SERVICES.filter(s => `${s.title} ${s.description} ${s.detail}`.toLowerCase().includes(term));
  grid.innerHTML = filtered.map(s => `
    <button class="service-card" type="button" data-service="${s.id}" aria-label="Explore ${escapeHTML(s.title)}">
      <span class="service-icon" aria-hidden="true">${s.icon}</span>
      <strong>${escapeHTML(s.title)}</strong><p>${escapeHTML(s.description)}</p>
      <span class="card-action">Explore service <span aria-hidden="true">→</span></span>
    </button>`).join("");
  if (target === "#service-grid") $("#empty-search").classList.toggle("hidden", filtered.length > 0);
}
function populateCounties() {
  $("#request-county").innerHTML = '<option value="">Select your county</option>' +
    COUNTIES.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
}
function openAuth(mode = "login") {
  authMode = mode;
  updateAuthForm();
  $("#auth-error").textContent = "";
  if (!authDialog.open) authDialog.showModal();
}
function updateAuthForm() {
  const registering = authMode === "register";
  $("#auth-title").textContent = registering ? "Create your demo account" : "Welcome back";
  $("#register-fields").classList.toggle("hidden", !registering);
  $("#register-name").required = registering;
  $("#auth-submit").textContent = registering ? "Create demo account" : "Sign in";
  $("#auth-password").autocomplete = registering ? "new-password" : "current-password";
  document.querySelectorAll("[data-auth-mode]").forEach(b => b.classList.toggle("active", b.dataset.authMode === authMode));
}
$("#auth-form").addEventListener("submit", event => {
  event.preventDefault();
  const email = $("#auth-email").value.trim().toLowerCase();
  const password = $("#auth-password").value;
  const name = $("#register-name").value.trim();
  if (password.length < 6) { $("#auth-error").textContent = "Enter at least 6 characters for this demo password."; return; }
  if (authMode === "register") {
    if (name.length < 2) { $("#auth-error").textContent = "Enter your name to continue."; return; }
    if (accounts.some(a => a.email === email)) { $("#auth-error").textContent = "This email already has a demo account. Please sign in."; return; }
    // Prototype limitation: password is intentionally not stored or authenticated.
    accounts.push({ email, name });
    saveStore(KEYS.accounts, accounts);
    currentUser = { email, name };
    saveStore(KEYS.profile, currentUser);
    authDialog.close();
    updateAccountUI();
    showMessage(`Karibu, ${name}!`, "Your demo account is ready. We are here to help you. Choose a service when you are ready.", "🇰🇪", "Small steps every day can lead to meaningful progress.");
    return;
  }
  const account = accounts.find(a => a.email === email);
  if (!account) { $("#auth-error").textContent = "No demo account found. Choose Register first."; return; }
  // Demo-only: any 6+ character password is accepted for a registered email.
  currentUser = { email: account.email, name: account.name };
  saveStore(KEYS.profile, currentUser);
  authDialog.close();
  updateAccountUI();
  showMessage(`Karibu tena, ${account.name}!`, "We are here to help you. Your next step is ready whenever you are.", "😊", "Progress begins when you take the next step.");
});
function openService(id) {
  const service = SERVICES.find(s => s.id === id);
  if (!service) return;
  if (!currentUser) {
    openAuth("login");
    $("#auth-error").textContent = "Please sign in or register to request this service.";
    return;
  }
  activeServiceId = id;
  $("#service-dialog-title").textContent = service.title;
  $("#service-dialog-description").textContent = `${service.detail}. This is a demonstration request, not an official application.`;
  $("#service-form").reset();
  $("#service-error").textContent = "";
  serviceDialog.showModal();
}
$("#service-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!currentUser) { serviceDialog.close(); openAuth("login"); return; }
  const service = SERVICES.find(s => s.id === activeServiceId);
  const details = $("#request-details").value.trim();
  const county = $("#request-county").value;
  if (!service || !details || !county || !$("#request-consent").checked) {
    $("#service-error").textContent = "Complete each field and confirm the demo notice.";
    return;
  }
  const reference = `TE-${new Date().getFullYear()}-${Math.random().toString(10).slice(2,8).padEnd(6,"0")}`;
  requests.push({ reference, serviceId: service.id, serviceTitle: service.title, county, details, email: currentUser.email, createdAt: new Date().toISOString(), status: "Completed (demo)" });
  saveStore(KEYS.requests, requests);
  serviceDialog.close();
  renderRequests();
  showMessage("Asante! Thank you for using Taifa eCitizen", `Your demonstration request for ${service.title} has been recorded. Reference: ${reference}. No official application was submitted.`, "🎉", "Keep going. Every meaningful step counts, and tomorrow is another opportunity to grow.");
});
function getUserRequests() {
  return currentUser ? requests.filter(r => r.email === currentUser.email) : [];
}
function renderRequests() {
  const container = $("#requests-content");
  if (!currentUser) {
    container.innerHTML = `<div class="empty-state"><span class="help-icon">🔐</span><h2>Sign in to view your requests</h2><p>Your demo requests will appear here after you sign in.</p><button class="button button-primary" data-action="login">Sign in</button></div>`;
    return;
  }
  const mine = getUserRequests();
  if (!mine.length) {
    container.innerHTML = `<div class="empty-state"><span class="help-icon">📄</span><h2>No requests yet</h2><p>Choose a service to create your first demonstration request.</p><button class="button button-primary" data-view="services">Explore services</button></div>`;
    return;
  }
  container.innerHTML = `<h2>Your submitted requests</h2>${mine.slice().reverse().map(r => `
    <article class="request-item"><div><h3>${escapeHTML(r.serviceTitle)}</h3>
    <p>Reference: <strong>${escapeHTML(r.reference)}</strong></p><p>County: ${escapeHTML(r.county)}</p>
    <p>Submitted: ${escapeHTML(new Date(r.createdAt).toLocaleDateString())}</p><p>${escapeHTML(r.details)}</p></div>
    <div><span class="status">Completed · Demo</span><div class="request-actions"><button class="small-button" type="button" data-copy="${escapeHTML(r.reference)}">Copy reference</button></div></div></article>`).join("")}
    <p class="form-hint">Status is simulated. This does not represent a real government outcome.</p>`;
}
function trackRequest(reference) {
  const result = $("#tracking-result");
  const ref = reference.trim().toUpperCase();
  if (!ref) { result.textContent = "Enter a reference number."; return; }
  const request = requests.find(r => r.reference.toUpperCase() === ref);
  if (!request) { result.textContent = "No matching demo request was found in this browser."; return; }
  if (!currentUser || request.email !== currentUser.email) { result.textContent = "Sign in with the account that created this demo request to view its status."; return; }
  result.textContent = `${request.reference}: ${request.status} — ${request.serviceTitle}.`;
}
function handleAction(action) {
  if (action === "login") openAuth("login");
  else if (action === "track") {
    $("#tracking-reference").focus();
    $("#tracking-panel").scrollIntoView({ behavior: "smooth", block: "center" });
  } else if (action === "county") {
    showView("services");
    showToast("Choose a service and select your county in the request form.");
  } else if (action === "help" || action === "guidelines") showView("help");
  else if (action === "payment") paymentDialog.showModal();
}
document.addEventListener("click", event => {
  const serviceButton = event.target.closest("[data-service]");
  if (serviceButton) { openService(serviceButton.dataset.service); return; }
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) { showView(viewButton.dataset.view); return; }
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) { handleAction(actionButton.dataset.action); return; }
  const authButton = event.target.closest("[data-auth-mode]");
  if (authButton) { authMode = authButton.dataset.authMode; $("#auth-error").textContent = ""; updateAuthForm(); return; }
  const closeButton = event.target.closest("[data-close]");
  if (closeButton) { const dialog = document.getElementById(closeButton.dataset.close); if (dialog?.open) dialog.close(); return; }
  const copyButton = event.target.closest("[data-copy]");
  if (copyButton) {
    const value = copyButton.dataset.copy;
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(() => showToast("Reference copied.")).catch(() => showToast(`Reference: ${value}`));
    else showToast(`Reference: ${value}`);
  }
});
$("#search-form").addEventListener("submit", event => {
  event.preventDefault();
  const query = $("#service-search").value;
  renderServices("#service-grid", query);
  renderServices("#all-service-grid", query);
  showView("home");
  $("#services-section").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#service-search").addEventListener("input", event => {
  renderServices("#service-grid", event.target.value);
});
$("#tracking-form").addEventListener("submit", event => {
  event.preventDefault();
  trackRequest($("#tracking-reference").value);
});
$("#account-button").addEventListener("click", () => openAuth("login"));
$("#logout-button").addEventListener("click", () => {
  currentUser = null;
  try { localStorage.removeItem(KEYS.profile); } catch {}
  updateAccountUI();
  showView("home");
  showMessage("Asante kwa kutembelea!", "Thank you for visiting Taifa eCitizen. You can keep exploring the dashboard as a guest.", "🇰🇪", "Every new day brings another chance to learn and grow.");
});
$("#payment-finish").addEventListener("click", () => {
  paymentDialog.close();
  showMessage("Asante for exploring!", "You have finished the M-Pesa demonstration. No payment was made and no money was transferred.", "📱", "Use digital services thoughtfully and keep your information safe.");
});
$("#mobile-menu").addEventListener("click", () => {
  const open = $("#main-nav").classList.toggle("open");
  $("#mobile-menu").setAttribute("aria-expanded", String(open));
});
document.querySelectorAll("dialog").forEach(dialog => {
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
});
populateCounties();
renderServices("#service-grid");
renderServices("#all-service-grid");
updateAccountUI();
showView("home");
