/* ============================================================
   DataVista AI — script.js
   Modules: State · Utils · Theme · Detection · Ingestion ·
   Filters · Sort · Table · Analytics · Chart · AI Summary ·
   Export · Event bindings
   ============================================================ */

/* ---------------- State ---------------- */
const state = {
  data: [],              // raw parsed rows
  headers: [],
  filteredData: [],
  sortedData: [],
  numericHeaders: [],
  categoricalHeaders: [],
  dateColumn: null,
  labelColumn: '',
  chartColumn: '',
  chartType: 'bar',
  sortColumn: null,
  sortDirection: 'asc',
  currentPage: 1,
  rowsPerPage: 25,
  searchTerm: '',
  columnFilters: {},
  dateFilter: { from: null, to: null },
  reportsGenerated: 0
};

let chartInstance = null;
const palette = ['#38BDF8','#8B5CF6','#F5A524','#FB7185','#22C55E','#06B6D4','#A78BFA','#FBBF24','#F472B6','#34D399'];

/* ---------------- Utils ---------------- */
function setText(id, value){ const el = document.getElementById(id); if(el) el.textContent = value; }
function getText(id){ const el = document.getElementById(id); return el ? el.textContent : ''; }

function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function formatNumber(n){
  if(n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function debounce(fn, delay){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function triggerDownload(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------------- Toasts & Loading ---------------- */
function showToast(message, type = 'info'){
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

function showLoading(text){
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading(){
  document.getElementById('loadingOverlay').classList.add('hidden');
}

/* ---------------- Theme ---------------- */
function initTheme(){
  const saved = localStorage.getItem('datavista-theme');
  if(saved === 'light') applyTheme('light');
}

function applyTheme(mode){
  const isLight = mode === 'light';
  document.body.classList.toggle('light-mode', isLight);
  document.getElementById('iconSun').classList.toggle('hidden', isLight);
  document.getElementById('iconMoon').classList.toggle('hidden', !isLight);
  localStorage.setItem('datavista-theme', mode);
}

function toggleTheme(){
  const isLight = document.body.classList.contains('light-mode');
  applyTheme(isLight ? 'dark' : 'light');
}

/* ---------------- Column detection ---------------- */
function detectNumericHeaders(data, headers){
  const sampleSize = Math.min(data.length, 500);
  return headers.filter(h => {
    let numericCount = 0, total = 0;
    for(let i = 0; i < sampleSize; i++){
      const v = data[i][h];
      if(v === '' || v == null) continue;
      total++;
      if(!isNaN(parseFloat(v)) && isFinite(v)) numericCount++;
    }
    return total > 0 && (numericCount / total) > 0.6;
  });
}

function detectDateHeader(data, headers, numericHeaders){
  const candidates = headers.filter(h => !numericHeaders.includes(h));
  const sampleSize = Math.min(data.length, 200);
  for(const h of candidates){
    let hits = 0, total = 0;
    for(let i = 0; i < sampleSize; i++){
      const v = data[i][h];
      if(v === '' || v == null) continue;
      total++;
      if(!isNaN(Date.parse(v))) hits++;
    }
    if(total > 0 && (hits / total) > 0.7) return h;
  }
  return null;
}

function detectLabelColumn(headers, numericHeaders, dateColumn){
  const nonNumeric = headers.filter(h => !numericHeaders.includes(h) && h !== dateColumn);
  const preferred = nonNumeric.find(h => /name|product|customer|category|item|title|order/i.test(h));
  if(preferred) return preferred;
  if(nonNumeric.length > 0) return nonNumeric[0];
  return headers[0] || '';
}

function detectDefaultChartColumn(numericHeaders){
  if(numericHeaders.length === 0) return '';
  // Prefer a real metric (sales/profit/amount/etc.) over an ID-like or row-index column
  const preferred = numericHeaders.find(h => /sales|revenue|profit|amount|price|qty|quantity|total|value|score/i.test(h));
  if(preferred) return preferred;
  const nonId = numericHeaders.find(h => !/(^id$|_id$|id$|row|index)/i.test(h));
  return nonId || numericHeaders[0];
}

function detectCategoricalHeaders(data, headers, numericHeaders, dateColumn){
  const candidates = headers.filter(h => !numericHeaders.includes(h) && h !== dateColumn);
  const result = [];
  candidates.forEach(h => {
    const set = new Set();
    for(let i = 0; i < data.length; i++){
      const v = data[i][h];
      if(v === '' || v == null) continue;
      set.add(v);
      if(set.size > 30) break;
    }
    if(set.size >= 2 && set.size <= 30) result.push(h);
  });
  return result;
}

/* ---------------- Ingestion ---------------- */
function handleFile(file){
  if(!file) return;

  if(!file.name.toLowerCase().endsWith('.csv')){
    showToast('Please upload a .csv file.', 'error');
    return;
  }

  showLoading('Parsing dataset…');

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function(results){
      hideLoading();

      if(results.errors && results.errors.length > 0){
        showToast(`Parsed with ${results.errors.length} row issue(s) — showing what could be read.`, 'error');
      }

      const data = results.data;
      const headers = results.meta.fields || [];

      if(data.length === 0 || headers.length === 0){
        showToast('That CSV appears to be empty or unreadable.', 'error');
        return;
      }

      loadDataset(data, headers, file.name);
    },
    error: function(err){
      hideLoading();
      showToast('Failed to parse the file: ' + err.message, 'error');
    }
  });
}

function loadDataset(data, headers, fileName){
  state.data = data;
  state.headers = headers;
  state.numericHeaders = detectNumericHeaders(data, headers);
  state.dateColumn = detectDateHeader(data, headers, state.numericHeaders);
  state.categoricalHeaders = detectCategoricalHeaders(data, headers, state.numericHeaders, state.dateColumn);
  state.labelColumn = detectLabelColumn(headers, state.numericHeaders, state.dateColumn);
  state.chartColumn = detectDefaultChartColumn(state.numericHeaders);
  state.chartType = 'bar';
  document.getElementById('chartType').value = 'bar';
  state.sortColumn = null;
  state.sortDirection = 'asc';
  state.currentPage = 1;
  state.searchTerm = '';
  document.getElementById('tableSearch').value = '';
  state.columnFilters = {};
  state.dateFilter = { from: null, to: null };
  state.reportsGenerated = 0;

  document.getElementById('fileNameLabel').textContent = `Loaded: ${fileName} (${data.length.toLocaleString()} rows)`;
  setText('rows', data.length.toLocaleString());
  setText('columns', headers.length);
  setText('reports', '0');

  enableControls();
  populateColumnSelects();
  buildFilterUI();
  recomputePipeline();

  showToast(`Loaded ${data.length.toLocaleString()} rows successfully.`, 'success');
}

function enableControls(){
  ['tableSearch','rowsPerPage','downloadCsvBtn','downloadCsvBtn2','labelColumn','chartType','downloadChartBtn','downloadChartBtn2','downloadPdfBtn']
    .forEach(id => { const el = document.getElementById(id); if(el) el.disabled = false; });
  document.getElementById('chartColumn').disabled = state.numericHeaders.length === 0;
}

function populateColumnSelects(){
  const labelSelect = document.getElementById('labelColumn');
  const chartSelect = document.getElementById('chartColumn');

  labelSelect.innerHTML = state.headers.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');
  labelSelect.value = state.labelColumn;

  if(state.numericHeaders.length > 0){
    chartSelect.innerHTML = state.numericHeaders.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');
    chartSelect.value = state.chartColumn;
  } else {
    chartSelect.innerHTML = `<option value="">No numeric columns detected</option>`;
  }
}

/* ---------------- Filters ---------------- */
function buildFilterUI(){
  const container = document.getElementById('filterContainer');
  container.innerHTML = '';

  state.categoricalHeaders.forEach(h => {
    const values = Array.from(new Set(state.data.map(r => r[h]).filter(v => v !== '' && v != null))).sort();
    const chip = document.createElement('div');
    chip.className = 'filter-chip';

    const label = document.createElement('label');
    label.textContent = h;

    const select = document.createElement('select');
    select.innerHTML = `<option value="__all__">All</option>` +
      values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    select.addEventListener('change', () => {
      state.columnFilters[h] = select.value;
      recomputePipeline();
    });

    chip.appendChild(label);
    chip.appendChild(select);
    container.appendChild(chip);
  });

  if(state.dateColumn){
    const fromChip = document.createElement('div');
    fromChip.className = 'filter-chip';
    fromChip.innerHTML = `<label>${escapeHtml(state.dateColumn)} — From</label>`;
    const fromInput = document.createElement('input');
    fromInput.type = 'date';
    fromInput.addEventListener('change', () => {
      state.dateFilter.from = fromInput.value || null;
      recomputePipeline();
    });
    fromChip.appendChild(fromInput);
    container.appendChild(fromChip);

    const toChip = document.createElement('div');
    toChip.className = 'filter-chip';
    toChip.innerHTML = `<label>${escapeHtml(state.dateColumn)} — To</label>`;
    const toInput = document.createElement('input');
    toInput.type = 'date';
    toInput.addEventListener('change', () => {
      state.dateFilter.to = toInput.value || null;
      recomputePipeline();
    });
    toChip.appendChild(toInput);
    container.appendChild(toChip);
  }
}

function applyFilters(){
  let result = state.data;

  Object.entries(state.columnFilters).forEach(([col, val]) => {
    if(val && val !== '__all__'){
      result = result.filter(r => String(r[col]) === val);
    }
  });

  if(state.dateColumn && (state.dateFilter.from || state.dateFilter.to)){
    result = result.filter(r => {
      const t = Date.parse(r[state.dateColumn]);
      if(isNaN(t)) return false;
      if(state.dateFilter.from && t < Date.parse(state.dateFilter.from)) return false;
      if(state.dateFilter.to && t > Date.parse(state.dateFilter.to)) return false;
      return true;
    });
  }

  if(state.searchTerm){
    const term = state.searchTerm.toLowerCase();
    result = result.filter(row => state.headers.some(h => String(row[h] ?? '').toLowerCase().includes(term)));
  }

  state.filteredData = result;
}

/* ---------------- Sort ---------------- */
function applySort(){
  if(!state.sortColumn){
    state.sortedData = state.filteredData;
    return;
  }
  const col = state.sortColumn;
  const isNumeric = state.numericHeaders.includes(col);
  const dir = state.sortDirection === 'asc' ? 1 : -1;

  state.sortedData = [...state.filteredData].sort((a, b) => {
    let va = a[col], vb = b[col];
    if(isNumeric){
      va = parseFloat(va); vb = parseFloat(vb);
      if(isNaN(va)) va = -Infinity;
      if(isNaN(vb)) vb = -Infinity;
      return (va - vb) * dir;
    }
    va = String(va ?? ''); vb = String(vb ?? '');
    return va.localeCompare(vb) * dir;
  });
}

/* ---------------- Table ---------------- */
function renderTable(){
  const table = document.getElementById('dataTable');
  const emptyState = document.getElementById('previewEmptyState');
  const pagination = document.getElementById('pagination');
  const theadRow = document.getElementById('tableHeadRow');
  const tbody = document.getElementById('tableBody');

  if(state.filteredData.length === 0){
    table.classList.add('hidden');
    pagination.classList.add('hidden');
    emptyState.classList.remove('hidden');
    emptyState.textContent = state.data.length === 0
      ? 'No dataset uploaded yet. Upload a CSV to see a live preview here.'
      : 'No rows match your search or filters.';
    return;
  }

  emptyState.classList.add('hidden');
  table.classList.remove('hidden');
  pagination.classList.remove('hidden');

  theadRow.innerHTML = state.headers.map(h => {
    const arrow = state.sortColumn === h
      ? `<span class="sort-arrow">${state.sortDirection === 'asc' ? '▲' : '▼'}</span>`
      : '';
    return `<th data-col="${escapeHtml(h)}">${escapeHtml(h)}${arrow}</th>`;
  }).join('');

  const totalRows = state.sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / state.rowsPerPage));
  state.currentPage = Math.min(state.currentPage, totalPages);
  const start = (state.currentPage - 1) * state.rowsPerPage;
  const pageRows = state.sortedData.slice(start, start + state.rowsPerPage);

  const frag = document.createDocumentFragment();
  pageRows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = state.headers.map(h => `<td>${escapeHtml(row[h] ?? '')}</td>`).join('');
    frag.appendChild(tr);
  });
  tbody.innerHTML = '';
  tbody.appendChild(frag);

  document.getElementById('pageInfo').textContent = `Page ${state.currentPage} of ${totalPages} · ${totalRows.toLocaleString()} rows`;
  document.getElementById('prevPageBtn').disabled = state.currentPage <= 1;
  document.getElementById('nextPageBtn').disabled = state.currentPage >= totalPages;
}

