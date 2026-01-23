/* Comptage Déchets – PWA prototype (local only) */

const STORAGE_KEY = "grenoble_dechets_v09";

const SECTEURS = [
  "Grenoble – Secteur 1",
  "Grenoble – Secteur 2",
  "Grenoble – Secteur 3",
  "Grenoble – Secteur 4",
  "Grenoble – Secteur 5",
  "Grenoble – Secteur 6",
];

const GROUPS = [
  {
    id: "dejections",
    title: "Déjections & Dépôts",
    tone: "#f6d8b8",
    items: [
      { id: "dejections_canines", name: "Déjections canines", unit: "1 unité = 1 crotte" },
      { id: "depots_sauvages", name: "Dépôts sauvages", unit: "1 unité = 1 dépôt" },
      { id: "sacs_ordures", name: "Sacs d’ordures", unit: "1 unité = 1 sac" },
    ],
  },
  {
    id: "papiers",
    title: "Papiers",
    tone: "#dbeafe",
    items: [
      { id: "papiers_a5", name: "Papiers / journaux > A5", unit: "1 unité = 10 papiers" },
      { id: "petits_papiers", name: "Petits papiers < A5", unit: "1 unité = 10 papiers" },
    ],
  },
  {
    id: "verre_megots",
    title: "Verre & Mégots",
    tone: "#dcfce7",
    items: [
      { id: "verre_debris", name: "Verre & débris", unit: "1 unité = 1 poignée" },
      { id: "megots", name: "Mégots", unit: "1 unité = 10 mégots / m²" },
    ],
  },
  {
    id: "alimentaire_chimique",
    title: "Alimentaire & Chimique",
    tone: "#fde68a",
    items: [
      { id: "dechets_alimentaires", name: "Déchets alimentaires", unit: "1 unité = 1 tas" },
      { id: "protoxyde", name: "Cartouches protoxyde", unit: "1 unité = 1 cartouche" },
    ],
  },
  {
    id: "sols_vegetaux",
    title: "Sols & Végétaux",
    tone: "#e9d5ff",
    items: [
      { id: "souillures", name: "Souillures adhérentes", unit: "1 unité = 20x20 cm" },
      { id: "feuilles", name: "Feuilles mortes", unit: "1 unité = 1 m²" },
    ],
  },
];

