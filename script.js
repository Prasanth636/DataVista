const fileInput = document.getElementById("csvFile");
const preview = document.getElementById("preview");
const chartType = document.getElementById("chartType");

let chart = null;
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

            const data = results.data;
            const headers = results.meta.fields || [];

            document.getElementById("rows").textContent = data.length;
            document.getElementById("columns").textContent = headers.length;
            document.getElementById("reports").textContent = "1";

            let html = `
            <h3>✅ ${file.name}</h3>
            <p><strong>Total Rows:</strong> ${data.length}</p>
            <p><strong>Total Columns:</strong> ${headers.length}</p>

            <table>
            <thead>
            <tr>
            `;

            headers.forEach(h => {

                html += `<th>${h}</th>`;

            });

            html += `</tr></thead><tbody>`;

            data.slice(0,10).forEach(row=>{

                html += "<tr>";

                headers.forEach(h=>{

                    html += `<td>${row[h] ?? ""}</td>`;

                });

                html += "</tr>";

            });

            html += "</tbody></table>";

            preview.innerHTML = html;

            const numericHeaders = headers.filter(h=>{

                return data.some(r=>!isNaN(parseFloat(r[h])));

            });

            document.getElementById("numericColumns").textContent =
            numericHeaders.length;

            let missing = 0;

            data.forEach(row=>{

                headers.forEach(h=>{

                    if(row[h]==="" || row[h]==null){

                        missing++;

                    }

                });

            });

            document.getElementById("missingValues").textContent =
            missing;

            if(numericHeaders.length===0){

                return;

            }

            chartColumn = numericHeaders[0];

            values = data
            .map(r=>parseFloat(r[chartColumn]))
            .filter(v=>!isNaN(v));

            labels = data
            .slice(0,10)
            .map((r,i)=>"Row "+(i+1));

            const mean =
            values.reduce((a,b)=>a+b,0)/values.length;

            const sorted=[...values].sort((a,b)=>a-b);

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

            document.getElementById("mean").textContent=
            mean.toFixed(2);

            document.getElementById("median").textContent=
            median.toFixed(2);

            createChart();

        }

    });

});
function createChart(){

    const ctx = document.getElementById("barChart");

    if(chart){

        chart.destroy();

    }

    chart = new Chart(ctx,{

        type: chartType.value === "pie" ? "pie" :
      chartType.value === "line" ? "line" : "bar",

        data:{

            labels: labels,

            datasets:[{

                label: chartColumn,

                data: values.slice(0,10),

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

chartType.addEventListener("change",function(){

    if(values.length===0){

        return;

    }

    createChart();

});
// ---------- Helper Functions ----------

function resetDashboard(){

    document.getElementById("rows").textContent="0";
    document.getElementById("columns").textContent="0";
    document.getElementById("charts").textContent="0";
    document.getElementById("reports").textContent="0";

    document.getElementById("mean").textContent="0";
    document.getElementById("median").textContent="0";
    document.getElementById("numericColumns").textContent="0";
    document.getElementById("missingValues").textContent="0";

    preview.innerHTML="<p>No dataset uploaded.</p>";

    if(chart){

        chart.destroy();
        chart=null;

    }

}

window.addEventListener("load",function(){

    resetDashboard();

});

fileInput.addEventListener("click",function(){

    this.value="";

});

console.log("✅ DataVista AI Loaded Successfully");