/* ---------------- Analytics ---------------- */
function computeColumnStats(data, col){
  const numeric = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
  if(numeric.length === 0) return null;

  const sum = numeric.reduce((a, b) => a + b, 0);
  const mean = sum / numeric.length;
  const sorted = [...numeric].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const freq = new Map();
  numeric.forEach(v => freq.set(v, (freq.get(v) || 0) + 1));
  let mode = numeric[0], modeCount = 0;
  freq.forEach((count, val) => {
    if(count > modeCount || (count === modeCount && val < mode)){ mode = val; modeCount = count; }
  });

  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;
  const variance = numeric.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / numeric.length;
  const stddev = Math.sqrt(variance);
  const uniqueValues = new Set(numeric).size;

  return { mean, median, mode, min, max, range, sum, average: mean, stddev, variance, uniqueValues };
}

function computeDatasetWideStats(data){
  let missing = 0;
  data.forEach(row => {
    state.headers.forEach(h => {
      if(row[h] === '' || row[h] == null) missing++;
    });
  });
  return { numericColumns: state.numericHeaders.length, missingValues: missing };
}

function updateAnalytics(){
  const wide = computeDatasetWideStats(state.filteredData);
  setText('numericColumns', wide.numericColumns);
  setText('missingValues', wide.missingValues.toLocaleString());

  const fields = ['mean','median','mode','min','max','range','sum','average','stddev','variance','uniqueValues'];

  if(!state.chartColumn){
    fields.forEach(id => setText(id, '—'));
    return;
  }

  const stats = computeColumnStats(state.filteredData, state.chartColumn);
  if(!stats){
    fields.forEach(id => setText(id, '—'));
    return;
  }

  setText('mean', formatNumber(stats.mean));
  setText('median', formatNumber(stats.median));
  setText('mode', formatNumber(stats.mode));
  setText('min', formatNumber(stats.min));
  setText('max', formatNumber(stats.max));
  setText('range', formatNumber(stats.range));
  setText('sum', formatNumber(stats.sum));
  setText('average', formatNumber(stats.average));
  setText('stddev', formatNumber(stats.stddev));
  setText('variance', formatNumber(stats.variance));
  setText('uniqueValues', stats.uniqueValues.toLocaleString());
}

