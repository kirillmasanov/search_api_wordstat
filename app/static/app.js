// Helpers
function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function showLoading() { show($("#loading")); hide($("#error")); }
function hideLoading() { hide($("#loading")); }
function showError(msg) { const el = $("#error"); el.textContent = msg; show(el); }

// ===== CUSTOM SELECT =====
document.addEventListener("click", (e) => {
    // Close all dropdowns if clicked outside
    $$(".custom-select.open").forEach(s => {
        if (!s.contains(e.target)) s.classList.remove("open");
    });
});

$$(".custom-select").forEach(select => {
    const trigger = select.querySelector(".custom-select__trigger");
    const hidden = select.querySelector("input[type=hidden]");

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        // Close others
        $$(".custom-select.open").forEach(s => { if (s !== select) s.classList.remove("open"); });
        select.classList.toggle("open");
    });

    select.querySelectorAll(".custom-select__option").forEach(opt => {
        opt.addEventListener("click", () => {
            select.querySelectorAll(".custom-select__option").forEach(o => o.classList.remove("selected"));
            opt.classList.add("selected");
            trigger.querySelector("span").textContent = opt.textContent;
            hidden.value = opt.dataset.value;
            select.classList.remove("open");
            // Dispatch change event so listeners (e.g. period change) work
            hidden.dispatchEvent(new Event("change", { bubbles: true }));
        });
    });
});

function formatNumber(n) {
    return Number(n).toLocaleString("ru-RU");
}

function fillTable(tableId, rows) {
    const tbody = $(`${tableId} tbody`);
    tbody.innerHTML = "";
    rows.forEach(r => {
        const tr = document.createElement("tr");
        r.forEach(cell => {
            const td = document.createElement("td");
            td.textContent = cell;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

async function apiPost(url, body) {
    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        let detail;
        try { detail = (await resp.json()).detail; } catch { detail = await resp.text(); }
        throw new Error(detail || `Ошибка ${resp.status}`);
    }
    return resp.json();
}

// ===== TOP =====
const topForm = $("#top-form");
if (topForm) {
    topForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(topForm);
        const body = {
            phrase: fd.get("phrase"),
            num_phrases: parseInt(fd.get("num_phrases")) || 50,
        };
        const dev = fd.get("devices");
        if (dev) body.devices = [dev];

        hideLoading();
        hide($("#top-results"));
        hide($("#error"));
        showLoading();
        topForm.querySelector("button").disabled = true;

        try {
            const data = await apiPost("/api/top", body);
            $("#total-count-value").textContent = formatNumber(data.totalCount || 0);

            fillTable("#results-table",
                (data.results || []).map(r => [r.phrase, formatNumber(r.count)]));
            fillTable("#associations-table",
                (data.associations || []).map(r => [r.phrase, formatNumber(r.count)]));

            show($("#top-results"));
        } catch (err) {
            showError(err.message);
        } finally {
            hideLoading();
            topForm.querySelector("button").disabled = false;
        }
    });
}

// ===== DYNAMICS =====
let dynamicsChart = null;

const dynForm = $("#dynamics-form");
if (dynForm) {
    function setDefaultDates() {
        const today = new Date();
        const period = dynForm.querySelector("[name=period]").value;
        const from = new Date(today);

        if (period === "PERIOD_DAILY") {
            from.setDate(from.getDate() - 59);
        } else {
            from.setMonth(from.getMonth() - 6);
            if (period === "PERIOD_WEEKLY") {
                const dow = from.getDay();
                from.setDate(from.getDate() + (dow === 0 ? -6 : 1 - dow));
            } else if (period === "PERIOD_MONTHLY") {
                from.setDate(1);
            }
        }

        dynForm.querySelector("[name=from_date]").value = from.toISOString().slice(0, 10);
        dynForm.querySelector("[name=to_date]").value = today.toISOString().slice(0, 10);
    }

    setDefaultDates();
    dynForm.querySelector("[name=period]").addEventListener("change", setDefaultDates);

    dynForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(dynForm);
        const period = fd.get("period");
        let fromDate = new Date(fd.get("from_date"));
        let toDate = fd.get("to_date") ? new Date(fd.get("to_date")) : null;

        // Weekly: align fromDate to Monday, toDate to Monday
        if (period === "PERIOD_WEEKLY") {
            const dayOfWeek = fromDate.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            fromDate.setDate(fromDate.getDate() + diff);
            if (toDate) {
                const td = toDate.getDay();
                if (td !== 0) toDate.setDate(toDate.getDate() + (7 - td));
            }
        }
        // Monthly: fromDate to 1st, toDate to last day of month
        if (period === "PERIOD_MONTHLY") {
            fromDate.setDate(1);
            if (toDate) {
                toDate.setMonth(toDate.getMonth() + 1);
                toDate.setDate(0); // last day of previous month
            }
        }

        const fmt = d => d.toISOString().slice(0, 10);
        const body = {
            phrase: fd.get("phrase"),
            period: period,
            from_date: fmt(fromDate) + "T00:00:00Z",
        };
        if (toDate) body.to_date = fmt(toDate) + "T23:59:59Z";
        const dev = fd.get("devices");
        if (dev) body.devices = [dev];

        hideLoading();
        hide($("#dynamics-results"));
        hide($("#error"));
        showLoading();
        dynForm.querySelector("button").disabled = true;

        try {
            const data = await apiPost("/api/dynamics", body);
            const results = data.results || [];

            const labels = results.map(r => {
                const d = new Date(r.date);
                return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
            });
            const counts = results.map(r => Number(r.count));

            if (dynamicsChart) dynamicsChart.destroy();
            dynamicsChart = new Chart($("#dynamics-chart"), {
                type: "line",
                data: {
                    labels,
                    datasets: [{
                        label: "Показов",
                        data: counts,
                        borderColor: "#597BFF",
                        backgroundColor: "rgba(89,123,255,0.08)",
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                        pointBackgroundColor: "#597BFF",
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { callback: v => formatNumber(v) } },
                    },
                },
            });

            fillTable("#dynamics-table", results.map(r => {
                const d = new Date(r.date);
                return [
                    d.toLocaleDateString("ru-RU"),
                    formatNumber(r.count),
                    r.share != null ? (r.share * 100).toFixed(6) + "%" : "—",
                ];
            }));

            show($("#dynamics-results"));
        } catch (err) {
            showError(err.message);
        } finally {
            hideLoading();
            dynForm.querySelector("button").disabled = false;
        }
    });
}

