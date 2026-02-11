// ============================================================
// iPhone Minerals — Application Logic
// ============================================================
import { materials, phones, insights } from "./data.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// -------------------- State --------------------
let currentPhone = null;

// -------------------- Init --------------------
document.addEventListener("DOMContentLoaded", () => {
  renderPhoneGrid();
  $("#back-btn").addEventListener("click", showSelector);
});

// ============================================================
// Phone Selector Grid
// ============================================================
function renderPhoneGrid() {
  const grid = $("#phone-grid");
  grid.innerHTML = phones
    .map(
      (p) => `
    <div class="phone-card animate-in" data-id="${p.id}">
      <div class="phone-card-icon">📱</div>
      <div class="phone-card-name">${p.name}</div>
      <div class="phone-card-year">${p.year} · ${p.weight}g</div>
    </div>`
    )
    .join("");

  $$(".phone-card").forEach((card) =>
    card.addEventListener("click", () => selectPhone(card.dataset.id))
  );
}

// ============================================================
// Navigation
// ============================================================
function selectPhone(id) {
  currentPhone = phones.find((p) => p.id === id);
  if (!currentPhone) return;

  const hero = $("#hero");
  hero.classList.add("leaving");
  setTimeout(() => {
    hero.classList.add("hidden");
    hero.classList.remove("leaving");
    const detail = $("#detail");
    detail.classList.remove("hidden");
    detail.classList.add("entering");
    renderDetail();
    window.scrollTo({ top: 0 });
    setTimeout(() => detail.classList.remove("entering"), 500);
  }, 300);
}

function showSelector() {
  const detail = $("#detail");
  detail.classList.add("hidden");
  const hero = $("#hero");
  hero.classList.remove("hidden");
}

// ============================================================
// Render Detail View
// ============================================================
function renderDetail() {
  renderHeader();
  renderStats();
  renderDonut();
  renderBars();
  renderMaterialCards();
  renderSupplyChain();
  renderInsights();
}

// -------------------- Header --------------------
function renderHeader() {
  $("#phone-name").textContent = currentPhone.name;
  $("#phone-year").textContent = currentPhone.year;
  $("#phone-frame").textContent = currentPhone.frame + " frame";
  $("#phone-chip").textContent = currentPhone.chip;
  $("#phone-weight").textContent = currentPhone.weight + "g";
}

// -------------------- Stats --------------------
function renderStats() {
  const mats = currentPhone.materials;
  let rawCost = 0;
  let totalWater = 0;
  const countrySet = new Set();

  mats.forEach((m) => {
    const info = materials[m.id];
    if (!info) return;
    const kg = m.grams / 1000;
    rawCost += info.pricePerKg * kg;
    totalWater += info.eco.waterPerKg * kg;
    info.sources.forEach((s) => countrySet.add(s.country));
  });

  animateValue("stat-raw-cost", rawCost, (v) => "$" + v.toFixed(2));
  animateValue("stat-retail", currentPhone.retailPrice, (v) => "$" + Math.round(v));
  const markup = currentPhone.retailPrice / rawCost;
  animateValue("stat-markup", markup, (v) => Math.round(v) + "x");
  animateValue("stat-co2", currentPhone.carbonFootprint, (v) => Math.round(v));
  animateValue("stat-water", totalWater, (v) => Math.round(v).toLocaleString());
  animateValue("stat-countries", countrySet.size, (v) => Math.round(v));
}