/* ---------------- Chart ---------------- */
function getChartSourceRows(){
  const rows = state.filteredData;
  if(rows.length <= 50) return { rows, sampled: false };
  const stride = Math.ceil(rows.length / 50);
  const sampled = [];
  for(let i = 0; i < rows.length; i += stride) sampled.push(rows[i]);
  return { rows: sampled, sampled: true };
}

function buildChartConfig(type, labels, values, rows, labelCol){
  const isCircular = type === 'pie' || type === 'doughnut';
  const isRadar = type === 'radar';
  const isScatter = type === 'scatter';
  const isHBar = type === 'horizontalBar';
  const actualType = isHBar ? 'bar' : type;
  const valueScaleKey = isHBar ? 'x' : 'y';

  let datasets;
  if(isScatter){
    const points = rows.map((r, i) => {
      const xv = parseFloat(r[labelCol]);
      return { x: isNaN(xv) ? i : xv, y: values[i] };
    });
    datasets = [{ label: state.chartColumn, data: points, backgroundColor: palette[0], borderColor: palette[0] }];
  } else {
    datasets = [{
      label: state.chartColumn,
      data: values,
      backgroundColor: isCircular ? palette : (isRadar ? 'rgba(139,92,246,0.28)' : palette[0]),
      borderColor: isRadar ? palette[1] : (type === 'line' ? palette[0] : '#ffffff'),
      borderWidth: isRadar ? 2 : 1,
      fill: (type === 'line' || isRadar),
      tension: 0.35,
      pointBackgroundColor: palette[0]
    }];
  }

  const scales = {};
  if(!isCircular && !isRadar){
    scales[valueScaleKey] = { beginAtZero: !isScatter };
    if(isScatter){
      scales.x = { title: { display: true, text: labelCol || 'X' } };
    }
  }

  return {
    type: actualType,
    data: { labels: isScatter ? undefined : labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isHBar ? 'y' : 'x',
      plugins: { legend: { display: isCircular || isRadar } },
      scales
    }
  };
}

