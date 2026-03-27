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

// ===== SEARCH BOX: BUTTON STATE + CLEAR + SHARED PHRASE =====
$$(".search-box").forEach(box => {
    const input = box.querySelector("input[type=text]");
    const btn = box.querySelector("button");
    const clear = box.querySelector(".search-clear");

    // Restore phrase from localStorage
    const saved = localStorage.getItem("wordstat_phrase");
    if (saved && !input.value) input.value = saved;

    function update() {
        const hasValue = !!input.value.trim();
        btn.disabled = !hasValue;
        if (clear) { hasValue ? show(clear) : hide(clear); }
    }

    update();
    input.addEventListener("input", update);

    // Save phrase on form submit
    box.closest("form").addEventListener("submit", () => {
        localStorage.setItem("wordstat_phrase", input.value.trim());
    });

    if (clear) {
        clear.addEventListener("click", () => {
            input.value = "";
            localStorage.removeItem("wordstat_phrase");
            update();
            input.focus();
        });
    }
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
        try {
            const err = await resp.json();
            detail = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail || err);
        } catch { detail = await resp.text(); }
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
            const data = await apiPost("api/top", body);
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

    // Auto-submit on filter change
    topForm.querySelectorAll(".custom-select input[type=hidden], input[name=num_phrases]").forEach(el => {
        el.addEventListener("change", () => {
            if (topForm.querySelector("[name=phrase]").value.trim()) topForm.requestSubmit();
        });
    });

    // Auto-submit if phrase saved
    if (topForm.querySelector("[name=phrase]").value.trim()) {
        topForm.requestSubmit();
    }
}

