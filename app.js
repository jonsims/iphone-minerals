// ============================================================
// iPhone Minerals — Application Logic (v3: Map, Calculator, Evolution)
// ============================================================
import { materials, phones, insights } from "./data.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// -------------------- State --------------------
let currentPhone = null;
let mapSvgDoc = null; // cached SVG document

// -------------------- Init --------------------
document.addEventListener("DOMContentLoaded", () => {
  renderPhoneGrid();
  preloadMap();
  $("#back-btn").addEventListener("click", showSelector);
  $("#compare-btn").addEventListener("click", showCompare);
  $("#compare-back-btn").addEventListener("click", showDetail);
  initTabs();
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
// Navigation — 3 views: hero, detail, compare
// ============================================================
function selectPhone(id) {
  currentPhone = phones.find((p) => p.id === id);
  if (!currentPhone) return;

  const hero = $("#hero");
  hero.classList.add("leaving");
  setTimeout(() => {
    hero.classList.add("hidden");
    hero.classList.remove("leaving");
    $("#compare").classList.add("hidden");
    const detail = $("#detail");
    detail.classList.remove("hidden");
    detail.classList.add("entering");
    renderDetail();
    window.scrollTo({ top: 0 });
    setTimeout(() => detail.classList.remove("entering"), 500);
  }, 300);
}

function showSelector() {
  $("#detail").classList.add("hidden");
  $("#compare").classList.add("hidden");
  $("#hero").classList.remove("hidden");
}

function showCompare() {
  $("#detail").classList.add("hidden");
  const compare = $("#compare");
  compare.classList.remove("hidden");
  compare.classList.add("entering");
  renderCompareView();
  window.scrollTo({ top: 0 });
  setTimeout(() => compare.classList.remove("entering"), 500);
}

function showDetail() {
  $("#compare").classList.add("hidden");
  const detail = $("#detail");
  detail.classList.remove("hidden");
  window.scrollTo({ top: 0 });
}

// ============================================================
// Tab Navigation
// ============================================================
function initTabs() {
  $$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      $$(".tab-panel").forEach((p) => {
        p.classList.toggle("active", p.dataset.tab === tab);
      });
    });
  });
}

function activateTab(tabName) {
  $$(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabName));
  $$(".tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.tab === tabName));
}

// ============================================================
// Helpers
// ============================================================
function computePhoneStats(phone) {
  let rawCost = 0;
  let totalWater = 0;
  let totalCo2Materials = 0;
  const countrySet = new Set();

  phone.materials.forEach((m) => {
    const info = materials[m.id];
    if (!info) return;
    const kg = m.grams / 1000;
    rawCost += info.pricePerKg * kg;
    totalWater += info.eco.waterPerKg * kg;
    totalCo2Materials += info.eco.co2PerKg * kg;
    info.sources.forEach((s) => countrySet.add(s.country));
  });

  return { rawCost, totalWater, totalCo2Materials, countries: countrySet.size };
}