function updateChart(){
  const canvas = document.getElementById('barChart');
  const emptyState = document.getElementById('chartEmptyState');
  const sampleNote = document.getElementById('chartSampleNote');

  if(!state.chartColumn || state.filteredData.length === 0){
    if(chartInstance){ chartInstance.destroy(); chartInstance = null; }
    canvas.classList.add('hidden');
    emptyState.classList.remove('hidden');
    sampleNote.classList.add('hidden');
    setText('charts', '0');
    return;
  }

  canvas.classList.remove('hidden');
  emptyState.classList.add('hidden');

  const { rows, sampled } = getChartSourceRows();
  sampleNote.classList.toggle('hidden', !sampled);
  if(sampled){
    sampleNote.textContent = `Showing a sampled view of ${rows.length} of ${state.filteredData.length.toLocaleString()} rows for readability.`;
  }

  const values = rows.map(r => {
    const v = parseFloat(r[state.chartColumn]);
    return isNaN(v) ? 0 : v;
  });
  const labelCol = state.labelColumn;
  const labels = rows.map((r, i) => labelCol ? String(r[labelCol] ?? `Row ${i + 1}`) : `Row ${i + 1}`);

  const config = buildChartConfig(state.chartType, labels, values, rows, labelCol);

  if(chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas, config);
  setText('charts', '1');
}