// ===== DATE RANGE PICKER =====
function initDateRangePicker(container, getPeriod, onChange) {
    const trigger = container.querySelector(".date-range-trigger");
    const triggerText = container.querySelector(".date-range-text");
    const dropdown = container.querySelector(".date-range-dropdown");
    const calDays = container.querySelector(".cal-days");
    const calTitle = container.querySelector(".cal-title");
    const calPrev = container.querySelector(".cal-prev");
    const calNext = container.querySelector(".cal-next");
    const fromInput = container.querySelector("[name=from_date]");
    const toInput = container.querySelector("[name=to_date]");

    const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь",
                    "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

    let viewYear, viewMonth;
    let fromDate = null, toDate = null;
    let selecting = "from"; // "from" or "to"
    let hoverDate = null;

    function fmtDisplay(d) {
        return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    function fmtISO(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return y + "-" + m + "-" + dd;
    }
    function sameDay(a, b) { return a && b && fmtISO(a) === fmtISO(b); }

    function getMonday(d) {
        const r = new Date(d);
        const dow = r.getDay();
        r.setDate(r.getDate() + (dow === 0 ? -6 : 1 - dow));
        return r;
    }
    function getSunday(d) {
        const r = new Date(d);
        const dow = r.getDay();
        if (dow !== 0) r.setDate(r.getDate() + (7 - dow));
        return r;
    }

    function updateDisplay() {
        if (fromDate && toDate) {
            triggerText.textContent = fmtDisplay(fromDate) + " — " + fmtDisplay(toDate);
        } else if (fromDate) {
            triggerText.textContent = fmtDisplay(fromDate) + " — ...";
        } else {
            triggerText.textContent = "Выберите даты";
        }
        fromInput.value = fromDate ? fmtISO(fromDate) : "";
        toInput.value = toDate ? fmtISO(toDate) : "";
    }

    function render() {
        const period = getPeriod();
        calTitle.textContent = MONTHS[viewMonth] + " " + viewYear;
        calDays.innerHTML = "";

        const firstDay = new Date(viewYear, viewMonth, 1);
        let startOffset = firstDay.getDay() - 1;
        if (startOffset < 0) startOffset = 6;
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startOffset);

        const today = new Date();
        today.setHours(0,0,0,0);

        for (let i = 0; i < 42; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const day = document.createElement("div");
            day.classList.add("cal-day");
            day.textContent = d.getDate();
            day.dataset.date = fmtISO(d);

            if (d.getMonth() !== viewMonth) day.classList.add("other-month");
            if (sameDay(d, today)) day.classList.add("today");

            // Disable future dates
            if (d.getTime() > today.getTime()) day.classList.add("disabled");
            if (period === "PERIOD_DAILY") {
                // Can't select start older than 60 days ago
                const minDaily = new Date(today);
                minDaily.setDate(minDaily.getDate() - 59);
                if (d.getTime() < minDaily.getTime()) day.classList.add("disabled");
                // When selecting end: limit to 59 days from start
                if (selecting === "to" && fromDate) {
                    const maxDate = new Date(fromDate);
                    maxDate.setDate(maxDate.getDate() + 59);
                    if (d.getTime() > maxDate.getTime()) day.classList.add("disabled");
                    if (d.getTime() < fromDate.getTime()) day.classList.add("disabled");
                }
            }

            // Highlight selected range
            if (fromDate && toDate) {
                const t = d.getTime();
                const ft = fromDate.getTime();
                const tt = toDate.getTime();
                if (period === "PERIOD_WEEKLY") {
                    // Highlight full weeks within range
                    const dMon = getMonday(d);
                    const dSun = getSunday(d);
                    if (dMon.getTime() >= ft && dSun.getTime() <= tt) {
                        day.classList.add("in-range");
                        if (d.getDay() === 1) day.classList.add("week-start");
                        if (d.getDay() === 0) day.classList.add("week-end");
                    }
                } else {
                    if (sameDay(d, fromDate)) day.classList.add("range-start");
                    else if (sameDay(d, toDate)) day.classList.add("range-end");
                    else if (t > ft && t < tt) day.classList.add("in-range");
                }
            } else if (fromDate && sameDay(d, fromDate)) {
                day.classList.add("selected");
            }

            calDays.appendChild(day);

            // Stop if we've filled enough rows and passed the month
            if (i >= 35 && d.getMonth() !== viewMonth) break;
        }
    }

    // Update week hover highlight without rebuilding DOM
    function updateHover() {
        const period = getPeriod();
        calDays.querySelectorAll(".cal-day").forEach(el => {
            el.classList.remove("week-hover");
            if (period === "PERIOD_WEEKLY" && hoverDate && el.dataset.date) {
                const d = new Date(el.dataset.date + "T00:00:00");
                const hMon = getMonday(hoverDate);
                const hSun = getSunday(hoverDate);
                if (d.getTime() >= hMon.getTime() && d.getTime() <= hSun.getTime()) {
                    el.classList.add("week-hover");
                    if (sameDay(d, hMon)) el.classList.add("week-start");
                    if (sameDay(d, hSun)) el.classList.add("week-end");
                }
            }
        });
    }

    // Event delegation
    calDays.addEventListener("click", (e) => {
        e.stopPropagation();
        const day = e.target.closest(".cal-day");
        if (!day || !day.dataset.date || day.classList.contains("disabled")) return;
        onDayClick(new Date(day.dataset.date + "T00:00:00"));
    });

    calDays.addEventListener("mouseover", (e) => {
        const day = e.target.closest(".cal-day");
        if (!day || !day.dataset.date || day.classList.contains("disabled")) return;
        hoverDate = new Date(day.dataset.date + "T00:00:00");
        updateHover();
    });

    function onDayClick(d) {
        const period = getPeriod();

        if (period === "PERIOD_WEEKLY") {
            // Select whole week
            if (selecting === "from") {
                fromDate = getMonday(d);
                toDate = null;
                selecting = "to";
            } else {
                const clickSun = getSunday(d);
                if (clickSun.getTime() < fromDate.getTime()) {
                    fromDate = getMonday(d);
                    toDate = null;
                } else {
                    toDate = clickSun;
                    selecting = "from";
                    setTimeout(() => container.classList.remove("open"), 200);
                }
            }
        } else if (period === "PERIOD_MONTHLY") {
            if (selecting === "from") {
                fromDate = new Date(d.getFullYear(), d.getMonth(), 1);
                toDate = null;
                selecting = "to";
            } else {
                const endMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                if (endMonth.getTime() < fromDate.getTime()) {
                    fromDate = new Date(d.getFullYear(), d.getMonth(), 1);
                    toDate = null;
                } else {
                    toDate = endMonth;
                    selecting = "from";
                    setTimeout(() => container.classList.remove("open"), 200);
                }
            }
        } else {
            // Daily
            if (selecting === "from") {
                fromDate = new Date(d);
                toDate = null;
                selecting = "to";
                render(); // re-render to show disabled dates
            } else {
                if (d.getTime() < fromDate.getTime()) {
                    fromDate = new Date(d);
                    toDate = null;
                    selecting = "to";
                    render();
                } else {
                    toDate = new Date(d);
                    selecting = "from";
                    setTimeout(() => container.classList.remove("open"), 200);
                }
            }
        }

        updateDisplay();
        render();
        if (fromDate && toDate && onChange) onChange();
    }

    function setDates(from, to, silent) {
        fromDate = from;
        toDate = to;
        viewYear = from.getFullYear();
        viewMonth = from.getMonth();
        selecting = "from";
        updateDisplay();
        render();
        if (!silent && fromDate && toDate && onChange) onChange();
    }

    // Navigation
    calPrev.addEventListener("click", (e) => { e.stopPropagation(); viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render(); });
    calNext.addEventListener("click", (e) => { e.stopPropagation(); viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render(); });

    // Open/close
    trigger.addEventListener("click", (e) => { e.stopPropagation(); container.classList.toggle("open"); });
    document.addEventListener("click", (e) => { if (!container.contains(e.target)) container.classList.remove("open"); });
    calDays.addEventListener("mouseleave", () => { hoverDate = null; updateHover(); });

    // Init with current month
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    render();

    return { setDates, getPeriod };
}

