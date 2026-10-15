/* =========================================================
   AC REPAIR RECORDS - CLEAN JAVASCRIPT
   Excel columns:
   Branch, Date, Asset Code, Description, Amount, Floor,
   Company, Repair Person
========================================================= */

"use strict";

const EXCEL_HEADERS = [
    "Branch",
    "Date",
    "Asset Code",
    "Description",
    "Amount",
    "Floor",
    "Company",
    "Repair Person"
];

let records = [];
let filteredRecords = [];
let editIndex = -1;
let currentWorkbook = null;
let currentFileHandle = null;
let currentFileName = "";

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
    $("date").value = todayString();

    $("openFileButton").addEventListener("click", openExcelFile);
    $("saveFileButton").addEventListener("click", saveExcelFile);
    $("repairForm").addEventListener("submit", handleFormSubmit);
    $("clearButton").addEventListener("click", clearForm);
    $("resetFiltersButton").addEventListener("click", resetFilters);
    $("exportButton").addEventListener("click", exportFilteredExcel);
    $("printButton").addEventListener("click", printReport);

    ["branchFilter", "companyFilter", "repairPersonFilter", "fromDate", "toDate"]
        .forEach(id => $(id).addEventListener("change", applyFilters));

    displayRecords();
});

function todayString() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function showStatus(message, type = "success") {
    const status = $("status");
    status.textContent = message;
    status.className = `status ${type}`;
}

async function openExcelFile() {
    try {
        if ("showOpenFilePicker" in window) {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: "Excel Files",
                    accept: {
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
                        "application/vnd.ms-excel": [".xls"]
                    }
                }],
                multiple: false
            });

            currentFileHandle = handle;
            const file = await handle.getFile();
            await readExcelFile(file);
        } else {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".xlsx,.xls";
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (file) await readExcelFile(file);
            };
            input.click();
        }
    } catch (error) {
        if (error && error.name !== "AbortError") {
            console.error(error);
            showStatus("Could not open the Excel file.", "error");
        }
    }
}

async function readExcelFile(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();

        currentWorkbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
        const sheetName = currentWorkbook.SheetNames[0];
        const worksheet = currentWorkbook.Sheets[sheetName];

        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
            raw: true
        });

        if (!rawRows.length) {
            records = [];
        } else {
            const headerRow = rawRows[0].map(value => String(value).trim());
            validateHeaders(headerRow);

            records = rawRows
                .slice(1)
                .filter(row => row.some(value => String(value ?? "").trim() !== ""))
                .filter(row => !looksLikeRepeatedHeader(row))
                .map(rowToRecord);
        }

        currentFileName = file.name;
        $("fileName").textContent = `📗 ${file.name}`;
        $("fileMessage").textContent = `${records.length} record(s) loaded from Excel.`;
        $("saveFileButton").disabled = false;

        populateFilters();
        displayRecords();
        showStatus("Excel file loaded successfully.", "success");
    } catch (error) {
        console.error(error);
        showStatus(`Could not read the Excel file: ${error.message}`, "error");
    }
}

function validateHeaders(headers) {
    const requiredOld = ["Branch", "Date", "Asset Code", "Description", "Amount", "Floor"];

    for (const header of requiredOld) {
        if (!headers.includes(header)) {
            throw new Error(`Missing required column: ${header}`);
        }
    }

    // Company and Repair Person are new optional columns when opening older workbooks.
    // The app will add them when the workbook is saved.
}

function looksLikeRepeatedHeader(row) {
    const values = row.map(v => String(v ?? "").trim().toLowerCase());
    return values[0] === "branch" && values[1] === "date" && values[2] === "asset code";
}

function rowToRecord(row) {
    return {
        Branch: clean(row[0]),
        Date: normalizeExcelDate(row[1]),
        "Asset Code": clean(row[2]),
        Description: clean(row[3]),
        Amount: parseAmount(row[4]),
        Floor: clean(row[5]),
        Company: clean(row[6]),
        "Repair Person": clean(row[7])
    };
}

function clean(value) {
    return String(value ?? "").trim();
}

function parseAmount(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const cleaned = String(value ?? "").replace(/,/g, "").trim();
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : 0;
}