// ===== REGIONS =====
let regionsData = [];
let regionNames = {};

const regForm = $("#regions-form");
if (regForm) {
    // Load region names
    fetch("/api/regions-tree")
        .then(r => r.json())
        .then(data => {
            function walk(nodes) {
                (nodes || []).forEach(n => {
                    regionNames[n.id] = n.label;
                    walk(n.children);
                });
            }
            walk(data.regions);
        })
        .catch(() => {});

    regForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(regForm);
        const body = { phrase: fd.get("phrase") };
        const rt = fd.get("region_type");
        if (rt) body.region_type = rt;
        const dev = fd.get("devices");
        if (dev) body.devices = [dev];

        hideLoading();
        hide($("#regions-results"));
        hide($("#error"));
        showLoading();
        regForm.querySelector("button").disabled = true;

        try {
            const data = await apiPost("/api/regions", body);
            regionsData = (data.results || []).map(r => ({
                region: regionNames[r.region] || r.region,
                count: Number(r.count),
                share: r.share,
                affinity: r.affinityIndex,
            }));

            renderRegionsTable();
            show($("#regions-results"));
        } catch (err) {
            showError(err.message);
        } finally {
            hideLoading();
            regForm.querySelector("button").disabled = false;
        }
    });

    // Sorting
    $$("#regions-table thead th").forEach(th => {
        th.addEventListener("click", () => {
            const key = th.dataset.sort;
            const current = th.classList.contains("sorted-asc") ? "asc" : th.classList.contains("sorted-desc") ? "desc" : null;
            $$("#regions-table thead th").forEach(t => { t.classList.remove("sorted-asc", "sorted-desc"); });

            const dir = current === "asc" ? "desc" : "asc";
            th.classList.add(`sorted-${dir}`);

            regionsData.sort((a, b) => {
                let va = a[key], vb = b[key];
                if (typeof va === "string") return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
                return dir === "asc" ? va - vb : vb - va;
            });
            renderRegionsTable();
        });
    });
}

function renderRegionsTable() {
    fillTable("#regions-table", regionsData.map(r => [
        r.region,
        formatNumber(r.count),
        r.share != null ? (r.share * 100).toFixed(4) + "%" : "—",
        r.affinity != null ? r.affinity.toFixed(2) : "—",
    ]));
}