function animateValue(id, target, fmt) {
  const el = $(`#${id}`);
  const duration = 800;
  const start = performance.now();
  const step = (ts) => {
    const t = Math.min((ts - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(target * ease);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// -------------------- Donut Chart --------------------
function renderDonut() {
  const svg = $("#donut-chart");
  const legend = $("#chart-legend");
  const mats = currentPhone.materials;
  const totalGrams = mats.reduce((s, m) => s + m.grams, 0);

  // Circumference for r=86
  const r = 86;
  const C = 2 * Math.PI * r;

  // Sort by grams descending
  const sorted = [...mats].sort((a, b) => b.grams - a.grams);

  let offset = 0;
  const circles = [];
  const legendItems = [];

  sorted.forEach((m) => {
    const info = materials[m.id];
    if (!info) return;
    const pct = m.grams / totalGrams;
    const len = pct * C;

    circles.push(
      `<circle r="${r}" cx="100" cy="100"
         stroke="${info.color}" stroke-dasharray="${len} ${C - len}"
         stroke-dashoffset="-${offset}"
         data-id="${m.id}" data-grams="${m.grams}" data-pct="${(pct * 100).toFixed(1)}" />`
    );
    offset += len;

    legendItems.push(
      `<div class="legend-item" data-id="${m.id}">
        <span class="legend-dot" style="background:${info.color}"></span>
        ${info.name}
      </div>`
    );
  });

  svg.innerHTML = circles.join("");
  legend.innerHTML = legendItems.join("");

  // Center text default
  $("#donut-center-value").textContent = totalGrams.toFixed(1) + "g";
  $("#donut-center-label").textContent = "Total Weight";

  // Hover interactivity
  svg.querySelectorAll("circle").forEach((c) => {
    c.addEventListener("mouseenter", () => {
      $("#donut-center-value").textContent = parseFloat(c.dataset.grams).toFixed(2) + "g";
      const info = materials[c.dataset.id];
      $("#donut-center-label").textContent =
        info.name + " · " + c.dataset.pct + "%";
    });
    c.addEventListener("mouseleave", () => {
      $("#donut-center-value").textContent = totalGrams.toFixed(1) + "g";
      $("#donut-center-label").textContent = "Total Weight";
    });
  });
}

// -------------------- Material Bars --------------------
function renderBars() {
  const container = $("#material-bars");
  const mats = currentPhone.materials;
  const maxGrams = Math.max(...mats.map((m) => m.grams));
  const sorted = [...mats].sort((a, b) => b.grams - a.grams);
  const totalGrams = mats.reduce((s, m) => s + m.grams, 0);

  container.innerHTML = sorted
    .map((m) => {
      const info = materials[m.id];
      if (!info) return "";
      const pct = (m.grams / maxGrams) * 100;
      const weightPct = ((m.grams / totalGrams) * 100).toFixed(1);
      return `
      <div class="bar-row" data-id="${m.id}">
        <div class="bar-label">${info.name}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:0%;background:${info.color}" data-target="${pct}"></div>
        </div>
        <div class="bar-value">${m.grams >= 1 ? m.grams.toFixed(1) : m.grams.toFixed(3)}g <span style="color:var(--text-dim);font-size:0.68rem">(${weightPct}%)</span></div>
      </div>`;
    })
    .join("");

  // Animate bars in
  requestAnimationFrame(() => {
    container.querySelectorAll(".bar-fill").forEach((bar) => {
      bar.style.width = bar.dataset.target + "%";
    });
  });

  // Click to scroll to card
  container.querySelectorAll(".bar-row").forEach((row) => {
    row.addEventListener("click", () => {
      const card = document.querySelector(`.mat-card[data-id="${row.dataset.id}"]`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("expanded");
      }
    });
  });
}

// -------------------- Material Detail Cards --------------------
function renderMaterialCards() {
  const container = $("#material-cards");
  const mats = currentPhone.materials;
  const totalGrams = mats.reduce((s, m) => s + m.grams, 0);
  const sorted = [...mats].sort((a, b) => b.grams - a.grams);

  container.innerHTML = sorted
    .map((m) => {
      const info = materials[m.id];
      if (!info) return "";
      const kg = m.grams / 1000;
      const cost = (info.pricePerKg * kg).toFixed(4);
      const pct = ((m.grams / totalGrams) * 100).toFixed(1);
      const co2 = (info.eco.co2PerKg * kg).toFixed(3);
      const water = (info.eco.waterPerKg * kg).toFixed(1);

      const sourceBars = info.sources
        .map(
          (s) => `
        <div class="source-bar-row">
          <span class="source-flag">${s.flag}</span>
          <span class="source-name">${s.country}</span>
          <div class="source-bar-track">
            <div class="source-bar-fill" style="width:${s.pct}%;background:${info.color}"></div>
          </div>
          <span class="source-pct">${s.pct}%</span>
        </div>`
        )
        .join("");

      return `
      <div class="mat-card" data-id="${m.id}">
        <div class="mat-card-header">
          <div class="mat-card-color" style="background:${info.color}"></div>
          <div>
            <div class="mat-card-title">${info.icon} ${info.name}</div>
            <div class="mat-card-category">${info.category}</div>
          </div>
          <div class="mat-card-amount">
            <div class="mat-card-grams">${m.grams >= 1 ? m.grams.toFixed(1) : m.grams.toFixed(3)}g</div>
            <div class="mat-card-pct">${pct}%</div>
          </div>
        </div>
        <div class="mat-card-body">
          <div class="mat-card-row">
            <span class="mat-card-row-label">Market Price</span>
            <span class="mat-card-row-value">$${info.pricePerKg.toLocaleString()}/kg</span>
          </div>
          <div class="mat-card-row">
            <span class="mat-card-row-label">Cost in This Phone</span>
            <span class="mat-card-row-value">$${parseFloat(cost) < 0.01 ? cost : parseFloat(cost).toFixed(2)}</span>
          </div>
          <div class="mat-card-row">
            <span class="mat-card-row-label">CO₂ Footprint</span>
            <span class="mat-card-row-value">${parseFloat(co2) < 0.01 ? co2 : parseFloat(co2).toFixed(2)} kg</span>
          </div>
          <div class="mat-card-row">
            <span class="mat-card-row-label">Water Usage</span>
            <span class="mat-card-row-value">${parseFloat(water).toFixed(1)} L</span>
          </div>
          <div class="mat-card-sources">
            <div class="mat-card-sources-title">Where it comes from</div>
            ${sourceBars}
          </div>
          <div class="mat-card-eco">
            <div class="eco-label">Ecological Impact</div>
            <div class="eco-text">${info.eco.summary}</div>
          </div>
        </div>
      </div>`;
    })
    .join("");

  // Toggle expand
  container.querySelectorAll(".mat-card").forEach((card) => {
    card.addEventListener("click", () => {
      card.classList.toggle("expanded");
    });
  });
}

// -------------------- Supply Chain --------------------
function renderSupplyChain() {
  const container = $("#country-list");
  const mats = currentPhone.materials;

  // Aggregate materials per country
  const countryMap = {};
  mats.forEach((m) => {
    const info = materials[m.id];
    if (!info) return;
    info.sources.forEach((s) => {
      if (!countryMap[s.country]) {
        countryMap[s.country] = { flag: s.flag, materials: new Set() };
      }
      countryMap[s.country].materials.add(info.name);
    });
  });

  // Sort by number of materials descending
  const countries = Object.entries(countryMap).sort(
    (a, b) => b[1].materials.size - a[1].materials.size
  );

  container.innerHTML = countries
    .map(
      ([name, data]) => `
    <div class="country-card">
      <div class="country-flag">${data.flag}</div>
      <div class="country-info">
        <div class="country-name">${name}</div>
        <div class="country-materials">${[...data.materials].join(", ")}</div>
      </div>
    </div>`
    )
    .join("");
}

// -------------------- Insights --------------------
function renderInsights() {
  const container = $("#insight-cards");
  container.innerHTML = insights
    .map(
      (ins) => `
    <div class="insight-card">
      <h4>${ins.title}</h4>
      <p>${ins.text}</p>
    </div>`
    )
    .join("");
}