function animateValue(id, target, fmt) {
  const el = $(`#${id}`);
  if (!el) return;
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

function fmtNum(n) {
  return n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(1);
}

// ============================================================
// Render Detail View
// ============================================================
function renderDetail() {
  activateTab("impact");
  renderHeader();
  renderEvolution();
  renderStats();
  renderLifecycleBreakdown();
  renderEcoFootprint();
  renderMap();
  renderDonut();
  renderBars();
  renderMaterialCards();
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

// -------------------- Evolution / What Changed --------------------
function renderEvolution() {
  const section = $("#evolution-section");
  const container = $("#evolution-cards");
  const changes = currentPhone.changes;

  if (!changes || changes.length === 0) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");

  container.innerHTML = changes
    .map((c) => {
      const icon = c.direction === "improved" ? "▲" : "●";
      const cls = c.direction === "improved" ? "evo-improved" : "evo-neutral";
      return `<div class="evo-item ${cls}"><span class="evo-icon">${icon}</span> ${c.text}</div>`;
    })
    .join("");
}

// -------------------- Stats (impact-first) --------------------
function renderStats() {
  const stats = computePhoneStats(currentPhone);

  // CO₂
  animateValue("stat-co2", currentPhone.carbonFootprint, (v) => Math.round(v));
  const gallons = (currentPhone.carbonFootprint / 8.89).toFixed(1);
  $("#stat-co2-equiv").textContent = `≈ ${gallons} gallons of gas burned`;

  // Source citation
  const sourceEl = $("#stat-co2-source");
  if (sourceEl && currentPhone.carbonSourceUrl) {
    sourceEl.innerHTML = `<a href="${currentPhone.carbonSourceUrl}" target="_blank" rel="noopener">Source: ${currentPhone.carbonSource}</a>`;
    sourceEl.classList.remove("hidden");
  } else if (sourceEl) {
    sourceEl.classList.add("hidden");
  }

  // Water (lifecycle — includes chip fab, manufacturing, not just material extraction)
  animateValue("stat-water", currentPhone.waterFootprint, (v) =>
    Math.round(v).toLocaleString()
  );
  const bathtubs = (currentPhone.waterFootprint / 300).toFixed(1);
  $("#stat-water-equiv").textContent = `≈ ${bathtubs} bathtubs`;

  // Countries
  animateValue("stat-countries", stats.countries, (v) => Math.round(v));
  $("#stat-countries-equiv").textContent = "across 6 continents";

  // Raw cost
  animateValue("stat-raw-cost", stats.rawCost, (v) => "$" + v.toFixed(2));
  $("#stat-raw-equiv").textContent = "total raw materials";

  // Retail
  animateValue("stat-retail", currentPhone.retailPrice, (v) =>
    "$" + Math.round(v)
  );
  $("#stat-retail-equiv").textContent = "at launch";

  // Markup
  const markup = currentPhone.retailPrice / stats.rawCost;
  animateValue("stat-markup", markup, (v) => Math.round(v) + "x");
  $("#stat-markup-equiv").textContent = "materials → retail";
}

// -------------------- Lifecycle Breakdown --------------------
function renderLifecycleBreakdown() {
  const stats = computePhoneStats(currentPhone);
  const phone = currentPhone;

  // --- CO2 ---
  const matCo2 = stats.totalCo2Materials;
  const mfgCo2 = phone.carbonFootprint - matCo2;
  const co2Pct = Math.max((matCo2 / phone.carbonFootprint) * 100, 1);

  $("#breakdown-co2-total").textContent = `(${phone.carbonFootprint} kg total)`;
  $("#breakdown-co2-bar").innerHTML = `
    <div class="breakdown-bar">
      <div class="breakdown-seg breakdown-seg-extract" style="width:${co2Pct}%">
        <span class="breakdown-seg-label">${matCo2.toFixed(1)} kg</span>
      </div>
      <div class="breakdown-seg breakdown-seg-mfg">
        <span class="breakdown-seg-label">${mfgCo2.toFixed(1)} kg</span>
      </div>
    </div>
    <div class="breakdown-bar-labels">
      <span>Material Extraction</span>
      <span>Manufacturing &amp; Use</span>
    </div>`;
  const co2RealPct = ((matCo2 / phone.carbonFootprint) * 100).toFixed(1);
  $("#breakdown-co2-note").textContent =
    `Material extraction accounts for ${co2RealPct}% of lifecycle CO\u2082`;

  // --- Water ---
  const matWater = stats.totalWater;
  const mfgWater = phone.waterFootprint - matWater;
  const waterPct = Math.max((matWater / phone.waterFootprint) * 100, 1);

  $("#breakdown-water-total").textContent =
    `(${phone.waterFootprint.toLocaleString()} L total)`;
  $("#breakdown-water-bar").innerHTML = `
    <div class="breakdown-bar">
      <div class="breakdown-seg breakdown-seg-extract" style="width:${waterPct}%">
        <span class="breakdown-seg-label">${Math.round(matWater)} L</span>
      </div>
      <div class="breakdown-seg breakdown-seg-mfg">
        <span class="breakdown-seg-label">${mfgWater.toLocaleString()} L</span>
      </div>
    </div>
    <div class="breakdown-bar-labels">
      <span>Material Extraction</span>
      <span>Manufacturing &amp; Use</span>
    </div>`;
  const waterRealPct = ((matWater / phone.waterFootprint) * 100).toFixed(1);
  $("#breakdown-water-note").textContent =
    `Material extraction accounts for just ${waterRealPct}% of lifecycle water`;

  // --- Cost (three segments) ---
  const rawCost = stats.rawCost;
  const bomCost = phone.bomCost;
  const retail = phone.retailPrice;
  const mfgCost = bomCost - rawCost;
  const otherCost = retail - bomCost;

  const rawPct = Math.max((rawCost / retail) * 100, 1);
  const bomPct = (mfgCost / retail) * 100;

  $("#breakdown-cost-total").textContent = `($${retail} retail)`;
  $("#breakdown-cost-bar").innerHTML = `
    <div class="breakdown-bar">
      <div class="breakdown-seg breakdown-seg-extract" style="width:${rawPct}%">
        <span class="breakdown-seg-label">$${rawCost.toFixed(2)}</span>
      </div>
      <div class="breakdown-seg breakdown-seg-bom" style="width:${bomPct}%">
        <span class="breakdown-seg-label">$${Math.round(mfgCost)}</span>
      </div>
      <div class="breakdown-seg breakdown-seg-other">
        <span class="breakdown-seg-label">$${Math.round(otherCost)}</span>
      </div>
    </div>
    <div class="breakdown-bar-labels breakdown-bar-labels-3">
      <span>Raw Materials</span>
      <span>Components &amp; Assembly</span>
      <span>R&amp;D, Software, Marketing, Profit</span>
    </div>`;
  const costRealPct = ((rawCost / retail) * 100).toFixed(1);
  $("#breakdown-cost-note").textContent =
    `Raw minerals cost just $${rawCost.toFixed(2)} — only ${costRealPct}% of the $${retail} retail price`;
}

// -------------------- Environmental Footprint --------------------
function renderEcoFootprint() {
  const mats = currentPhone.materials;

  // Calculate CO₂ and water per material
  const ecoData = mats
    .map((m) => {
      const info = materials[m.id];
      if (!info) return null;
      const kg = m.grams / 1000;
      return {
        id: m.id,
        name: info.name,
        color: info.color,
        co2: info.eco.co2PerKg * kg,
        water: info.eco.waterPerKg * kg,
      };
    })
    .filter(Boolean);

  // CO₂ bars (sorted by CO₂ desc)
  const byCo2 = [...ecoData].sort((a, b) => b.co2 - a.co2);
  const maxCo2 = byCo2[0]?.co2 || 1;
  $("#eco-co2-bars").innerHTML = byCo2
    .map(
      (d) => `
    <div class="eco-bar-row">
      <span class="eco-bar-label">${d.name}</span>
      <div class="eco-bar-track">
        <div class="eco-bar-fill" style="width:0%;background:${d.color}" data-target="${(d.co2 / maxCo2) * 100}"></div>
      </div>
      <span class="eco-bar-value">${d.co2 >= 0.01 ? d.co2.toFixed(2) : d.co2.toFixed(4)}</span>
    </div>`
    )
    .join("");

  // Water bars (sorted by water desc)
  const byWater = [...ecoData].sort((a, b) => b.water - a.water);
  const maxWater = byWater[0]?.water || 1;
  $("#eco-water-bars").innerHTML = byWater
    .map(
      (d) => `
    <div class="eco-bar-row">
      <span class="eco-bar-label">${d.name}</span>
      <div class="eco-bar-track">
        <div class="eco-bar-fill" style="width:0%;background:${d.color}" data-target="${(d.water / maxWater) * 100}"></div>
      </div>
      <span class="eco-bar-value">${fmtNum(d.water)}</span>
    </div>`
    )
    .join("");

  // Animate all eco bars in
  requestAnimationFrame(() => {
    document.querySelectorAll("#eco-footprint .eco-bar-fill").forEach((bar) => {
      bar.style.width = bar.dataset.target + "%";
    });
  });
}

// -------------------- Interactive World Map --------------------
function preloadMap() {
  fetch("world.svg")
    .then((r) => r.text())
    .then((svgText) => {
      const parser = new DOMParser();
      mapSvgDoc = parser.parseFromString(svgText, "image/svg+xml");
    })
    .catch(() => {
      // SVG failed to load — will fall back to country list
    });
}

// Category color palette for map
const categoryColors = {
  "Structural Metal": { base: [59, 130, 246], label: "Structural Metals" },   // blue
  "Battery Material": { base: [239, 68, 68], label: "Battery Materials" },     // red
  "Precious Metal":   { base: [234, 179, 8], label: "Precious Metals" },       // gold
  "Electronics":      { base: [139, 92, 246], label: "Electronics" },           // purple
  "Other":            { base: [107, 114, 128], label: "Other" },               // grey
};

function renderMap() {
  const container = $("#supply-map");
  const tooltip = $("#map-tooltip");

  if (!mapSvgDoc) {
    renderSupplyChainFallback();
    return;
  }

  const svgEl = mapSvgDoc.documentElement.cloneNode(true);
  svgEl.setAttribute("id", "world-map-svg");
  svgEl.classList.add("world-map");

  // Build country → { materials, categories } map
  const countryIsoMap = {};
  currentPhone.materials.forEach((m) => {
    const info = materials[m.id];
    if (!info) return;
    info.sources.forEach((s) => {
      if (!countryIsoMap[s.iso]) {
        countryIsoMap[s.iso] = {
          country: s.country, flag: s.flag,
          materials: new Set(), categoryCount: {},
        };
      }
      const entry = countryIsoMap[s.iso];
      entry.materials.add(info.name);
      entry.categoryCount[info.category] = (entry.categoryCount[info.category] || 0) + 1;
    });
  });

  // Determine dominant category per country
  Object.values(countryIsoMap).forEach((entry) => {
    let maxCat = "Other", maxCount = 0;
    for (const [cat, count] of Object.entries(entry.categoryCount)) {
      if (count > maxCount) { maxCount = count; maxCat = cat; }
    }
    entry.dominantCategory = maxCat;
  });

  const maxMats = Math.max(...Object.values(countryIsoMap).map((c) => c.materials.size));

  svgEl.querySelectorAll("path").forEach((path) => {
    const id = path.getAttribute("id") || (path.parentElement && path.parentElement.getAttribute("id"));
    if (countryIsoMap[id]) {
      const data = countryIsoMap[id];
      const catInfo = categoryColors[data.dominantCategory] || categoryColors["Other"];
      const [br, bg, bb] = catInfo.base;
      // Intensity: blend from light (few materials) to full color (many)
      const t = maxMats > 1 ? (data.materials.size - 1) / (maxMats - 1) : 1;
      const minOpacity = 0.3, opacity = minOpacity + t * (1 - minOpacity);
      const r = Math.round(255 + (br - 255) * opacity);
      const g = Math.round(255 + (bg - 255) * opacity);
      const b = Math.round(255 + (bb - 255) * opacity);
      path.style.fill = `rgb(${r},${g},${b})`;
      path.style.cursor = "pointer";
      path.classList.add("map-source");

      path.addEventListener("mouseenter", () => {
        tooltip.classList.remove("hidden");
        tooltip.innerHTML = `
          <strong>${data.flag} ${data.country}</strong>
          <div class="map-tip-mats">${[...data.materials].join(", ")}</div>
          <div class="map-tip-count">${data.materials.size} material${data.materials.size > 1 ? "s" : ""}</div>`;
      });

      path.addEventListener("mousemove", (e) => {
        const rect = container.getBoundingClientRect();
        tooltip.style.left = (e.clientX - rect.left + 12) + "px";
        tooltip.style.top = (e.clientY - rect.top - 10) + "px";
      });

      path.addEventListener("mouseleave", () => {
        tooltip.classList.add("hidden");
      });
    } else {
      path.style.fill = "#f0f0f0";
    }
    path.style.stroke = "#e0e0e0";
    path.style.strokeWidth = "0.3";
  });

  const existing = container.querySelector(".world-map");
  if (existing) existing.remove();
  container.prepend(svgEl);

  // Build category legend
  let legend = container.querySelector(".map-legend");
  if (!legend) {
    legend = document.createElement("div");
    legend.className = "map-legend";
    container.appendChild(legend);
  }
  // Show only categories that appear in the current phone's source countries
  const usedCats = new Set(Object.values(countryIsoMap).map((c) => c.dominantCategory));
  const totalCountries = Object.keys(countryIsoMap).length;
  const legendItems = [...usedCats].map((cat) => {
    const ci = categoryColors[cat] || categoryColors["Other"];
    return `<span class="map-legend-item"><span class="map-legend-dot" style="background:rgb(${ci.base.join(",")})"></span>${ci.label}</span>`;
  }).join("");
  legend.innerHTML = `${legendItems}<span class="map-legend-count">${totalCountries} source countries</span>`;
}

function renderSupplyChainFallback() {
  const container = $("#supply-map");
  const mats = currentPhone.materials;

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

  const countries = Object.entries(countryMap).sort(
    (a, b) => b[1].materials.size - a[1].materials.size
  );

  container.innerHTML = `<div class="country-list-fallback">${countries
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
    .join("")}</div>`;
}

// -------------------- Donut Chart --------------------
function renderDonut() {
  const svg = $("#donut-chart");
  const legend = $("#chart-legend");
  const mats = currentPhone.materials;
  const totalGrams = mats.reduce((s, m) => s + m.grams, 0);

  const r = 86;
  const C = 2 * Math.PI * r;
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

  $("#donut-center-value").textContent = totalGrams.toFixed(1) + "g";
  $("#donut-center-label").textContent = "Total Weight";

  svg.querySelectorAll("circle").forEach((c) => {
    c.addEventListener("mouseenter", () => {
      $("#donut-center-value").textContent =
        parseFloat(c.dataset.grams).toFixed(2) + "g";
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

  requestAnimationFrame(() => {
    container.querySelectorAll(".bar-fill").forEach((bar) => {
      bar.style.width = bar.dataset.target + "%";
    });
  });

  container.querySelectorAll(".bar-row").forEach((row) => {
    row.addEventListener("click", () => {
      const card = document.querySelector(
        `.mat-card[data-id="${row.dataset.id}"]`
      );
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

  container.querySelectorAll(".mat-card").forEach((card) => {
    card.addEventListener("click", () => {
      card.classList.toggle("expanded");
    });
  });
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

// ============================================================
// Compare View
// ============================================================
function renderCompareView() {
  $("#compare-back-name").textContent = currentPhone.name;
  $("#compare-highlight-name").textContent = currentPhone.name;

  const metrics = [
    {
      title: "Carbon Footprint",
      unit: "kg CO₂",
      color: "#e11d48",
      getValue: (p) => p.carbonFootprint,
    },
    {
      title: "Water Usage",
      unit: "liters",
      color: "#0d9488",
      getValue: (p) => p.waterFootprint,
    },
    {
      title: "Raw Material Cost",
      unit: "$",
      color: "#d97706",
      getValue: (p) => computePhoneStats(p).rawCost,
    },
    {
      title: "Retail Price",
      unit: "$",
      color: "#7c3aed",
      getValue: (p) => p.retailPrice,
    },
    {
      title: "CO\u2082: Extraction vs Manufacturing",
      unit: "kg CO\u2082",
      color: "#e11d48",
      isStacked: true,
      getValues: (p) => {
        const s = computePhoneStats(p);
        return {
          extraction: s.totalCo2Materials,
          manufacturing: p.carbonFootprint - s.totalCo2Materials,
          total: p.carbonFootprint,
        };
      },
    },
  ];

  const container = $("#compare-charts");
  container.innerHTML = metrics
    .map((metric) => {
      if (metric.isStacked) {
        const data = phones.map((p) => ({
          id: p.id,
          name: p.name,
          ...metric.getValues(p),
          isCurrent: p.id === currentPhone.id,
        }));
        data.sort((a, b) => b.total - a.total);
        const maxVal = data[0]?.total || 1;

        const bars = data
          .map((d) => {
            const totalPct = (d.total / maxVal) * 100;
            const extPct = (d.extraction / d.total) * 100;
            return `
          <div class="cmp-row ${d.isCurrent ? "cmp-highlight" : ""}">
            <span class="cmp-label">${d.name}</span>
            <div class="cmp-track">
              <div class="cmp-fill-stacked" style="width:0%" data-target="${totalPct}">
                <div class="cmp-fill-ext" style="width:${extPct}%"></div>
                <div class="cmp-fill-mfg" style="flex:1"></div>
              </div>
            </div>
            <span class="cmp-value">${d.extraction.toFixed(1)} / ${d.manufacturing.toFixed(0)}</span>
          </div>`;
          })
          .join("");

        return `
        <div class="cmp-chart">
          <h3>${metric.title} <span class="h3-sub">(${metric.unit})</span></h3>
          <div class="cmp-legend">
            <span class="cmp-legend-item"><span class="cmp-legend-dot" style="background:var(--accent2)"></span>Extraction</span>
            <span class="cmp-legend-item"><span class="cmp-legend-dot" style="background:rgba(0,0,0,0.12)"></span>Manufacturing</span>
          </div>
          ${bars}
        </div>`;
      }

      const data = phones.map((p) => ({
        id: p.id,
        name: p.name,
        value: metric.getValue(p),
        isCurrent: p.id === currentPhone.id,
      }));

      // Sort by value descending
      data.sort((a, b) => b.value - a.value);
      const maxVal = data[0]?.value || 1;

      const bars = data
        .map(
          (d) => `
        <div class="cmp-row ${d.isCurrent ? "cmp-highlight" : ""}">
          <span class="cmp-label">${d.name}</span>
          <div class="cmp-track">
            <div class="cmp-fill" style="width:0%;background:${d.isCurrent ? metric.color : "rgba(0,0,0,0.12)"}" data-target="${(d.value / maxVal) * 100}"></div>
          </div>
          <span class="cmp-value">${metric.unit === "$" ? "$" + d.value.toFixed(2) : fmtNum(d.value)}</span>
        </div>`
        )
        .join("");

      return `
      <div class="cmp-chart">
        <h3>${metric.title} <span class="h3-sub">(${metric.unit})</span></h3>
        ${bars}
      </div>`;
    })
    .join("");

  // Animate comparison bars
  requestAnimationFrame(() => {
    container.querySelectorAll(".cmp-fill").forEach((bar) => {
      bar.style.width = bar.dataset.target + "%";
    });
    container.querySelectorAll(".cmp-fill-stacked").forEach((bar) => {
      bar.style.width = bar.dataset.target + "%";
    });
  });
}

