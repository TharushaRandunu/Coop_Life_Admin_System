const $ = id => document.getElementById(id);
const STORAGE_KEY = "vehicleManagement_v2";
let vehicles = [];
let services = [];
let selectedVehicleId = "";

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function saveLocal(message = "Changes saved in this browser.") {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({vehicles, services}));
    const el = $("message");
    if (el) el.textContent = message;
  } catch {
    const el = $("message");
    if (el) el.textContent = "Could not save locally. Export a backup and check browser storage settings.";
  }
}
function loadLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    vehicles = Array.isArray(saved.vehicles) ? saved.vehicles : [];
    services = Array.isArray(saved.services) ? saved.services : [];
  } catch { vehicles = []; services = []; }
}
function selectedVehicle() { return vehicles.find(v => v.id === selectedVehicleId); }
function dateStatus(date, label, vehicle) {
  if (!date) return null;
  const today = new Date(`${todayISO()}T00:00:00`);
  const expiry = new Date(`${date}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return null;
  const days = Math.ceil((expiry - today) / 86400000);
  if (days < 0) return {level:"danger", title:`${label} expired`, detail:`${vehicle.registration} — expired ${Math.abs(days)} day(s) ago (${date})`};
  if (days === 0) return {level:"danger", title:`${label} expires today`, detail:`${vehicle.registration} — ${date}`};
  if (days <= 30) return {level:"warning", title:`${label} expiring soon`, detail:`${vehicle.registration} — ${days} day(s) left (${date})`};
  return null;
}
function getReminders() {
  const reminders = [];
  vehicles.forEach(v => {
    [[v.licenceExpiry,"Revenue licence"],[v.insuranceExpiry,"Insurance" ]].forEach(([date,label]) => {
      const item = dateStatus(date,label,v); if (item) reminders.push({...item, vehicleId:v.id});
    });
    const latest = services.filter(s => s.vehicleId === v.id).sort((a,b) => (b.date||"").localeCompare(a.date||""))[0];
    const current = Number(v.currentMileage || 0);
    if (latest && latest.nextMileage !== "" && latest.nextMileage != null) {
      const next = Number(latest.nextMileage);
      if (current >= next) reminders.push({level:"danger",title:"Service mileage overdue",detail:`${v.registration} — current ${current.toLocaleString()} km; service due at ${next.toLocaleString()} km`,vehicleId:v.id});
      else if (next-current <= 500) reminders.push({level:"warning",title:"Service mileage approaching",detail:`${v.registration} — ${ (next-current).toLocaleString() } km until service`,vehicleId:v.id});
    }
  });
  return reminders;
}
function renderReminders() {
  const list = $("reminderList");
  if (!list) return;
  const reminders = getReminders();
  if (!reminders.length) {
    list.innerHTML = `<div class="reminder-empty">✓ No urgent reminders. Add expiry dates and current mileage to enable alerts.</div>`;
    return;
  }
  list.innerHTML = reminders.map(r => `<button type="button" class="reminder-item ${r.level}" data-open-vehicle="${escapeHTML(r.vehicleId)}"><span class="reminder-icon">${r.level === "danger" ? "!" : "⏳"}</span><span><strong>${escapeHTML(r.title)}</strong><small>${escapeHTML(r.detail)}</small></span><span class="reminder-action">View</span></button>`).join("");
}
function renderStats() {
  $("totalVehicles").textContent = vehicles.length;
  $("totalCars").textContent = vehicles.filter(v => v.type === "Car").length;
  $("totalVans").textContent = vehicles.filter(v => v.type === "Van").length;
  $("totalBikes").textContent = vehicles.filter(v => v.type === "Bike").length;
}
function renderVehicleList() {
  const list = $("vehicleList");
  if (!vehicles.length) { list.innerHTML = `<div class="empty-state">No vehicles added yet. Select “Add Vehicle” to get started.</div>`; return; }
  list.innerHTML = vehicles.map(v => {
    const reminders = getReminders().filter(r => r.vehicleId === v.id);
    return `<div class="vehicle-card ${v.id === selectedVehicleId ? "selected" : ""}" data-select-vehicle="${escapeHTML(v.id)}" tabindex="0" role="button" aria-label="Select ${escapeHTML(v.registration)}"><div class="vehicle-card-top"><span class="vehicle-type">${escapeHTML(v.type)}</span>${reminders.length ? `<span class="mini-alert ${reminders.some(r=>r.level==='danger')?'danger':'warning'}">${reminders.length} alert(s)</span>` : `<span class="mini-alert okay">Up to date</span>`}</div><h3>${escapeHTML(v.registration)}</h3><p>${escapeHTML([v.brand,v.model].filter(Boolean).join(" ") || "Vehicle details not provided")}</p><small>Current mileage: ${Number(v.currentMileage || 0).toLocaleString()} km</small><div class="vehicle-card-actions"><button class="btn small" type="button" data-edit-vehicle="${escapeHTML(v.id)}">Edit details</button></div></div>`;
  }).join("");
}
function renderServices() {
  const body = $("serviceTable");
  const records = services.filter(s => s.vehicleId === selectedVehicleId).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  body.innerHTML = records.length ? records.map(s => `<tr><td>${escapeHTML(s.date)}</td><td>${Number(s.mileage||0).toLocaleString()} km</td><td>${Number(s.nextMileage||0).toLocaleString()} km</td><td>${escapeHTML(s.notes || "—")}</td><td><button class="btn small" type="button" data-edit-service="${escapeHTML(s.id)}">Edit</button> <button class="btn small danger" type="button" data-delete-service="${escapeHTML(s.id)}">Delete</button></td></tr>`).join("") : `<tr><td colspan="5" class="table-empty">No service records for this vehicle.</td></tr>`;
}
function renderCompliance() {
  const v = selectedVehicle();
  const box = $("complianceStatus");
  if (!v) { box.innerHTML = `<p class="helper-text">Select a vehicle to view or update compliance details.</p>`; return; }
  const fields = [["licenceExpiry","Revenue licence expiry"],["insuranceExpiry","Insurance expiry"],["revenueDate","Insurance revenue date"],["licenceFrom","Licence valid from"],["ecoIssue","ECO test issue date"]];
  box.innerHTML = fields.map(([key,label]) => {
    const alert = key === "licenceExpiry" || key === "insuranceExpiry" ? dateStatus(v[key],label,v) : null;
    const cls = alert ? alert.level : (v[key] ? "okay" : "missing");
    const text = v[key] ? escapeHTML(v[key]) : "Not set";
    return `<div class="compliance-item ${cls}"><span>${escapeHTML(label)}</span><strong>${text}</strong>${alert ? `<small>${escapeHTML(alert.title)}</small>` : ""}</div>`;
  }).join("");
}
function renderAll() {
  renderStats(); renderVehicleList(); renderReminders();
  const v = selectedVehicle();
  $("selectedVehicleLabel").textContent = v ? `${v.registration}${v.brand ? " — " + v.brand : ""}${v.model ? " " + v.model : ""}` : "Select a vehicle above.";
  if (v) {
    ["licenceFrom", "licenceExpiry", "ecoIssue", "revenueDate", "insuranceExpiry"].forEach(key => { $(key).value = v[key] || ""; });
  } else {
    ["licenceFrom", "licenceExpiry", "ecoIssue", "revenueDate", "insuranceExpiry"].forEach(key => { $(key).value = ""; });
  }
  ["serviceForm","complianceForm"].forEach(id => { const form=$(id); if(form) form.querySelectorAll("input,textarea,button").forEach(el => el.disabled = !v && id === "serviceForm"); });
  $("deleteVehicleBtn").disabled = !v;
  renderServices(); renderCompliance();
}
function clearVehicleForm() {
  $("vehicleForm").reset(); $("vehicleId").value = ""; $("vehicleFormTitle").textContent = "Add Vehicle";
}
function fillVehicleForm(v) {
  $("vehicleId").value = v.id; $("vehicleType").value = v.type || ""; $("registration").value = v.registration || "";
  $("vehicleName").value = v.brand || ""; $("vehicleModel").value = v.model || ""; $("currentMileage").value = v.currentMileage ?? "";
  $("vehicleFormTitle").textContent = `Edit Vehicle — ${v.registration}`;
  $("vehicleFormPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
function clearServiceForm() { $("serviceForm").reset(); $("serviceId").value = ""; }

$("vehicleForm").addEventListener("submit", e => {
  e.preventDefault();
  const id = $("vehicleId").value;
  const registration = $("registration").value.trim().toUpperCase();
  if (vehicles.some(v => v.registration.toLowerCase() === registration.toLowerCase() && v.id !== id)) { alert("That registration number is already in the system."); return; }
  const data = {type:$("vehicleType").value,registration,brand:$("vehicleName").value.trim(),model:$("vehicleModel").value.trim(),currentMileage:$("currentMileage").value === "" ? "" : Number($("currentMileage").value)};
  if (id) Object.assign(vehicles.find(v=>v.id===id),data);
  else { const v={id:makeId(),...data,licenceFrom:"",licenceExpiry:"",ecoIssue:"",revenueDate:"",insuranceExpiry:""}; vehicles.push(v); selectedVehicleId=v.id; }
  saveLocal(); clearVehicleForm(); renderAll();
});
$("addVehicleBtn").addEventListener("click", () => { clearVehicleForm(); $("vehicleFormPanel").scrollIntoView({behavior:"smooth",block:"start"}); $("vehicleType").focus(); });
$("cancelVehicleBtn").addEventListener("click", clearVehicleForm);
$("vehicleList").addEventListener("click", e => {
  const edit=e.target.closest("[data-edit-vehicle]");
  if (edit) { e.stopPropagation(); const v=vehicles.find(x=>x.id===edit.dataset.editVehicle); if(v) fillVehicleForm(v); return; }
  const card=e.target.closest("[data-select-vehicle]"); if(!card) return;
  selectedVehicleId=card.dataset.selectVehicle; renderAll();
});
$("reminderList").addEventListener("click", e => {
  const item=e.target.closest("[data-open-vehicle]"); if(!item) return;
  selectedVehicleId=item.dataset.openVehicle; renderAll(); $("recordsPanel").scrollIntoView({behavior:"smooth",block:"start"});
});
$("serviceForm").addEventListener("submit", e => {
  e.preventDefault(); if(!selectedVehicle()) { alert("Select a vehicle first."); return; }
  const id=$("serviceId").value;
  const mileage=Number($("serviceMileage").value), nextMileage=Number($("nextServiceMileage").value);
  if(nextMileage < mileage) { alert("Next service mileage should be equal to or greater than the service mileage."); return; }
  const data={vehicleId:selectedVehicleId,date:$("serviceDate").value,mileage,nextMileage,notes:$("serviceNotes").value.trim()};
  if(id) Object.assign(services.find(s=>s.id===id),data); else services.push({id:makeId(),...data});
  const v=selectedVehicle(); if(v && (v.currentMileage === "" || v.currentMileage == null || Number(v.currentMileage)<mileage)) v.currentMileage=mileage;
  saveLocal(); clearServiceForm(); renderAll();
});
$("cancelServiceBtn").addEventListener("click", clearServiceForm);
$("serviceTable").addEventListener("click", e => {
  const edit=e.target.closest("[data-edit-service]"); const del=e.target.closest("[data-delete-service]");
  if(edit) { const s=services.find(x=>x.id===edit.dataset.editService); if(!s)return; $("serviceId").value=s.id; $("serviceDate").value=s.date||""; $("serviceMileage").value=s.mileage??""; $("nextServiceMileage").value=s.nextMileage??""; $("serviceNotes").value=s.notes||""; $("serviceForm").scrollIntoView({behavior:"smooth",block:"center"}); }
  if(del) { const s=services.find(x=>x.id===del.dataset.deleteService); if(s && confirm("Delete this service record?")) { services=services.filter(x=>x.id!==s.id); saveLocal(); renderAll(); } }
});
$("complianceForm").addEventListener("submit", e => {
  e.preventDefault(); const v=selectedVehicle(); if(!v) { alert("Select a vehicle first."); return; }
  Object.assign(v,{licenceFrom:$("licenceFrom").value,licenceExpiry:$("licenceExpiry").value,ecoIssue:$("ecoIssue").value,revenueDate:$("revenueDate").value,insuranceExpiry:$("insuranceExpiry").value});
  saveLocal("Compliance dates updated."); renderAll();
});
$("deleteVehicleBtn").addEventListener("click", () => {
  const v=selectedVehicle(); if(!v) return;
  if(!confirm(`Remove ${v.registration} and all its service records? This cannot be undone.`)) return;
  vehicles=vehicles.filter(x=>x.id!==v.id); services=services.filter(s=>s.vehicleId!==v.id); selectedVehicleId=""; clearVehicleForm(); clearServiceForm(); saveLocal("Vehicle and related service records removed."); renderAll();
});
// Keep the original JSON backup feature available.
$("exportBtn").addEventListener("click", () => {
  const backup={app:"Vehicle Management System",version:2,exportedAt:new Date().toISOString(),vehicles,services};
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=`Vehicle_Backup_${todayISO()}.json`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  const msg=$("message"); if(msg) msg.textContent="JSON backup downloaded.";
});

function printVehicleDetails() {
  const v=selectedVehicle();
  if(!v) { alert("Please select a vehicle to print."); return; }
  const vehicleServices=services.filter(s=>s.vehicleId===v.id).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const fields=[
    ["Vehicle Type",v.type], ["Registration Number",v.registration], ["Brand",v.brand], ["Model",v.model],
    ["Current Mileage",v.currentMileage === "" || v.currentMileage == null ? "Not set" : `${Number(v.currentMileage).toLocaleString()} km`],
    ["Licence Valid From",v.licenceFrom], ["Revenue Licence Expiry",v.licenceExpiry], ["ECO Test Issue Date",v.ecoIssue],
    ["Insurance Revenue Date",v.revenueDate], ["Insurance Expiry",v.insuranceExpiry]
  ];
  const detailRows=fields.map(([label,value])=>`<tr><th>${escapeHTML(label)}</th><td>${escapeHTML(value || "Not set")}</td></tr>`).join("");
  const serviceRows=vehicleServices.length ? vehicleServices.map(s=>`<tr><td>${escapeHTML(s.date)}</td><td>${Number(s.mileage||0).toLocaleString()} km</td><td>${Number(s.nextMileage||0).toLocaleString()} km</td><td>${escapeHTML(s.notes||"—")}</td></tr>`).join("") : '<tr><td colspan="4">No service records</td></tr>';
  const win=window.open("","_blank","width=900,height=700");
  if(!win) { alert("Please allow pop-ups to print vehicle details."); return; }
  win.document.write(`<!doctype html><html><head><title>Vehicle Details - ${escapeHTML(v.registration)}</title><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#222;padding:28px}h1{margin-bottom:4px;color:#183b65}p{color:#555}.meta{margin:20px 0}table{border-collapse:collapse;width:100%;margin:12px 0 26px}th,td{border:1px solid #ccd3dc;padding:9px;text-align:left;font-size:13px}th{background:#edf2f8;width:32%}h2{margin-top:28px;color:#183b65}.footer{margin-top:30px;font-size:11px;color:#666}@media print{button{display:none}body{padding:0}}</style></head><body><h1>Vehicle Management System</h1><p>Vehicle Details Report</p><div class="meta"><strong>Registration:</strong> ${escapeHTML(v.registration)} &nbsp; <strong>Printed:</strong> ${todayISO()}</div><h2>Vehicle & Compliance Details</h2><table>${detailRows}</table><h2>Service & Maintenance History</h2><table><thead><tr><th>Date</th><th>Mileage at Service</th><th>Next Service Mileage</th><th>Notes</th></tr></thead><tbody>${serviceRows}</tbody></table><p class="footer">Generated by Vehicle Management System.</p><script>window.onload=()=>{window.print();};<\/script></body></html>`);
  win.document.close();
}
$("printBtn").addEventListener("click", printVehicleDetails);

function exportExcel() {
  if(typeof XLSX === "undefined") { alert("Excel support could not load. Check your internet connection and reload the page."); return; }
  const vehicleRows=vehicles.map(v=>({
    "Vehicle ID":v.id,"Vehicle Type":v.type,"Registration Number":v.registration,"Brand":v.brand,"Model":v.model,
    "Current Mileage (km)":v.currentMileage,"Licence Valid From":v.licenceFrom,"Revenue Licence Expiry":v.licenceExpiry,
    "ECO Test Issue Date":v.ecoIssue,"Insurance Revenue Date":v.revenueDate,"Insurance Expiry":v.insuranceExpiry
  }));
  const serviceRows=services.map(s=>({"Service ID":s.id,"Vehicle ID":s.vehicleId,"Registration Number":vehicles.find(v=>v.id===s.vehicleId)?.registration||"",
    "Service Date":s.date,"Mileage at Service (km)":s.mileage,"Next Service Mileage (km)":s.nextMileage,"Notes":s.notes}));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(vehicleRows),"Vehicles");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(serviceRows),"Services");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{Application:"Vehicle Management System",ExportedAt:new Date().toISOString(),BackupNote:"Keep this workbook as a backup. Import using Load Excel Backup."}]),"Backup Info");
  XLSX.writeFile(wb,`Vehicle_Backup_${todayISO()}.xlsx`);
  if($("message")) $("message").textContent="Excel backup downloaded with Vehicles and Services sheets.";
}
$("exportExcelBtn").addEventListener("click",exportExcel);
$("importExcelBtn").addEventListener("click",()=>$("importExcelFile").click());
$("importExcelFile").addEventListener("change",e=>{
  const file=e.target.files?.[0]; if(!file) return;
  if(typeof XLSX === "undefined") { alert("Excel support could not load. Check your internet connection and reload the page."); e.target.value=""; return; }
  if(!confirm("Loading an Excel backup will replace the vehicle and service records currently in this browser. Export a backup first if needed. Continue?")) { e.target.value=""; return; }
  const reader=new FileReader();
  reader.onload=event=>{
    try {
      const wb=XLSX.read(event.target.result,{type:"array",cellDates:false});
      const vs=wb.Sheets["Vehicles"], ss=wb.Sheets["Services"];
      if(!vs || !ss) throw new Error('The workbook must contain "Vehicles" and "Services" sheets.');
      const vrows=XLSX.utils.sheet_to_json(vs,{defval:""});
      const srows=XLSX.utils.sheet_to_json(ss,{defval:""});
      const importedVehicles=vrows.map(r=>({
        id:String(r["Vehicle ID"]||makeId()),type:String(r["Vehicle Type"]||""),registration:String(r["Registration Number"]||"").trim().toUpperCase(),
        brand:String(r["Brand"]||""),model:String(r["Model"]||""),currentMileage:r["Current Mileage (km)"]===""?"":Number(r["Current Mileage (km)"]||0),
        licenceFrom:excelDate(r["Licence Valid From"]),licenceExpiry:excelDate(r["Revenue Licence Expiry"]),ecoIssue:excelDate(r["ECO Test Issue Date"]),
        revenueDate:excelDate(r["Insurance Revenue Date"]),insuranceExpiry:excelDate(r["Insurance Expiry"])
      })).filter(v=>v.registration);
      const validIds=new Set(importedVehicles.map(v=>v.id));
      const registrationToId=new Map(importedVehicles.map(v=>[v.registration,v.id]));
      const importedServices=srows.map(r=>{
        const vehicleId=String(r["Vehicle ID"]||registrationToId.get(String(r["Registration Number"]||"").trim().toUpperCase())||"");
        return {id:String(r["Service ID"]||makeId()),vehicleId,date:excelDate(r["Service Date"]),mileage:Number(r["Mileage at Service (km)"]||0),nextMileage:Number(r["Next Service Mileage (km)"]||0),notes:String(r["Notes"]||"")};
      }).filter(s=>validIds.has(s.vehicleId)&&s.date);
      if(!importedVehicles.length) throw new Error("No valid vehicle rows were found in the Vehicles sheet.");
      vehicles=importedVehicles; services=importedServices; selectedVehicleId=vehicles[0]?.id||"";
      clearVehicleForm(); clearServiceForm(); saveLocal(`Excel backup loaded: ${vehicles.length} vehicle(s) and ${services.length} service record(s).`); renderAll();
      alert(`Excel backup loaded successfully.\nVehicles: ${vehicles.length}\nService records: ${services.length}`);
    } catch(err) { alert("Could not load Excel backup: "+err.message); }
    finally { e.target.value=""; }
  };
  reader.onerror=()=>{alert("Could not read this Excel file.");e.target.value="";};
  reader.readAsArrayBuffer(file);
});
function excelDate(value) {
  if(value === null || value === undefined || value === "") return "";
  if(typeof value === "number" && typeof XLSX !== "undefined") {
    const parsed=XLSX.SSF.parse_date_code(value);
    if(parsed) return `${parsed.y}-${String(parsed.m).padStart(2,"0")}-${String(parsed.d).padStart(2,"0")}`;
  }
  const text=String(value).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match=text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if(match) return `${match[3]}-${String(match[2]).padStart(2,"0")}-${String(match[1]).padStart(2,"0")}`;
  return text;
}
// Double-clicking a vehicle card opens its editable vehicle details; this avoids crowding each card with controls.
loadLocal(); renderAll();
