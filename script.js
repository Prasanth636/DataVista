const fileInput=document.getElementById("csvFile");

const output=document.getElementById("output");

fileInput.addEventListener("change",function(){

const file=this.files[0];

if(file){

document.getElementById("rows").innerHTML="?";

document.getElementById("columns").innerHTML="?";

output.innerHTML=`

<h3>✅ ${file.name}</h3>

<br>

<p>Size : ${(file.size/1024).toFixed(2)} KB</p>

<br>

<p>Status : Uploaded Successfully</p>

<p style="margin-top:10px;">CSV preview will be available in Version 4.0</p>

`;

}

});