function normalizeExcelDate(value) {
    if (value instanceof Date && !isNaN(value)) {
        return formatDate(value);
    }

    if (typeof value === "number") {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed) {
            return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
        }
    }

    const text = String(value ?? "").trim();
    if (!text) return "";

    const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, "0")}-${String(isoMatch[3]).padStart(2, "0")}`;
    }

    const parsed = new Date(text);
    if (!isNaN(parsed)) return formatDate(parsed);

    return text;
}

function formatDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d)) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function populateFilters() {
    fillSelect($("branchFilter"), uniqueValues("Branch"), "All Branches");
    fillSelect($("companyFilter"), uniqueValues("Company"), "All Companies");
    fillSelect($("repairPersonFilter"), uniqueValues("Repair Person"), "All Repair Persons");
}

function uniqueValues(field) {
    return [...new Set(records.map(record => record[field]).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
}

function fillSelect(select, values, firstLabel) {
    const current = select.value;
    select.innerHTML = `<option value="">${escapeHTML(firstLabel)}</option>`;

    values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });

    if (values.includes(current)) select.value = current;
}

function applyFilters() {
    const branch = $("branchFilter").value;
    const company = $("companyFilter").value;
    const repairPerson = $("repairPersonFilter").value;
    const fromDate = $("fromDate").value;
    const toDate = $("toDate").value;

    filteredRecords = records.filter(record => {
        if (branch && record.Branch !== branch) return false;
        if (company && record.Company !== company) return false;
        if (repairPerson && record["Repair Person"] !== repairPerson) return false;
        if (fromDate && record.Date < fromDate) return false;
        if (toDate && record.Date > toDate) return false;
        return true;
    });

    renderTable();
    updateSummary();
}

function resetFilters() {
    $("branchFilter").value = "";
    $("companyFilter").value = "";
    $("repairPersonFilter").value = "";
    $("fromDate").value = "";
    $("toDate").value = "";
    applyFilters();
}

function displayRecords() {
    filteredRecords = [...records];
    renderTable();
    updateSummary();
}

function renderTable() {
    const body = $("recordsBody");

    if (!filteredRecords.length) {
        body.innerHTML = `<tr><td colspan="10" class="empty-state">No records found.</td></tr>`;
        return;
    }

    body.innerHTML = filteredRecords.map((record, filteredIndex) => {
        const originalIndex = records.indexOf(record);

        return `
            <tr>
                <td>${filteredIndex + 1}</td>
                <td>${escapeHTML(record.Branch)}</td>
                <td>${escapeHTML(formatDisplayDate(record.Date))}</td>
                <td>${escapeHTML(record["Asset Code"])}</td>
                <td>${escapeHTML(record.Description)}</td>
                <td>${formatAmount(record.Amount)}</td>
                <td>${escapeHTML(record.Floor)}</td>
                <td>${escapeHTML(record.Company)}</td>
                <td>${escapeHTML(record["Repair Person"])}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" type="button" onclick="editRecord(${originalIndex})">Edit</button>
                        <button class="btn-delete" type="button" onclick="deleteRecord(${originalIndex})">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function handleFormSubmit(event) {
    event.preventDefault();

    const record = {
        Branch: $("branch").value.trim(),
        Date: $("date").value,
        "Asset Code": $("assetCode").value.trim(),
        Description: $("description").value.trim(),
        Amount: parseAmount($("amount").value),
        Floor: $("floor").value.trim(),
        Company: $("company").value.trim(),
        "Repair Person": $("repairPerson").value.trim()
    };

    if (!record.Branch || !record.Date || !record["Asset Code"] || !record.Description) {
        showStatus("Please complete all required fields.", "error");
        return;
    }

    if (record.Amount < 0) {
        showStatus("Amount cannot be negative.", "error");
        return;
    }

    if (editIndex === -1) {
        records.push(record);
        showStatus("Repair record added.", "success");
    } else {
        records[editIndex] = record;
        showStatus("Repair record updated.", "success");
        editIndex = -1;
    }

    clearForm(false);
    populateFilters();
    displayRecords();
    $("saveFileButton").disabled = false;
}

