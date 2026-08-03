const fileInput = document.getElementById("csvFile");
const preview = document.getElementById("preview");

fileInput.addEventListener("change", function () {

const file = this.files[0];

if (!file) return;

Papa.parse(file, {

header: true,
skipEmptyLines: true,

complete: function (results) {

const data = results.data;
const headers = results.meta.fields;

document.getElementById("rows").innerHTML = data.length;
document.getElementById("columns").innerHTML = headers.length;
document.getElementById("charts").innerHTML = "3";
document.getElementById("reports").innerHTML = "1";

let html = `
<h3>✅ ${file.name}</h3>

<p>Total Rows : ${data.length}</p>

<p>Total Columns : ${headers.length}</p>

<table>

<thead>

<tr>
`;

headers.forEach(h => {

html += `<th>${h}</th>`;

});

html += "</tr></thead><tbody>";

data.slice(0,10).forEach(row=>{

html+="<tr>";

headers.forEach(h=>{

html+=`<td>${row[h] ?? ""}</td>`;

});

html+="</tr>";

});

html += "</tbody></table>";

preview.innerHTML = html;

}

});

});