// ===== DYNAMICS =====
let dynamicsChart = null;
let lastDynamicsBody = null;

const dynForm = $("#dynamics-form");
if (dynForm) {
    const picker = initDateRangePicker(
        $("#date-range-picker"),
        () => dynForm.querySelector("[name=period]").value,
        () => { if (dynForm.querySelector("[name=phrase]").value.trim()) submitDynamics(); }
    );

    function setDefaultDates(silent) {
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

        picker.setDates(from, today, silent);
    }

    setDefaultDates(true);
    dynForm.querySelector("[name=period]").addEventListener("change", () => setDefaultDates());
    dynForm.querySelector("[name=devices]").addEventListener("change", () => {
        if (dynForm.querySelector("[name=phrase]").value.trim()) submitDynamics();
    });

    async function submitDynamics() {
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
        lastDynamicsBody = body;

        hideLoading();
        hide($("#dynamics-results"));
        hide($("#error"));
        showLoading();
        dynForm.querySelector("button").disabled = true;

        try {
            const data = await apiPost("api/dynamics", body);
            const results = data.results || [];

            const labels = results.map(r => {
                const d = new Date(r.date);
                return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
            });
            const counts = results.map(r => Number(r.count));
            const shares = results.map(r => r.share != null ? r.share * 100 : null);

            if (dynamicsChart) dynamicsChart.destroy();
            dynamicsChart = new Chart($("#dynamics-chart"), {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "Число запросов",
                            data: counts,
                            borderColor: "#597BFF",
                            backgroundColor: "rgba(89,123,255,0.08)",
                            fill: false,
                            tension: 0.3,
                            pointRadius: 3,
                            pointBackgroundColor: "#597BFF",
                            yAxisID: "y",
                        },
                        {
                            label: "Доля от всех запросов",
                            data: shares,
                            borderColor: "#E45050",
                            backgroundColor: "rgba(228,80,80,0.08)",
                            fill: false,
                            tension: 0.3,
                            pointRadius: 3,
                            pointBackgroundColor: "#E45050",
                            yAxisID: "y1",
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => {
                                    if (ctx.datasetIndex === 0) return "Запросов: " + formatNumber(ctx.raw);
                                    return "Доля: " + (ctx.raw != null ? ctx.raw.toFixed(4) + "%" : "—");
                                },
                            },
                        },
                    },
                    scales: {
                        y: {
                            type: "linear",
                            position: "left",
                            beginAtZero: true,
                            ticks: { callback: v => formatNumber(v), color: "#597BFF" },
                            grid: { drawOnChartArea: true },
                        },
                        y1: {
                            type: "linear",
                            position: "right",
                            beginAtZero: true,
                            ticks: { callback: v => v.toFixed(4) + "%", color: "#E45050" },
                            grid: { drawOnChartArea: false },
                        },
                    },
                },
                plugins: [{
                    id: "verticalLine",
                    afterDraw(chart) {
                        const active = chart.tooltip?.getActiveElements();
                        if (active && active.length) {
                            const x = active[0].element.x;
                            const { top, bottom } = chart.chartArea;
                            const ctx = chart.ctx;
                            ctx.save();
                            ctx.beginPath();
                            ctx.moveTo(x, top);
                            ctx.lineTo(x, bottom);
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = "rgba(0,0,0,0.15)";
                            ctx.stroke();
                            ctx.restore();
                        }
                    },
                }],
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
    }

    $$(".chart-toggle").forEach(toggle => {
        toggle.addEventListener("click", () => {
            if (!dynamicsChart) return;
            toggle.classList.toggle("active");
            const idx = toggle.dataset.dataset === "count" ? 0 : 1;
            const visible = toggle.classList.contains("active");
            dynamicsChart.setDatasetVisibility(idx, visible);
            const axisId = idx === 0 ? "y" : "y1";
            dynamicsChart.options.scales[axisId].display = visible;
            const yVis = dynamicsChart.options.scales.y.display !== false;
            const y1Vis = dynamicsChart.options.scales.y1.display !== false;
            dynamicsChart.options.scales.y.grid.drawOnChartArea = yVis;
            dynamicsChart.options.scales.y1.grid.drawOnChartArea = y1Vis && !yVis;
            dynamicsChart.update();
        });
    });

    dynForm.addEventListener("submit", (e) => {
        e.preventDefault();
        submitDynamics();
    });

    if (dynForm.querySelector("[name=phrase]").value.trim()) {
        submitDynamics();
    }
}