function editRecord(index) {
    const record = records[index];
    if (!record) return;

    editIndex = index;
    $("formTitle").textContent = "Edit AC Repair Record";
    $("submitButton").textContent = "💾 Update Record";

    $("branch").value = record.Branch;
    $("date").value = record.Date;
    $("assetCode").value = record["Asset Code"];
    $("description").value = record.Description;
    $("amount").value = record.Amount;
    $("floor").value = record.Floor;
    $("company").value = record.Company;
    $("repairPerson").value = record["Repair Person"];

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteRecord(index) {
    const record = records[index];
    if (!record) return;

    const confirmed = window.confirm(
        `Delete the record for ${record["Asset Code"] || "this asset"}?`
    );

    if (!confirmed) return;

    records.splice(index, 1);
    if (editIndex === index) clearForm();

    populateFilters();
    displayRecords();
    showStatus("Repair record deleted. Click Save Excel File to keep the change.", "success");
    $("saveFileButton").disabled = false;
}

function clearForm(resetMessage = true) {
    $("repairForm").reset();
    $("date").value = todayString();
    editIndex = -1;
    $("formTitle").textContent = "Add AC Repair Record";
    $("submitButton").textContent = "➕ Add Record";

    if (resetMessage) showStatus("Form cleared.", "success");
}

function updateSummary() {
    const total = filteredRecords.length;
    const amount = filteredRecords.reduce((sum, record) => sum + parseAmount(record.Amount), 0);
    const branches = new Set(filteredRecords.map(r => r.Branch).filter(Boolean)).size;
    const repairers = new Set(
        filteredRecords
            .flatMap(r => [r.Company, r["Repair Person"]])
            .filter(Boolean)
    ).size;

    $("totalRecords").textContent = total;
    $("totalAmount").textContent = formatAmount(amount);
    $("totalBranches").textContent = branches;
    $("totalRepairers").textContent = repairers;
}

async function saveExcelFile() {
    if (!currentWorkbook) {
        showStatus("Open an Excel file first.", "error");
        return;
    }

    try {
        const workbook = buildWorkbook();

        if (currentFileHandle) {
            const writable = await currentFileHandle.createWritable();
            const output = XLSX.write(workbook, {
                bookType: "xlsx",
                type: "array"
            });
            await writable.write(output);
            await writable.close();

            currentWorkbook = workbook;
            showStatus("Excel file updated and saved to the selected workbook.", "success");
            return;
        }

        downloadWorkbook(workbook, currentFileName || `AC_Repair_Records_${todayString()}.xlsx`);
        currentWorkbook = workbook;
        showStatus("Updated Excel file downloaded.", "success");
    } catch (error) {
        console.error(error);
        showStatus("Direct save failed. The updated workbook will be downloaded instead.", "error");
        try {
            downloadWorkbook(buildWorkbook(), currentFileName || `AC_Repair_Records_${todayString()}.xlsx`);
        } catch (downloadError) {
            console.error(downloadError);
            showStatus("Could not save the Excel file.", "error");
        }
    }
}

function buildWorkbook() {
    const rows = [
        EXCEL_HEADERS,
        ...records.map(record => [
            record.Branch,
            record.Date,
            record["Asset Code"],
            record.Description,
            parseAmount(record.Amount),
            record.Floor,
            record.Company,
            record["Repair Person"]
        ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [
        { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 30 },
        { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 24 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AC Repair Records");
    return workbook;
}

function exportFilteredExcel() {
    if (!filteredRecords.length) {
        showStatus("There are no filtered records to export.", "error");
        return;
    }

    const rows = [
        EXCEL_HEADERS,
        ...filteredRecords.map(record => [
            record.Branch,
            record.Date,
            record["Asset Code"],
            record.Description,
            parseAmount(record.Amount),
            record.Floor,
            record.Company,
            record["Repair Person"]
        ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AC Repair Records");

    const from = $("fromDate").value || "all";
    const to = $("toDate").value || "all";
    downloadWorkbook(workbook, `AC_Repair_${from}_to_${to}.xlsx`);

    showStatus("Filtered records exported to Excel.", "success");
}

function downloadWorkbook(workbook, filename) {
    XLSX.writeFile(workbook, filename);
}

function printReport() {
    const rows = filteredRecords.map(record => `
        <tr>
            <td>${escapeHTML(record.Branch)}</td>
            <td>${escapeHTML(formatDisplayDate(record.Date))}</td>
            <td>${escapeHTML(record["Asset Code"])}</td>
            <td>${escapeHTML(record.Description)}</td>
            <td>${formatAmount(record.Amount)}</td>
            <td>${escapeHTML(record.Floor)}</td>
            <td>${escapeHTML(record.Company)}</td>
            <td>${escapeHTML(record["Repair Person"])}</td>
        </tr>
    `).join("");

    const total = filteredRecords.reduce((sum, r) => sum + parseAmount(r.Amount), 0);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        showStatus("Please allow pop-ups to print the report.", "error");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>AC Repair Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
                h1 { text-align: center; margin-bottom: 4px; }
                p { text-align: center; margin-top: 0; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #bbb; padding: 8px; text-align: left; }
                th { background: #eee; }
                .total { margin-top: 16px; text-align: right; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>AC REPAIR REPORT</h1>
            <p>AC Repair & Maintenance Records</p>
            <table>
                <thead>
                    <tr>
                        <th>Branch</th>
                        <th>Date</th>
                        <th>Asset Code</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Floor</th>
                        <th>Company</th>
                        <th>Repair Person</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="total">Total Amount: ${formatAmount(total)}</div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function formatDisplayDate(date) {
    if (!date) return "";
    const parts = String(date).split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return String(date);
}

function formatAmount(amount) {
    return parseAmount(amount).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