/* ---------------- AI Summary ---------------- */
function updateAiSummary(){
  const el = document.getElementById('aiSummaryText');
  const rows = state.filteredData;

  if(rows.length === 0){
    el.textContent = state.data.length === 0
      ? 'Upload a dataset to generate an automatic summary of your data.'
      : 'No rows match the current filters — adjust or clear filters to see insights.';
    return;
  }

  if(state.numericHeaders.length === 0){
    el.textContent = `The dataset contains ${rows.length.toLocaleString()} rows and ${state.headers.length} columns. No numeric columns were detected for deeper analysis.`;
    return;
  }

  const numeric = state.numericHeaders;
  const salesCol = numeric.find(h => /sales|revenue|amount|total/i.test(h)) || numeric[0];
  const profitCol = numeric.find(h => /profit|margin/i.test(h)) || numeric.find(h => h !== salesCol) || salesCol;
  const catCol = state.categoricalHeaders.find(h => /category|segment|region|state|type/i.test(h)) || state.categoricalHeaders[0];

  const salesStats = computeColumnStats(rows, salesCol);
  const profitStats = computeColumnStats(rows, profitCol);
  const wide = computeDatasetWideStats(rows);

  let sentence = `The dataset contains ${rows.length.toLocaleString()} rows and ${state.headers.length} columns.`;
  if(salesStats) sentence += ` ${salesCol} has an average of ${formatNumber(salesStats.mean)}.`;
  if(profitStats && profitCol !== salesCol) sentence += ` ${profitCol} ranges from ${formatNumber(profitStats.min)} to ${formatNumber(profitStats.max)}.`;
  sentence += ` There are ${wide.missingValues.toLocaleString()} missing values.`;

  if(catCol && salesStats){
    const totals = new Map();
    rows.forEach(r => {
      const key = String(r[catCol] ?? 'Unknown');
      const v = parseFloat(r[salesCol]);
      totals.set(key, (totals.get(key) || 0) + (isNaN(v) ? 0 : v));
    });
    let topKey = null, topVal = -Infinity;
    totals.forEach((v, k) => { if(v > topVal){ topVal = v; topKey = k; } });
    if(topKey) sentence += ` The highest ${catCol.toLowerCase()} by ${salesCol.toLowerCase()} is ${topKey}.`;
  }

  el.textContent = sentence;
}

/* ---------------- Pipeline ---------------- */
function recomputePipeline(){
  applyFilters();
  applySort();
  state.currentPage = 1;
  renderTable();
  updateAnalytics();
  updateChart();
  updateAiSummary();
}
const debouncedRecompute = debounce(recomputePipeline, 250);

/* ---------------- Export ---------------- */
function registerReport(){
  state.reportsGenerated++;
  setText('reports', state.reportsGenerated);
}

function downloadCsv(){
  if(state.filteredData.length === 0){ showToast('No data to export.', 'error'); return; }
  const csv = Papa.unparse(state.filteredData);
  triggerDownload(new Blob([csv], { type: 'text/csv' }), 'datavista-export.csv');
  registerReport();
  showToast('CSV downloaded.', 'success');
}

function downloadChartPng(){
  if(!chartInstance){ showToast('No chart to export yet.', 'error'); return; }
  const url = chartInstance.toBase64Image();
  const a = document.createElement('a');
  a.href = url;
  a.download = 'datavista-chart.png';
  a.click();
  registerReport();
  showToast('Chart image downloaded.', 'success');
}