// ===== REGIONS =====
let regionsData = [];
let regionNames = {};

const regForm = $("#regions-form");
if (regForm) {
    // Load region names
    fetch("api/regions-tree")
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
            const data = await apiPost("api/regions", body);
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

    // Auto-submit on filter change
    regForm.querySelectorAll(".custom-select input[type=hidden]").forEach(el => {
        el.addEventListener("change", () => {
            if (regForm.querySelector("[name=phrase]").value.trim()) regForm.requestSubmit();
        });
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

    if (regForm.querySelector("[name=phrase]").value.trim()) {
        regForm.requestSubmit();
    }
}

function renderRegionsTable() {
    fillTable("#regions-table", regionsData.map(r => [
        r.region,
        formatNumber(r.count),
        r.share != null ? (r.share * 100).toFixed(4) + "%" : "—",
        r.affinity != null ? r.affinity.toFixed(2) : "—",
    ]));
}

// ===== RAW JSON =====
const rawForm = $("#raw-form");
if (rawForm) {
    async function submitRaw() {
        const fd = new FormData(rawForm);
        const phrase = fd.get("phrase");
        const method = fd.get("api_method");

        let url, body;
        if (method === "regions-tree") {
            url = "api/regions-tree";
            body = null;
        } else if (method === "dynamics") {
            url = "api/dynamics";
            if (lastDynamicsBody) {
                body = { ...lastDynamicsBody, phrase };
            } else {
                const today = new Date();
                const toSun = new Date(today);
                const td = toSun.getDay();
                if (td !== 0) toSun.setDate(toSun.getDate() - td);
                const from = new Date(toSun);
                from.setMonth(from.getMonth() - 6);
                const dow = from.getDay();
                from.setDate(from.getDate() + (dow === 0 ? -6 : 1 - dow));
                const fmt = d => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
                body = { phrase, period: "PERIOD_WEEKLY", from_date: fmt(from) + "T00:00:00Z", to_date: fmt(toSun) + "T23:59:59Z" };
            }
        } else {
            url = "api/" + method;
            body = { phrase };
        }

        hideLoading();
        hide($("#raw-results"));
        hide($("#error"));
        showLoading();

        try {
            let data;
            if (body) {
                data = await apiPost(url, body);
            } else {
                const resp = await fetch(url);
                data = await resp.json();
            }
            $("#raw-json").textContent = JSON.stringify(data, null, 2);
            show($("#raw-results"));
        } catch (err) {
            showError(err.message);
        } finally {
            hideLoading();
        }
    }

    rawForm.addEventListener("submit", (e) => {
        e.preventDefault();
        submitRaw();
    });

    rawForm.querySelector("[name=api_method]").addEventListener("change", () => {
        const method = rawForm.querySelector("[name=api_method]").value;
        const input = rawForm.querySelector("[name=phrase]");
        const btn = rawForm.querySelector("button");
        if (method === "regions-tree") {
            input.removeAttribute("required");
            btn.disabled = false;
            submitRaw();
        } else {
            input.setAttribute("required", "");
            btn.disabled = !input.value.trim();
            if (input.value.trim()) submitRaw();
        }
    });

    $("#raw-copy").addEventListener("click", () => {
        navigator.clipboard.writeText($("#raw-json").textContent);
    });

    if (rawForm.querySelector("[name=phrase]").value.trim()) {
        submitRaw();
    }
}
