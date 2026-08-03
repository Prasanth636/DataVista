const fileInput = document.getElementById("csvFile");
const preview = document.getElementById("preview");
const chartTypeSelect = document.getElementById("chartType");
const chartColumnSelect = document.getElementById("chartColumn");

let chart = null;
let currentData = [];
let currentHeaders = [];
let numericHeaders = [];
let labels = [];
let values = [];
let chartColumn = "";

fileInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      currentData = results.data;
      currentHeaders = results.meta.fields || [];

      renderStats();
      renderPreview(file.name);
      renderNumericColumns();
      populateChartColumnSelect();

      if (numericHeaders.length > 0) {
        chartColumn = numericHeaders[0];
        chartColumnSelect.value = chartColumn;
        updateChartData();
        createChart();
        computeAnalytics();
      } else {
        if (chart) {
          chart.destroy();
          chart = null;
        }
        document.getElementById("charts").textContent = "0";
      }
    },
    error: function (err) {
      preview.innerHTML = `<p>❌ Failed to parse file: ${escapeHtml(err.message)}</p>`;
    }
  });
});

fileInput.addEventListener("click", function () {
  this.value = "";
});

function renderStats() {
  document.getElementById("rows").textContent = currentData.length;
  document.getElementById("columns").textContent = currentHeaders.length;
  document.getElementById("reports").textContent = "1";
}

function renderPreview(fileName) {
  let html = `
    <h3>✅ ${escapeHtml(fileName)}</h3>
    <p><strong>Total Rows:</strong> ${currentData.length}</p>
    <p><strong>Total Columns:</strong> ${currentHeaders.length}</p>
    <table>
      <thead><tr>${currentHeaders.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
      <tbody>
        ${currentData.slice(0, 10).map(row =>
          `<tr>${currentHeaders.map(h => `<td>${escapeHtml(row[h] ?? "")}</td>`).join("")}</tr>`
        ).join("")}
      </tbody>
    </table>
  `;
  preview.innerHTML = html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderNumericColumns() {
  numericHeaders = currentHeaders.filter(h =>
    currentData.some(r => r[h] !== "" && r[h] != null && !isNaN(parseFloat(r[h])))
  );
  document.getElementById("numericColumns").textContent = numericHeaders.length;

  let missing = 0;
  currentData.forEach(row => {
    currentHeaders.forEach(h => {
      if (row[h] === "" || row[h] == null) missing++;
    });
  });
  document.getElementById("missingValues").textContent = missing;
}

function populateChartColumnSelect() {
  chartColumnSelect.innerHTML = "";
  numericHeaders.forEach(h => {
    const opt = document.createElement("option");
    opt.value = h;
    opt.textContent = h;
    chartColumnSelect.appendChild(opt);
  });
}

chartColumnSelect.addEventListener("change", function () {
  chartColumn = this.value;
  updateChartData();
  createChart();
  computeAnalytics();
});

chartTypeSelect.addEventListener("change", function () {
  if (values.length === 0) return;
  createChart();
});

function updateChartData() {
  values = currentData
    .map(r => parseFloat(r[chartColumn]))
    .filter(v => !isNaN(v));

  labels = currentData.slice(0, values.length > 10 ? 10 : values.length)
    .map((r, i) => "Row " + (i + 1));
}

function computeAnalytics() {
  if (values.length === 0) {
    document.getElementById("mean").textContent = "0";
    document.getElementById("median").textContent = "0";
    return;
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  let median;
  if (sorted.length % 2 === 0) {
    median = (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  } else {
    median = sorted[Math.floor(sorted.length / 2)];
  }

  document.getElementById("mean").textContent = mean.toFixed(2);
  document.getElementById("median").textContent = median.toFixed(2);
}

function createChart() {
  const ctx = document.getElementById("barChart");
  if (chart) chart.destroy();

  const colors = [
    "#0ea5e9", "#38bdf8", "#06b6d4", "#14b8a6", "#22c55e",
    "#84cc16", "#eab308", "#f97316", "#ef4444", "#8b5cf6"
  ];

  const type = chartTypeSelect.value;
  const isCircular = type === "pie" || type === "doughnut";

  chart = new Chart(ctx, {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        label: chartColumn,
        data: values.slice(0, 10),
        backgroundColor: colors,
        borderColor: "#ffffff",
        borderWidth: 1,
        fill: false,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: isCircular ? {} : { y: { beginAtZero: true } }
    }
  });

  document.getElementById("charts").textContent = "1";
}

function resetDashboard() {
  document.getElementById("rows").textContent = "0";
  document.getElementById("columns").textContent = "0";
  document.getElementById("charts").textContent = "0";
  document.getElementById("reports").textContent = "0";

  document.getElementById("mean").textContent = "0";
  document.getElementById("median").textContent = "0";
  document.getElementById("numericColumns").textContent = "0";
  document.getElementById("missingValues").textContent = "0";

  preview.innerHTML = "<p>No dataset uploaded.</p>";
  chartColumnSelect.innerHTML = "";
  currentData = [];
  currentHeaders = [];
  numericHeaders = [];
  values = [];
  labels = [];

  if (chart) {
    chart.destroy();
    chart = null;
  }
}

window.addEventListener("load", function () {
  resetDashboard();
});

console.log("✅ DataVista AI Loaded Successfully");