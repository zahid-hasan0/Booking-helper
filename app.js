/* ==========================================================================
   BookingFlow — Logic (Playful & Bright Material Design)
   ========================================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyCkWa91TIn8xd_SoZmxBtQCj05pPVH-Ku0",
    authDomain: "booking-management-5f89d.firebaseapp.com",
    projectId: "booking-management-5f89d",
    storageBucket: "booking-management-5f89d.firebasestorage.app",
    messagingSenderId: "769475750124",
    appId: "1:769475750124:web:75fac4bf1a0ffc11059dc9",
    measurementId: "G-E3HL3W9DMK"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.settings({ experimentalForceLongPolling: true });

// ══════════════════════════════════════════════════════════════════════════
// 1. STATE & INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════
const STORAGE_BUYERS = "bh_playful_buyers";
const STORAGE_BOOKINGS = "bh_playful_bookings";

const DEFAULT_BUYERS = [
    { shortName: "HM", fullName: "H&M" },
    { shortName: "ZR", fullName: "Zara" },
    { shortName: "NK", fullName: "Nike" },
    { shortName: "AD", fullName: "Adidas" }
];

const state = {
    bookings: [],
    buyers: [],
    activeTab: "dashboard-section",
    filters: { search: "", buyer: "all", status: "all", librarySearch: "" },
    sorting: { column: "index", direction: "asc" },
    pagination: { currentPage: 1, itemsPerPage: 25 }
};

document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupListeners();
});

async function initApp() {
    await fetchBuyersFromFirebase();
    const savedBookings = localStorage.getItem(STORAGE_BOOKINGS);
    if (savedBookings) state.bookings = JSON.parse(savedBookings);

    updateMetrics();
    populateSelects();
    renderBookings();
    renderLibrary();
    toggleWipeBtn();
}

// ══════════════════════════════════════════════════════════════════════════
// 2. FIREBASE & STORAGE
// ══════════════════════════════════════════════════════════════════════════
async function fetchBuyersFromFirebase() {
    try {
        const snap = await db.collection("buyers").get();
        let list = [];
        snap.forEach(doc => list.push(doc.data()));
        if (list.length === 0) {
            for (const b of DEFAULT_BUYERS) {
                await db.collection("buyers").doc(b.shortName.toUpperCase()).set(b);
            }
            list = [...DEFAULT_BUYERS];
        }
        state.buyers = list;
        localStorage.setItem(STORAGE_BUYERS, JSON.stringify(list));
    } catch (error) {
        console.error("Firebase Error:", error);
        showToast("Offline Mode", "Could not reach database.", "warning");
        const cache = localStorage.getItem(STORAGE_BUYERS);
        state.buyers = cache ? JSON.parse(cache) : [...DEFAULT_BUYERS];
    }
}

function saveBookings() { localStorage.setItem(STORAGE_BOOKINGS, JSON.stringify(state.bookings)); }
function saveBuyers() { localStorage.setItem(STORAGE_BUYERS, JSON.stringify(state.buyers)); }

async function addBuyerFB(shortName, fullName) {
    const key = shortName.toString().trim().toUpperCase();
    await db.collection("buyers").doc(key).set({ shortName: key, fullName: fullName.trim() });
}

async function updateBuyerFB(shortName, fullName) {
    const key = shortName.toString().trim().toUpperCase();
    await db.collection("buyers").doc(key).update({ fullName: fullName.trim() });
}

async function deleteBuyerFB(shortName) {
    const key = shortName.toString().trim().toUpperCase();
    await db.collection("buyers").doc(key).delete();
}

async function resetLibraryFB() {
    const snap = await db.collection("buyers").get();
    await Promise.all(snap.docs.map(doc => db.collection("buyers").doc(doc.id).delete()));
    await Promise.all(DEFAULT_BUYERS.map(b => db.collection("buyers").doc(b.shortName.toUpperCase()).set(b)));
}

// ══════════════════════════════════════════════════════════════════════════
// 3. UTILITIES & ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════
let confirmResolve = null;

function showCustomConfirm(title, message, type = "warning", proceedLbl = "Proceed", cancelLbl = "Cancel") {
    return new Promise(resolve => {
        confirmResolve = resolve;
        document.getElementById("confirm-title-node").textContent = title;
        document.getElementById("confirm-message-node").textContent = message;
        
        const btn = document.getElementById("confirm-btn-proceed");
        btn.textContent = proceedLbl;
        btn.className = "btn";
        btn.classList.add(type === "danger" ? "btn-danger" : "btn-primary");

        const iconNode = document.getElementById("confirm-icon-node");
        iconNode.className = "confirm-big-icon " + type;
        
        let svg = "";
        if (type === "danger" || type === "warning") {
            svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
        } else {
            svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
        }
        iconNode.innerHTML = svg;

        document.getElementById("confirm-modal").classList.add("active");
    });
}

function closeConfirm(status) {
    document.getElementById("confirm-modal").classList.remove("active");
    if (confirmResolve) { confirmResolve(status); confirmResolve = null; }
}

function showToast(title, msg, type = "info") {
    const box = document.getElementById("toast-container");
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    
    let icon = "";
    if (type === "success") icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
    else if (type === "error") icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
    else icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;

    t.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-text"><h4>${title}</h4><p>${msg}</p></div>
    `;
    box.appendChild(t);
    setTimeout(() => { t.classList.add("fade-out"); setTimeout(() => t.remove(), 300); }, 3000);
}

function generateId() { return 'id_' + Math.random().toString(36).substr(2, 9); }
function escapeHTML(str) { return (str||"").toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

function countUp(el, end) {
    let start = parseInt(el.textContent) || 0;
    if (start === end) { el.textContent = end; return; }
    let duration = 400, startTime = performance.now();
    function step(now) {
        let p = Math.min((now - startTime) / duration, 1);
        el.textContent = Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ══════════════════════════════════════════════════════════════════════════
// 4. LOGIC & MAPPING
// ══════════════════════════════════════════════════════════════════════════
function matchBuyer(shortName) {
    if (!shortName) return { fullName: "", status: "missing" };
    const sn = shortName.toString().trim().toUpperCase();
    if (!sn) return { fullName: "", status: "missing" };
    const match = state.buyers.find(b => b.shortName.toUpperCase() === sn);
    return match ? { fullName: match.fullName, status: "mapped" } : { fullName: "", status: "unmapped" };
}

function remapAll() {
    state.bookings = state.bookings.map(b => {
        const m = matchBuyer(b.shortName);
        return { ...b, fullName: m.fullName, status: m.status };
    });
    saveBookings();
    updateMetrics();
    renderBookings();
}

function updateMetrics() {
    const total = state.bookings.length;
    const mapped = state.bookings.filter(b => b.status === "mapped").length;
    const unmapped = state.bookings.filter(b => b.status === "unmapped" || b.status === "missing").length;
    const lib = state.buyers.length;

    countUp(document.getElementById("stat-total-bookings"), total);
    countUp(document.getElementById("stat-mapped-bookings"), mapped);
    countUp(document.getElementById("stat-unmapped-bookings"), unmapped);
    countUp(document.getElementById("stat-total-buyers"), lib);
}

function toggleWipeBtn() {
    const btn = document.getElementById("btn-clear-bookings");
    if (state.bookings.length > 0) btn.classList.remove("hidden");
    else btn.classList.add("hidden");
}

function populateSelects() {
    const filterSelect = document.getElementById("buyer-filter-select");
    const formSelect = document.getElementById("booking-form-buyer-select");
    filterSelect.innerHTML = `<option value="all">All Buyers</option>`;
    formSelect.innerHTML = `<option value="">-- Choose Buyer --</option>`;
    
    [...state.buyers].sort((a,b) => a.fullName.localeCompare(b.fullName)).forEach(b => {
        const txt = `${b.fullName} (${b.shortName})`;
        filterSelect.appendChild(new Option(txt, b.shortName));
        formSelect.appendChild(new Option(txt, b.shortName));
    });
}

// ══════════════════════════════════════════════════════════════════════════
// 5. BOOKING TABLE RENDER
// ══════════════════════════════════════════════════════════════════════════
function renderBookings() {
    const tbody = document.getElementById("bookings-table-body");
    const emptyState = document.getElementById("table-empty-state");
    const pagBar = document.getElementById("pagination-controls");
    tbody.innerHTML = "";

    const q = state.filters.search.toLowerCase();
    let filtered = state.bookings.filter(b => {
        if (q && !b.bookingNo.toLowerCase().includes(q) && !b.shortName.toLowerCase().includes(q) && !(b.fullName||"").toLowerCase().includes(q)) return false;
        if (state.filters.buyer !== "all" && b.shortName !== state.filters.buyer) return false;
        if (state.filters.status !== "all" && b.status !== state.filters.status) return false;
        return true;
    });

    const col = state.sorting.column, dir = state.sorting.direction === "asc" ? 1 : -1;
    filtered.sort((a,b) => {
        if (col === "index") return (state.bookings.indexOf(a) - state.bookings.indexOf(b)) * dir;
        return (a[col]||"").toString().localeCompare((b[col]||"").toString(), undefined, {numeric:true}) * dir;
    });

    if (state.bookings.length === 0) {
        emptyState.classList.remove("hidden");
        tbody.parentElement.classList.add("hidden");
        pagBar.classList.add("hidden");
        return;
    } else {
        emptyState.classList.add("hidden");
        tbody.parentElement.classList.remove("hidden");
        pagBar.classList.remove("hidden");
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">No matching data</td></tr>`;
        document.getElementById("totals-entries-info").textContent = "Showing 0 entries";
        return;
    }

    const totalPages = Math.ceil(filtered.length / state.pagination.itemsPerPage);
    if (state.pagination.currentPage > totalPages) state.pagination.currentPage = totalPages;
    const start = (state.pagination.currentPage - 1) * state.pagination.itemsPerPage;
    const pageItems = filtered.slice(start, start + state.pagination.itemsPerPage);

    document.getElementById("totals-entries-info").textContent = `Showing ${start + 1}–${Math.min(start + pageItems.length, filtered.length)} of ${filtered.length}`;
    
    pageItems.forEach((b, i) => {
        const tr = document.createElement("tr");
        if (b.status === "unmapped" || b.status === "missing") tr.classList.add("unmapped-row");

        let badge = "", mapCell = "";
        if (b.status === "mapped") {
            badge = `<span class="badge badge-green">Mapped</span>`;
            mapCell = `<span>${escapeHTML(b.fullName)}</span>`;
        } else if (b.status === "missing") {
            badge = `<span class="badge badge-red">Missing</span>`;
            mapCell = `<span style="color:var(--color-red); font-weight:800;">Blank Key</span>`;
        } else {
            badge = `<span class="badge badge-yellow">Unmapped</span>`;
            let opts = `<option value="">-- Map to Library --</option>`;
            [...state.buyers].sort((x,y) => x.fullName.localeCompare(y.fullName)).forEach(x => {
                opts += `<option value="${x.shortName}">${x.fullName} (${x.shortName})</option>`;
            });
            mapCell = `<select class="inline-select" data-id="${b.id}">${opts}</select>`;
        }

        tr.innerHTML = `
            <td style="color:var(--text-muted); font-weight:800;">#${start + i + 1}</td>
            <td style="font-weight:800; color:var(--primary);">${escapeHTML(b.bookingNo)}</td>
            <td><span class="badge badge-gray">${escapeHTML(b.shortName || "N/A")}</span></td>
            <td>${mapCell}</td>
            <td>${badge}</td>
            <td style="text-align: right;">
                <button class="action-circle edit-btn edit-bk-btn" data-id="${b.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
                <button class="action-circle delete-btn del-bk-btn" data-id="${b.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-16v1M8 8V4c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v4m2 0H4"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination(totalPages);

    // Bind inline mapping
    document.querySelectorAll(".inline-select").forEach(sel => {
        sel.addEventListener("change", (e) => {
            if (!e.target.value) return;
            const id = e.target.getAttribute("data-id");
            const sn = e.target.value;
            const b = state.buyers.find(x => x.shortName === sn);
            state.bookings = state.bookings.map(x => x.id === id ? { ...x, shortName: sn, fullName: b.fullName, status: "mapped" } : x);
            saveBookings(); updateMetrics(); renderBookings();
            showToast("Row Mapped", `Linked to ${b.fullName}`, "success");
        });
    });

    // Edit/Del
    document.querySelectorAll(".edit-bk-btn").forEach(btn => btn.addEventListener("click", () => openBookingModal("edit", btn.getAttribute("data-id"))));
    document.querySelectorAll(".del-bk-btn").forEach(btn => btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (await showCustomConfirm("Delete Row?", "Remove this booking record?", "danger")) {
            state.bookings = state.bookings.filter(x => x.id !== id);
            saveBookings(); updateMetrics(); toggleWipeBtn(); renderBookings();
            showToast("Deleted", "Row removed.", "success");
        }
    }));
}

function renderPagination(totalPages) {
    const prev = document.getElementById("page-prev-btn");
    const next = document.getElementById("page-next-btn");
    const list = document.getElementById("page-numbers-list");
    list.innerHTML = "";
    prev.disabled = state.pagination.currentPage === 1;
    next.disabled = state.pagination.currentPage === totalPages;

    let start = Math.max(1, state.pagination.currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);

    for (let i = start; i <= end; i++) {
        const b = document.createElement("button");
        b.className = `page-btn ${i === state.pagination.currentPage ? 'active' : ''}`;
        b.textContent = i;
        b.onclick = () => { state.pagination.currentPage = i; renderBookings(); };
        list.appendChild(b);
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 6. BUYER LIBRARY RENDER
// ══════════════════════════════════════════════════════════════════════════
function renderLibrary() {
    const tbody = document.getElementById("buyer-library-table-body");
    tbody.innerHTML = "";
    const q = state.filters.librarySearch.toLowerCase();
    const filtered = state.buyers.filter(b => b.shortName.toLowerCase().includes(q) || b.fullName.toLowerCase().includes(q));

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color:var(--text-muted);">Library Empty</td></tr>`;
        return;
    }

    filtered.forEach((b, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="color:var(--text-muted); font-weight:800;">#${i + 1}</td>
            <td><span class="badge badge-gray">${escapeHTML(b.shortName)}</span></td>
            <td style="font-weight:700;">${escapeHTML(b.fullName)}</td>
            <td style="text-align: right;">
                <button class="action-circle edit-btn edit-by-btn" data-sn="${b.shortName}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
                <button class="action-circle delete-btn del-by-btn" data-sn="${b.shortName}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-16v1M8 8V4c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v4m2 0H4"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll(".edit-by-btn").forEach(btn => btn.addEventListener("click", () => {
        const sn = btn.getAttribute("data-sn");
        openBuyerModal("edit", state.buyers.find(x => x.shortName === sn));
    }));

    document.querySelectorAll(".del-by-btn").forEach(btn => btn.addEventListener("click", async () => {
        const sn = btn.getAttribute("data-sn");
        if (await showCustomConfirm("Delete Key?", `Delete '${sn}'? Bookings using this key will become unmapped.`, "danger")) {
            try {
                showToast("Deleting", "Removing from Database...", "info");
                await deleteBuyerFB(sn);
                state.buyers = state.buyers.filter(x => x.shortName !== sn);
                saveBuyers(); populateSelects(); remapAll(); renderLibrary();
                showToast("Deleted", "Buyer key removed.", "success");
            } catch (err) { showToast("Error", "Could not delete from DB.", "error"); }
        }
    }));
}

// ══════════════════════════════════════════════════════════════════════════
// 7. EXCEL PARSERS
// ══════════════════════════════════════════════════════════════════════════
function processBookingExcel(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: "array" });
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
            if (rows.length < 2) throw new Error("Empty sheet");

            const head = rows[0].map(h => h.toString().toLowerCase());
            let cNo = head.findIndex(h => h.includes("booking")), cBy = head.findIndex(h => h.includes("buyer") || h.includes("code"));
            if (cNo === -1) cNo = 0; if (cBy === -1) cBy = 1;

            let arr = [];
            for (let i = 1; i < rows.length; i++) {
                if (rows[i].length === 0 || rows[i].every(x => x === "")) continue;
                const no = (rows[i][cNo] || "").toString().trim();
                const sn = (rows[i][cBy] || "").toString().trim().toUpperCase();
                if (!no) continue;
                const m = matchBuyer(sn);
                arr.push({ id: generateId(), bookingNo: no, shortName: sn, fullName: m.fullName, status: m.status });
            }
            if (arr.length === 0) throw new Error("No data found");
            state.bookings = arr;
            saveBookings(); updateMetrics(); toggleWipeBtn(); renderBookings();
            showToast("Imported", `Loaded ${arr.length} rows.`, "success");
        } catch (err) { showToast("Error", err.message, "error"); }
    };
    reader.readAsArrayBuffer(file);
}

function processBuyerExcel(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: "array" });
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
            if (rows.length < 2) throw new Error("Empty sheet");

            const head = rows[0].map(h => h.toString().toLowerCase());
            let cShort = head.findIndex(h => h.includes("short") || h.includes("code"));
            let cFull = head.findIndex(h => h.includes("full") || (h.includes("name") && !h.includes("short")));
            if (cShort === -1) cShort = 0;
            if (cFull === -1) cFull = 1;

            let count = 0;
            for (let i = 1; i < rows.length; i++) {
                if (rows[i].length === 0 || rows[i].every(x => x === "")) continue;
                const sn = (rows[i][cShort] || "").toString().trim().toUpperCase();
                const fn = (rows[i][cFull] || "").toString().trim();
                if (!sn || !fn) continue;
                await addBuyerFB(sn, fn);
                count++;
            }
            if (count === 0) throw new Error("No valid buyer rows found");
            await fetchBuyersFromFirebase();
            populateSelects(); remapAll(); renderLibrary();
            showToast("Imported", `Loaded ${count} buyers.`, "success");
        } catch (err) { showToast("Error", err.message, "error"); }
    };
    reader.readAsArrayBuffer(file);
}

// ══════════════════════════════════════════════════════════════════════════
// 7b. EXCEL EXPORT & TEMPLATES
// ══════════════════════════════════════════════════════════════════════════
function downloadBookingTemplate() {
    const wsData = [
        ["Booking No", "Buyer Code"],
        ["BK-0001", "HM"],
        ["BK-0002", "ZR"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 20 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "booking_template.xlsx");
    showToast("Downloaded", "Booking template saved.", "success");
}

function downloadBuyerTemplate() {
    const wsData = [
        ["Short Name", "Full Name"],
        ["HM", "H&M"],
        ["ZR", "Zara"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 15 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "buyer_template.xlsx");
    showToast("Downloaded", "Buyer template saved.", "success");
}

function exportBookingExcel() {
    if (state.bookings.length === 0) { showToast("Nothing to Export", "No bookings available.", "warning"); return; }
    const wsData = [["S/N", "Booking No", "Code", "Buyer Name", "Status"]];
    state.bookings.forEach((b, i) => {
        wsData.push([i + 1, b.bookingNo, b.shortName, b.fullName || "", b.status]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 6 }, { wch: 20 }, { wch: 10 }, { wch: 25 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `bookings_export_${stamp}.xlsx`);
    showToast("Exported", `Exported ${state.bookings.length} rows.`, "success");
}

function copyTableToClipboard() {
    if (state.bookings.length === 0) { showToast("Nothing to Copy", "No bookings available.", "warning"); return; }
    const rows = [["S/N", "Booking No", "Code", "Buyer Name", "Status"]];
    state.bookings.forEach((b, i) => rows.push([i + 1, b.bookingNo, b.shortName, b.fullName || "", b.status]));
    const text = rows.map(r => r.join("\t")).join("\n");
    navigator.clipboard.writeText(text)
        .then(() => showToast("Copied", "Table copied to clipboard.", "success"))
        .catch(() => showToast("Error", "Could not copy to clipboard.", "error"));
}

// ══════════════════════════════════════════════════════════════════════════
// 8. EVENT LISTENERS
// ══════════════════════════════════════════════════════════════════════════
function setupListeners() {
    // ── Theme Toggle ──────────────────────────────────────────────────────
    const savedTheme = localStorage.getItem('bh_theme') || 'light';
    if (savedTheme === 'dark') applyTheme('dark');

    document.getElementById("theme-toggle-btn").addEventListener("click", () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        applyTheme(isDark ? 'light' : 'dark');
    });

    function applyTheme(theme) {
        const sun  = document.getElementById("theme-icon-sun");
        const moon = document.getElementById("theme-icon-moon");
        const lbl  = document.getElementById("theme-label");
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            sun.style.display  = 'none';
            moon.style.display = '';
            lbl.textContent    = 'Light';
        } else {
            document.documentElement.removeAttribute('data-theme');
            sun.style.display  = '';
            moon.style.display = 'none';
            lbl.textContent    = 'Dark';
        }
        localStorage.setItem('bh_theme', theme);
    }
    // Custom Confirm
    document.getElementById("confirm-btn-proceed").onclick = () => closeConfirm(true);
    document.getElementById("confirm-btn-cancel").onclick = () => closeConfirm(false);

    // Sidebar navigation
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
            btn.classList.add("active");
            const target = btn.getAttribute("data-tab");
            document.querySelectorAll(".tab-content").forEach(x => x.classList.remove("active"));
            document.getElementById(target).classList.add("active");
            
            const title = document.getElementById("page-title-text");
            const sub = document.getElementById("page-subtitle-text");
            if (target === "dashboard-section") {
                title.textContent = "Dashboard"; sub.textContent = "Process and auto-map your booking spreadsheets.";
                renderBookings();
            } else {
                title.textContent = "Buyer Library"; sub.textContent = "Manage cloud mapped database synced with Firebase.";
                renderLibrary();
            }
        };
    });

    // Modal forms and close triggers
    document.querySelectorAll("[data-close]").forEach(el => el.onclick = () => {
        document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));
    });

    // Booking Filters
    document.getElementById("booking-search-input").oninput = e => { state.filters.search = e.target.value; state.pagination.currentPage = 1; renderBookings(); };
    document.getElementById("buyer-filter-select").onchange = e => { state.filters.buyer = e.target.value; state.pagination.currentPage = 1; renderBookings(); };
    document.getElementById("status-filter-select").onchange = e => { state.filters.status = e.target.value; state.pagination.currentPage = 1; renderBookings(); };

    // Library Filter
    document.getElementById("library-search-input").oninput = e => { state.filters.librarySearch = e.target.value; renderLibrary(); };

    // Sorting
    document.querySelectorAll("th.sortable").forEach(th => {
        th.onclick = () => {
            const col = th.getAttribute("data-sort");
            if (state.sorting.column === col) state.sorting.direction = state.sorting.direction === "asc" ? "desc" : "asc";
            else { state.sorting.column = col; state.sorting.direction = "asc"; }
            renderBookings();
        };
    });

    // Drag Drop
    const dz = document.getElementById("drop-zone");
    const fi = document.getElementById("excel-file-input");
    dz.onclick = () => fi.click();
    fi.onchange = e => { processBookingExcel(e.target.files[0]); fi.value = ""; };
    ["dragover","dragenter"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("dragover"); }));
    ["dragleave","drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("dragover"); }));
    dz.addEventListener("drop", e => processBookingExcel(e.dataTransfer.files[0]));

    // Excel Template / Export / Copy
    document.getElementById("btn-download-template").onclick = () => downloadBookingTemplate();
    document.getElementById("btn-export-excel").onclick = () => exportBookingExcel();
    document.getElementById("btn-copy-table").onclick = () => copyTableToClipboard();

    // Buyer Excel Template / Upload
    document.getElementById("btn-download-buyer-template").onclick = () => downloadBuyerTemplate();
    const buyerFi = document.getElementById("buyer-excel-file-input");
    document.getElementById("btn-upload-buyer-excel").onclick = () => buyerFi.click();
    buyerFi.onchange = e => { processBuyerExcel(e.target.files[0]); buyerFi.value = ""; };


    // Wipe DB
    document.getElementById("btn-clear-bookings").onclick = async () => {
        if (await showCustomConfirm("Clear Session?", "Delete all bookings?", "danger")) {
            state.bookings = []; saveBookings(); updateMetrics(); toggleWipeBtn(); renderBookings();
        }
    };

    // Load Samples
    document.getElementById("btn-load-sample-bookings").onclick = () => {
        state.bookings = [
            { id: generateId(), bookingNo: "BK-PLAY-01", shortName: "HM", fullName: "H&M", status: "mapped" },
            { id: generateId(), bookingNo: "BK-PLAY-02", shortName: "ZZ", fullName: "", status: "unmapped" }
        ];
        remapAll(); toggleWipeBtn();
    };

    // Booking Add/Edit Form
    document.getElementById("btn-add-booking").onclick = () => openBookingModal("add");
    document.getElementById("booking-form").onsubmit = e => {
        e.preventDefault();
        const id = document.getElementById("booking-form-id").value;
        const no = document.getElementById("booking-form-no").value.trim();
        let sn = document.getElementById("booking-form-short-name").value.trim().toUpperCase();
        const sel = document.getElementById("booking-form-buyer-select").value;
        if (sel) sn = sel;
        
        const m = matchBuyer(sn);
        if (id) state.bookings = state.bookings.map(x => x.id === id ? { ...x, bookingNo: no, shortName: sn, fullName: m.fullName, status: m.status } : x);
        else state.bookings.push({ id: generateId(), bookingNo: no, shortName: sn, fullName: m.fullName, status: m.status });
        
        saveBookings(); updateMetrics(); renderBookings(); toggleWipeBtn();
        document.getElementById("booking-modal").classList.remove("active");
        showToast("Success", "Booking saved.", "success");
    };

    document.getElementById("booking-form-buyer-select").onchange = e => {
        if(e.target.value) document.getElementById("booking-form-short-name").value = e.target.value;
    };

    // // Reset Library
    // document.getElementById("btn-reset-library").onclick = async () => {
    //     if (await showCustomConfirm("Reset Firebase Library?", "Restore default buyers?", "danger")) {
    //         showToast("Syncing", "Resetting...", "info");
    //         await resetLibraryFB(); await fetchBuyersFromFirebase();
    //         populateSelects(); remapAll(); renderLibrary();
    //         showToast("Success", "Library reset.", "success");
    //     }
    // };

    // Buyer Add/Edit Form
    document.getElementById("btn-add-buyer").onclick = () => openBuyerModal("add");
    document.getElementById("buyer-form").onsubmit = async (e) => {
        e.preventDefault();
        const mode = document.getElementById("buyer-form-mode").value;
        const sn = document.getElementById("buyer-form-short").value.trim().toUpperCase();
        const fn = document.getElementById("buyer-form-full").value.trim();
        
        try {
            if (mode === "add") {
                if (state.buyers.some(x => x.shortName === sn)) { showToast("Error", "Key exists.", "error"); return; }
                await addBuyerFB(sn, fn);
                state.buyers.push({ shortName: sn, fullName: fn });
            } else {
                await updateBuyerFB(sn, fn);
                state.buyers = state.buyers.map(x => x.shortName === sn ? { ...x, fullName: fn } : x);
            }
            saveBuyers(); populateSelects(); remapAll(); renderLibrary();
            document.getElementById("buyer-modal").classList.remove("active");
            showToast("Success", "Buyer saved.", "success");
        } catch (err) { showToast("Error", "Failed to save to cloud.", "error"); }
    };
}

function openBookingModal(mode, id = null) {
    document.getElementById("booking-form").reset();
    populateSelects();
    if (mode === "add") {
        document.getElementById("booking-modal-title").textContent = "Add Booking";
        document.getElementById("booking-form-id").value = "";
    } else {
        document.getElementById("booking-modal-title").textContent = "Edit Booking";
        const b = state.bookings.find(x => x.id === id);
        document.getElementById("booking-form-id").value = b.id;
        document.getElementById("booking-form-no").value = b.bookingNo;
        document.getElementById("booking-form-short-name").value = b.shortName;
    }
    document.getElementById("booking-modal").classList.add("active");
}

function openBuyerModal(mode, obj = null) {
    document.getElementById("buyer-form").reset();
    document.getElementById("buyer-form-mode").value = mode;
    const sInput = document.getElementById("buyer-form-short");
    if (mode === "add") {
        document.getElementById("buyer-modal-title").textContent = "Add Buyer";
        sInput.disabled = false;
    } else {
        document.getElementById("buyer-modal-title").textContent = "Edit Buyer";
        sInput.value = obj.shortName;
        sInput.disabled = true;
        document.getElementById("buyer-form-full").value = obj.fullName;
    }
    document.getElementById("buyer-modal").classList.add("active");
}