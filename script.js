const fileInput = document.getElementById("csvFile");
const preview = document.getElementById("preview");

const rows = document.getElementById("rows");
const columns = document.getElementById("columns");
const charts = document.getElementById("charts");
const reports = document.getElementById("reports");

if(fileInput){

fileInput.addEventListener("change",function(){

const file=this.files[0];

if(!file) return;

Papa.parse(file,{

header:true,

skipEmptyLines:true,

complete:function(results){

const data=results.data;

const headers=results.meta.fields || [];

rows.textContent=data.length;
columns.textContent=headers.length;
charts.textContent="3";
reports.textContent="1";

let html=`

<h3>✅ ${file.name}</h3>

<p><strong>Total Rows:</strong> ${data.length}</p>

<p><strong>Total Columns:</strong> ${headers.length}</p>

<table>

<thead>

<tr>

`;

headers.forEach(header=>{

html+=`<th>${header}</th>`;

});

html+=`

</tr>

</thead>

<tbody>

`;

data.slice(0,10).forEach(row=>{

html+="<tr>";

headers.forEach(header=>{

html+=`<td>${row[header] || ""}</td>`;

});

html+="</tr>";

});

html+=`

</tbody>

</table>

`;

preview.innerHTML=html;

},

error:function(){

preview.innerHTML="<h2>❌ Unable to read CSV file.</h2>";

}

});

});

}