function uid() {
  // simple unique id (not crypto)
  return "c_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { agent: "", collectes: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { agent: "", collectes: [] };
    parsed.collectes ||= [];
    parsed.agent ||= "";
    return parsed;
  } catch {
    return { agent: "", collectes: [] };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

let current = null; // current collecte draft

// Elements
const viewHome = document.getElementById("viewHome");
const viewCount = document.getElementById("viewCount");
const viewReview = document.getElementById("viewReview");
const viewHistory = document.getElementById("viewHistory");
const viewHistoryDetail = document.getElementById("viewHistoryDetail");
const btnBackHistory = document.getElementById("btnBackHistory");
const historyDetailMeta = document.getElementById("historyDetailMeta");
const historyDetailItems = document.getElementById("historyDetailItems");

const viewHistoryDetail = document.getElementById("viewHistoryDetail");
const historyDetailMeta = document.getElementById("historyDetailMeta");

const agentInput = document.getElementById("agentInput");
const secteurSelect = document.getElementById("secteurSelect");
const datetimeMeta = document.getElementById("datetimeMeta");

const btnStart = document.getElementById("btnStart");
const btnHistory = document.getElementById("btnHistory");
const btnExport = document.getElementById("btnExport");

const groupsEl = document.getElementById("groups");
const totalValue = document.getElementById("totalValue");
const btnEnd = document.getElementById("btnEnd");

const reviewMeta = document.getElementById("reviewMeta");
const reviewDetails = document.getElementById("reviewDetails");
const reviewTotal = document.getElementById("reviewTotal");
const btnBackToCount = document.getElementById("btnBackToCount");
const btnSave = document.getElementById("btnSave");

const historyList = document.getElementById("historyList");
const btnBackHome = document.getElementById("btnBackHome");

// Init UI
agentInput.value = state.agent || "";
SECTEURS.forEach(s => {
  const opt = document.createElement("option");
  opt.value = s;
  opt.textContent = s;
  secteurSelect.appendChild(opt);
});
datetimeMeta.textContent = new Date().toLocaleString("fr-FR");

renderGroups();
updateTotal();

// Service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

function show(view) {
  [viewHome, viewCount, viewReview, viewHistory, viewHistoryDetail].forEach(v => v.classList.add("hidden"));
  view.classList.remove("hidden");
}


function openModal() { modal.classList.remove("hidden"); }
function closeModal() { modal.classList.add("hidden"); }

btnStart.addEventListener("click", () => {
  const agent = agentInput.value.trim();
  if (!agent) {
    alert("Merci de renseigner l’agent.");
    return;
  }
  state.agent = agent;
  saveState(state);

  current = {
    collecte_id: uid(),
    agent,
    secteur: secteurSelect.value,
    date_debut: new Date().toISOString(),
    date_fin: null,
    details: {},
  };

  // init counts
  GROUPS.forEach(g => g.items.forEach(it => (current.details[it.id] = 0)));

  updateTotal();
  show(viewCount);
});

btnEnd.addEventListener("click", () => {
  if (!current) return;
  current.date_fin = new Date().toISOString();
  showReview();
  show(viewReview);
});

btnBackToCount.addEventListener("click", () => show(viewCount));

btnSave.addEventListener("click", () => {
  if (!current) return;

  const total = computeTotal(current.details);
  const collecte = {
    collecte_id: current.collecte_id,
    agent: current.agent,
    secteur: current.secteur,
    date_debut: current.date_debut,
    date_fin: current.date_fin,
    total,
    details: current.details,
    statut: "LOCAL", // future: EN_ATTENTE / SYNC_OK
  };

  state.collectes.unshift(collecte);
  saveState(state);

  current = null;
  alert("Collecte enregistrée (local).");
  show(viewHome);
});

btnHistory.addEventListener("click", () => {
  renderHistory();
  show(viewHistory);
});
btnBackHistory.addEventListener("click", () => {
  show(viewHistory);
});

btnBackHome.addEventListener("click", () => show(viewHome));

btnExport.addEventListener("click", () => {
  const csv = buildCSV(state.collectes);
  const BOM = "\uFEFF";
const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
a.download = "BILAN_PU_collectes.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

function renderGroups() {
  groupsEl.innerHTML = "";
  GROUPS.forEach(group => {
    const wrap = document.createElement("div");
    wrap.className = "group";

    const header = document.createElement("div");
    header.className = "groupHeader";
    header.style.background = group.tone;
    header.innerHTML = `<div>${group.title}</div><div class="small">➕ / ➖</div>`;
    wrap.appendChild(header);

    const body = document.createElement("div");
    body.className = "groupBody";

    group.items.forEach(item => {
      const row = document.createElement("div");
      row.className = "item";

      const left = document.createElement("div");
      left.className = "itemLeft";
      left.innerHTML = `<div class="itemName">${item.name}</div><div class="itemUnit">${item.unit}</div>`;

      const counter = document.createElement("div");
      counter.className = "counter";

      const minus = document.createElement("button");
      minus.className = "pillBtn minus";
      minus.textContent = "−";
      minus.addEventListener("click", () => change(item.id, -1));

      const val = document.createElement("div");
      val.className = "countVal";
      val.id = `val_${item.id}`;
      val.textContent = "0";

      const plus = document.createElement("button");
      plus.className = "pillBtn plus";
      plus.textContent = "+";
      plus.addEventListener("click", () => change(item.id, +1));

      counter.appendChild(minus);
      counter.appendChild(val);
      counter.appendChild(plus);

      row.appendChild(left);
      row.appendChild(counter);
      body.appendChild(row);
    });

    wrap.appendChild(body);
    groupsEl.appendChild(wrap);
  });
}

function change(itemId, delta) {
  if (!current) return;
  const next = Math.max(0, (current.details[itemId] || 0) + delta);
  current.details[itemId] = next;
  const el = document.getElementById(`val_${itemId}`);
  if (el) el.textContent = String(next);
  updateTotal();
  // little haptic (iOS)
  if (navigator.vibrate) navigator.vibrate(10);
}

function computeTotal(details) {
  return Object.values(details).reduce((a, b) => a + (Number(b) || 0), 0);
}

function updateTotal() {
  const total = current ? computeTotal(current.details) : 0;
  totalValue.textContent = String(total);
}

function showReview() {
  if (!current) return;

  const d0 = new Date(current.date_debut);
  const d1 = new Date(current.date_fin || current.date_debut);
  const minutes = Math.max(0, Math.round((d1 - d0) / 60000));

  reviewMeta.innerHTML = `
    <div><span class="strong">Agent :</span> ${escapeHtml(current.agent)}</div>
    <div><span class="strong">Secteur :</span> ${escapeHtml(current.secteur)}</div>
    <div><span class="strong">Début :</span> ${d0.toLocaleString("fr-FR")}</div>
    <div><span class="strong">Durée :</span> ${minutes} min</div>
  `;

  reviewDetails.innerHTML = "";
  GROUPS.forEach(g => g.items.forEach(it => {
    const q = current.details[it.id] || 0;
    if (q === 0) return;
    const li = document.createElement("div");
    li.className = "listItem";
    li.innerHTML = `<div class="rowBetween"><div>${escapeHtml(it.name)}</div><div class="strong">${q}</div></div>
                    <div class="small">${escapeHtml(it.unit)}</div>`;
    reviewDetails.appendChild(li);
  }));

  const total = computeTotal(current.details);
  reviewTotal.textContent = String(total);
}

function renderHistory() {
  historyList.innerHTML = "";

  if (!state.collectes.length) {
    historyList.innerHTML = `<div class="meta">Aucune collecte enregistrée.</div>`;
    return;
  }

  state.collectes.slice(0, 50).forEach(c => {
    const d = new Date(c.date_debut);
    const badge = c.statut === "LOCAL" ? "⏳ local" : "✔️ sync";

    const div = document.createElement("div");
    div.className = "listItem";

    const line1 = document.createElement("div");
    line1.className = "rowBetween";

    const left = document.createElement("div");
    left.className = "strong";
    left.textContent = `${d.toLocaleDateString("fr-FR")} – ${c.secteur}`;

    const right = document.createElement("div");
    right.className = "strong";
    right.textContent = String(c.total);

    line1.appendChild(left);
    line1.appendChild(right);

    const line2 = document.createElement("div");
    line2.className = "small";
    line2.textContent = `${c.agent} • ${badge}`;

    div.appendChild(line1);
    div.appendChild(line2);

    div.addEventListener("click", () => {
      if (typeof openHistoryDetail === "function") {
        openHistoryDetail(c.collecte_id);
      }
    });

    historyList.appendChild(div);
  });
}
function openHistoryDetail(collecteId) {
  const c = state.collectes.find(x => x.collecte_id === collecteId);
  if (!c) {
    alert("Collecte introuvable.");
    return;
  }

  const d0 = c.date_debut ? new Date(c.date_debut) : null;
  const d1 = c.date_fin ? new Date(c.date_fin) : null;
  const duree = (d0 && d1) ? Math.max(0, Math.round((d1 - d0) / 60000)) : "";

  historyDetailMeta.innerHTML = `
    <div><span class="strong">Agent :</span> ${escapeHtml(c.agent || "")}</div>
    <div><span class="strong">Secteur :</span> ${escapeHtml(c.secteur || "")}</div>
    <div><span class="strong">Date :</span> ${d0 ? d0.toLocaleString("fr-FR") : ""}</div>
    <div><span class="strong">Durée :</span> ${duree !== "" ? duree + " min" : "-"}</div>
    <div><span class="strong">Total :</span> ${escapeHtml(String(c.total ?? 0))}</div>
  `;

  historyDetailItems.innerHTML = "";

  // afficher dans l'ordre des groupes/items de la grille
  GROUPS.forEach(g => {
    const block = document.createElement("div");
    block.className = "card";
    block.style.borderLeft = `6px solid ${g.tone}`;

    const title = document.createElement("div");
    title.className = "strong";
    title.style.marginBottom = "8px";
    title.textContent = g.title;

    block.appendChild(title);

    let hasAny = false;

    g.items.forEach(it => {
      const q = (c.details && Number(c.details[it.id])) || 0;
      if (q === 0) return;
      hasAny = true;

      const row = document.createElement("div");
      row.className = "listItem";
      row.innerHTML = `
        <div class="rowBetween">
          <div>${escapeHtml(it.name)}</div>
          <div class="strong">${q}</div>
        </div>
        <div class="small">${escapeHtml(it.unit)}</div>
      `;
      block.appendChild(row);
    });

    if (hasAny) {
      historyDetailItems.appendChild(block);
    }
  });

  if (!historyDetailItems.children.length) {
    historyDetailItems.innerHTML = `<div class="meta">Aucun détail enregistré pour cette collecte.</div>`;
  }

  show(viewHistoryDetail);
}


function buildCSV(collectes) {
  // Export OFFICIEL "Grille PU" (1 colonne = 1 collecte)
  // Conforme à l'ordre du fichier: Grilles Relevé_Interne PU2026.ods

  const cols = [
    "Mois",
    "Année",
    "secteur évalué",
    "Nom évaluateur",
    "date et heure de l'évaluation",
    "Durée (min)",

    // Détritus (ordre exact de la grille)
    "déjections canines",
    "dépôts sauvages",
    "sacs d'ordures ménagères",
    "papiers, emballages, journaux",
    "petits papiers",
    "verre et débris de verre",
    "mégots",
    "déchets alimentaires organiques",
    "cartouche protoxyde",
    "souillures adhérentes (taches)",
    "feuilles mortes"
  ];

  const lines = [cols.join(",")];

  collectes.forEach((c) => {
    const d0 = c.date_debut ? new Date(c.date_debut) : null;
    const mois = d0 ? String(d0.getMonth() + 1).padStart(2, "0") : "";
    const annee = d0 ? String(d0.getFullYear()) : "";
    const dateFR = d0 ? d0.toLocaleString("fr-FR") : "";

    // Durée en minutes (si dispo). Sinon, on calcule si date_fin existe.
    let dureeMin = "";
    if (typeof c.duree_min === "number") {
      dureeMin = String(c.duree_min);
    } else if (c.date_debut && c.date_fin) {
      const d1 = new Date(c.date_fin);
      const mins = Math.max(0, Math.round((d1 - d0) / 60000));
      dureeMin = String(mins);
    }

    // Mapping IDs app -> intitulés grille
    const details = c.details || {};
    const get = (id) => String(details[id] ?? 0);

    const row = [
      mois,
      annee,
      c.secteur || "",
      c.agent || "",
      dateFR,
      dureeMin,

      // Détritus (ordre exact)
      get("dejections_canines"),
      get("depots_sauvages"),
      get("sacs_ordures"),
      get("papiers_a5"),
      get("petits_papiers"),
      get("verre_debris"),
      get("megots"),
      get("dechets_alimentaires"),
      get("protoxyde"),
      get("souillures"),
      get("feuilles")
    ].map(csvCell);

    lines.push(row.join(","));
  });

  return lines.join("\n");
}

function csvCell(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