function downloadPdfReport(){
  if(state.filteredData.length === 0){ showToast('Upload data before generating a report.', 'error'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('DataVista AI — Analytics Report', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 25);

  doc.setFontSize(11);
  doc.setTextColor(30);
  const summary = document.getElementById('aiSummaryText').textContent;
  const summaryLines = doc.splitTextToSize(summary, 180);
  doc.text(summaryLines, 14, 35);

  const statsRows = [
    ['Mean', getText('mean')], ['Median', getText('median')], ['Mode', getText('mode')],
    ['Minimum', getText('min')], ['Maximum', getText('max')], ['Range', getText('range')],
    ['Sum', getText('sum')], ['Average', getText('average')], ['Std. Deviation', getText('stddev')],
    ['Variance', getText('variance')], ['Numeric Columns', getText('numericColumns')],
    ['Missing Values', getText('missingValues')], ['Unique Values', getText('uniqueValues')]
  ];

  doc.autoTable({
    startY: 35 + summaryLines.length * 6 + 6,
    head: [['Metric', 'Value']],
    body: statsRows,
    theme: 'grid',
    headStyles: { fillColor: [56, 189, 248] }
  });

  if(chartInstance){
    const imgData = chartInstance.toBase64Image();
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text('Chart: ' + state.chartColumn, 14, finalY);
    doc.addImage(imgData, 'PNG', 14, finalY + 5, 180, 90);
  }

  doc.save('datavista-report.pdf');
  registerReport();
  showToast('PDF report downloaded.', 'success');
}

/* ---------------- Event bindings ----------------
   This script tag sits at the very end of <body>, so the DOM is
   already parsed by the time this file runs — no need to wait for
   DOMContentLoaded, and waiting on it is a common source of "nothing
   happens" bugs if that event fires before this listener attaches. */
function initApp(){
  initTheme();

  const csvFile = document.getElementById('csvFile');

  document.getElementById('uploadBtn').addEventListener('click', () => csvFile.click());
  document.getElementById('scrollDashboardBtn').addEventListener('click', () => {
    document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
  });

  csvFile.addEventListener('click', function(){ this.value = ''; });
  csvFile.addEventListener('change', function(){ handleFile(this.files[0]); });

  const hero = document.querySelector('.hero');
  hero.addEventListener('dragover', e => e.preventDefault());
  hero.addEventListener('drop', e => {
    e.preventDefault();
    if(e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  document.getElementById('tableSearch').addEventListener('input', function(){
    state.searchTerm = this.value.trim();
    debouncedRecompute();
  });

  document.getElementById('rowsPerPage').addEventListener('change', function(){
    state.rowsPerPage = parseInt(this.value, 10);
    state.currentPage = 1;
    renderTable();
  });

  document.getElementById('prevPageBtn').addEventListener('click', () => {
    if(state.currentPage > 1){ state.currentPage--; renderTable(); }
  });
  document.getElementById('nextPageBtn').addEventListener('click', () => {
    state.currentPage++; renderTable();
  });

  document.getElementById('tableHeadRow').addEventListener('click', e => {
    const th = e.target.closest('th');
    if(!th) return;
    const col = th.dataset.col;
    if(state.sortColumn === col){
      state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortColumn = col;
      state.sortDirection = 'asc';
    }
    applySort();
    state.currentPage = 1;
    renderTable();
  });

  document.getElementById('labelColumn').addEventListener('change', function(){
    state.labelColumn = this.value;
    updateChart();
  });

  document.getElementById('chartColumn').addEventListener('change', function(){
    state.chartColumn = this.value;
    updateAnalytics();
    updateChart();
  });

  document.getElementById('chartType').addEventListener('change', function(){
    state.chartType = this.value;
    updateChart();
  });

  document.getElementById('downloadCsvBtn').addEventListener('click', downloadCsv);
  document.getElementById('downloadCsvBtn2').addEventListener('click', downloadCsv);
  document.getElementById('downloadChartBtn').addEventListener('click', downloadChartPng);
  document.getElementById('downloadChartBtn2').addEventListener('click', downloadChartPng);
  document.getElementById('downloadPdfBtn').addEventListener('click', downloadPdfReport);

  console.log('✅ DataVista AI Loaded Successfully');
}

initApp();
