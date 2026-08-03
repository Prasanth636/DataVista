const fileInput = document.getElementById("csvFile");
const preview = document.getElementById("preview");

const chartColumn = document.getElementById("chartColumn");
const chartType = document.getElementById("chartType");

let chart = null;
let csvData = [];
let headers = [];
let numericHeaders = [];

fileInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    Papa.parse(file, {

        header: true,
        skipEmptyLines: true,

        complete: function (results) {

            csvData = results.data;
            headers = results.meta.fields || [];

            document.getElementById("rows").textContent = csvData.length;
            document.getElementById("columns").textContent = headers.length;
            document.getElementById("reports").textContent = "1";

            let html = `
            <h3>✅ ${file.name}</h3>

            <p><strong>Total Rows:</strong> ${csvData.length}</p>

            <p><strong>Total Columns:</strong> ${headers.length}</p>

            <table>

            <thead>

            <tr>
            `;

            headers.forEach(header => {

                html += `<th>${header}</th>`;

            });

            html += `
            </tr>

            </thead>

            <tbody>
            `;

            csvData.slice(0,10).forEach(row=>{

                html+="<tr>";

                headers.forEach(header=>{

                    html+=`<td>${row[header] ?? ""}</td>`;

                });

                html+="</tr>";

            });

            html+=`
            </tbody>

            </table>
            `;

            preview.innerHTML=html;

            numericHeaders = headers.filter(header=>{

                return csvData.some(row=>!isNaN(parseFloat(row[header])));

            });

            chartColumn.innerHTML="";

            numericHeaders.forEach(column=>{

                chartColumn.innerHTML +=
                `<option value="${column}">${column}</option>`;

            });

            document.getElementById("numericColumns").textContent =
            numericHeaders.length;
            let missing = 0;

            csvData.forEach(row=>{

                headers.forEach(header=>{

                    if(row[header]==="" || row[header]==null){

                        missing++;

                    }

                });

            });

            document.getElementById("missingValues").textContent =
            missing;

            if(numericHeaders.length===0){

                return;

            }

            updateAnalytics();
            drawChart();

        },

        error:function(){

            preview.innerHTML =
            "<h2>❌ Unable to read CSV File</h2>";

        }

    });

});

function updateAnalytics(){

    const column = chartColumn.value || numericHeaders[0];

    let numbers = csvData
    .map(row=>parseFloat(row[column]))
    .filter(value=>!isNaN(value));

    if(numbers.length===0){

        document.getElementById("mean").textContent="0";
        document.getElementById("median").textContent="0";

        return;

    }

    const mean =
    numbers.reduce((a,b)=>a+b,0)/numbers.length;

    const sorted=[...numbers].sort((a,b)=>a-b);

    let median;

    if(sorted.length%2===0){

        median=
        (
        sorted[sorted.length/2-1]+
        sorted[sorted.length/2]
        )/2;

    }else{

        median=
        sorted[Math.floor(sorted.length/2)];

    }

    document.getElementById("mean").textContent =
    mean.toFixed(2);

    document.getElementById("median").textContent =
    median.toFixed(2);

}
function drawChart(){

    const column = chartColumn.value || numericHeaders[0];

    const labels = csvData
    .slice(0,10)
    .map((row,index)=>row[headers[0]] || ("Row "+(index+1)));

    const values = csvData
    .slice(0,10)
    .map(row=>parseFloat(row[column]))
    .filter(value=>!isNaN(value));

    const ctx = document.getElementById("barChart");

    if(chart){

        chart.destroy();

    }

    chart = new Chart(ctx,{

        type: chartType.value,

        data:{

            labels:labels,

            datasets:[{

                label:column,

                data:values,

                backgroundColor:[
                    "#0ea5e9",
                    "#38bdf8",
                    "#06b6d4",
                    "#14b8a6",
                    "#22c55e",
                    "#84cc16",
                    "#eab308",
                    "#f97316",
                    "#ef4444",
                    "#8b5cf6"
                ],

                borderColor:"#ffffff",

                borderWidth:1,

                fill:false,

                tension:0.3

            }]

        },

        options:{

            responsive:true,

            maintainAspectRatio:false,

            plugins:{

                legend:{

                    display:true

                }

            },

            scales:{

                y:{

                    beginAtZero:true

                }

            }

        }

    });

    document.getElementById("charts").textContent="1";

}

chartColumn.addEventListener("change",function(){

    updateAnalytics();

    drawChart();

});

chartType.addEventListener("change",function(){

    drawChart();

});

window.addEventListener("load",function(){

    preview.innerHTML="<p>No dataset uploaded.</p>";

});

console.log("✅ DataVista AI Loaded Successfully");