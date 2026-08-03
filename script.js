const fileInput = document.getElementById("csvFile");
const preview = document.getElementById("preview");

let chart;

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
            document.getElementById("charts").textContent = "1";
            document.getElementById("reports").textContent = "1";

            let html = `
            <h3>✅ ${file.name}</h3>

            <p><strong>Total Rows:</strong> ${data.length}</p>

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

            data.slice(0,10).forEach(row => {

                html += "<tr>";

                headers.forEach(header => {

                    html += `<td>${row[header] || ""}</td>`;

                });

                html += "</tr>";

            });

            html += `
            </tbody>
            </table>
            `;

            preview.innerHTML = html;

            // ---------- Analytics ----------

            let numericHeaders = headers.filter(header => {

                return data.some(row => !isNaN(parseFloat(row[header])));

            });

            document.getElementById("numericColumns").textContent = numericHeaders.length;

            let missing = 0;

            data.forEach(row => {

                headers.forEach(header => {

                    if (row[header] === "" || row[header] == null) {

                        missing++;

                    }

                });

            });

            document.getElementById("missingValues").textContent = missing;

            if (numericHeaders.length > 0) {

                const column = numericHeaders[0];

                let numbers = data
                    .map(row => parseFloat(row[column]))
                    .filter(value => !isNaN(value));

                let mean = numbers.reduce((a,b)=>a+b,0) / numbers.length;

                let sorted = [...numbers].sort((a,b)=>a-b);

                let median;

                if(sorted.length % 2 === 0){

                    median = (sorted[sorted.length/2-1] + sorted[sorted.length/2]) / 2;

                }else{

                    median = sorted[Math.floor(sorted.length/2)];

                }

                document.getElementById("mean").textContent = mean.toFixed(2);
                document.getElementById("median").textContent = median.toFixed(2);

                const labels = data.slice(0,10).map((row,index)=>"Row "+(index+1));

                const values = numbers.slice(0,10);

                const ctx = document.getElementById("barChart");

                if(chart){

                    chart.destroy();

                }

                chart = new Chart(ctx,{

                    type:"bar",

                    data:{

                        labels:labels,

                        datasets:[{

                            label:column,

                            data:values,

                            backgroundColor:"#0ea5e9",

                            borderColor:"#38bdf8",

                            borderWidth:1

                        }]

                    },

                    options:{

                        responsive:true,

                        maintainAspectRatio:false,

                        scales:{

                            y:{

                                beginAtZero:true

                            }

                        }

                    }

                });

            }

        },

        error:function(){

            preview.innerHTML = "<h2>❌ Unable to read CSV file.</h2>";

        }

    });

});