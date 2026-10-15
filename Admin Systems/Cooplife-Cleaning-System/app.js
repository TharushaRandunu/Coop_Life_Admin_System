/* =========================================================
   COOPLIFE INSURANCE LTD
   CLEANING ATTENDANCE SYSTEM
   VERSION 2
   ========================================================= */


const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];


let attendance = [];
let holidays = [];


/* =========================================================
   START
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    populateMonths();

    const today = new Date();

    document.getElementById("month").value =
        today.getMonth();

    document.getElementById("year").value =
        today.getFullYear();


    document.getElementById("rate")
        .addEventListener("input", updateCalculations);

    document.getElementById("workers3")
        .addEventListener("input", updateCalculations);

    document.getElementById("workers1")
        .addEventListener("input", updateCalculations);

    document.getElementById("extra")
        .addEventListener("input", updateCalculations);


    generateCalendar();

});


/* =========================================================
   MONTHS
   ========================================================= */

function populateMonths() {

    const select =
        document.getElementById("month");


    monthNames.forEach(function (month, index) {

        const option =
            document.createElement("option");

        option.value = index;
        option.textContent = month;

        select.appendChild(option);

    });

}


/* =========================================================
   DATE FUNCTIONS
   ========================================================= */

function pad(number) {

    return String(number).padStart(2, "0");

}


function dateKey(year, month, day) {

    return (
        year +
        "-" +
        pad(month + 1) +
        "-" +
        pad(day)
    );

}


function getDateObject(key) {

    return new Date(
        key + "T00:00:00"
    );

}


function isWeekend(date) {

    const day = date.getDay();

    return (
        day === 0 ||
        day === 6
    );

}


/* =========================================================
   HOLIDAY
   ========================================================= */

function getHoliday(key) {

    return holidays.find(
        function (holiday) {

            return holiday.date === key;

        }
    );

}


/* =========================================================
   FORCE ATTENDANCE TO 0 OR 1
   ========================================================= */

function cleanAttendanceValue(value) {

    return Number(value) === 1
        ? 1
        : 0;

}


/* =========================================================
   GENERATE CALENDAR
   ========================================================= */

function generateCalendar() {

    readHolidayRows();


    const month =
        Number(
            document.getElementById("month").value
        );


    const year =
        Number(
            document.getElementById("year").value
        );


    document.getElementById(
        "monthTitle"
    ).textContent =
        monthNames[month];


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    /*
       Preserve existing attendance.
    */

    const previous = {};

    attendance.forEach(function (row) {

        previous[row.date] = row;

    });


    attendance = [];


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const key =
            dateKey(
                year,
                month,
                day
            );


        const date =
            getDateObject(key);


        const weekend =
            isWeekend(date);


        const holiday =
            getHoliday(key);


        const old =
            previous[key];


        let floor3 = 0;
        let floor1 = 0;


        if (old) {

            floor3 =
                cleanAttendanceValue(
                    old.floor3
                );

            floor1 =
                cleanAttendanceValue(
                    old.floor1
                );

        }
        else if (
            !weekend &&
            !holiday
        ) {

            /*
               Normal working day starts as 1.
            */

            floor3 = 1;
            floor1 = 1;

        }
        else {

            /*
               Weekend / holiday starts as 0,
               BUT USER CAN CHANGE IT TO 1.
            */

            floor3 = 0;
            floor1 = 0;

        }


        attendance.push({

            date: key,

            floor3: floor3,

            floor1: floor1,

            note: old
                ? old.note || ""
                : ""

        });

    }


    renderHolidayRows();

    renderAttendance();

    updateCalculations();

}


/* =========================================================
   RENDER ATTENDANCE
   ========================================================= */

function renderAttendance() {

    const tbody =
        document.getElementById(
            "attendanceBody"
        );


    tbody.innerHTML = "";


    attendance.forEach(function (row, index) {

        const date =
            getDateObject(row.date);


        const weekend =
            isWeekend(date);


        const holiday =
            getHoliday(row.date);


        const tr =
            document.createElement("tr");


        if (weekend) {

            tr.className =
                "weekend-row";

        }


        if (holiday) {

            tr.classList.add(
                "holiday-row-table"
            );

        }


        /* ================= DATE ================= */

        const dateCell =
            document.createElement("td");


        dateCell.className =
            "date-cell";


        let dateText =
            date.toLocaleDateString(
                "en-GB",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );


        if (weekend) {

            const dayName =
                date.toLocaleDateString(
                    "en-US",
                    {
                        weekday: "short"
                    }
                );


            dateText =
                dayName +
                " " +
                dateText;

        }


        if (holiday) {

            dateText =
                holiday.name +
                " " +
                dateText;

        }


        dateCell.textContent =
            dateText;


        tr.appendChild(dateCell);


        /* ================= 03RD FLOOR ================= */

        const floor3Cell =
            document.createElement("td");


        const floor3Input =
            createAttendanceInput(
                row.floor3,
                index,
                "floor3"
            );


        floor3Cell.appendChild(
            floor3Input
        );


        tr.appendChild(
            floor3Cell
        );


        /* ================= 01ST FLOOR ================= */

        const floor1Cell =
            document.createElement("td");


        const floor1Input =
            createAttendanceInput(
                row.floor1,
                index,
                "floor1"
            );


        floor1Cell.appendChild(
            floor1Input
        );


        tr.appendChild(
            floor1Cell
        );


        /* ================= TOTAL ================= */

        const totalCell =
            document.createElement("td");


        totalCell.className =
            "total-cell";


        /*
           IMPORTANT:
           Weekend/holiday is NOT automatically "-".
           If the user enters 1, it becomes 2.
        */

        const total =
            cleanAttendanceValue(row.floor3) +
            cleanAttendanceValue(row.floor1);


        totalCell.textContent =
            total;


        tr.appendChild(totalCell);


        tbody.appendChild(tr);

    });

}


/* =========================================================
   CREATE 0 / 1 INPUT
   ========================================================= */

function createAttendanceInput(
    value,
    index,
    field
) {

    const input =
        document.createElement("input");


    input.type =
        "number";


    input.min =
        "0";


    input.max =
        "1";


    input.step =
        "1";


    input.value =
        cleanAttendanceValue(value);


    input.className =
        "attendance-input";


    /*
       ALL DAYS ARE EDITABLE.
       This includes:
       - Monday-Friday
       - Saturday
       - Sunday
       - Public Holiday
    */


    input.addEventListener(
        "change",
        function () {

            let newValue =
                Number(this.value);


            /*
               Only 0 or 1 allowed.
            */

            if (newValue !== 1) {

                newValue = 0;

            }


            this.value =
                newValue;


            attendance[index][field] =
                newValue;


            renderAttendance();

            updateCalculations();

        }
    );


    /*
       Also handle typing.
    */

    input.addEventListener(
        "input",
        function () {

            if (
                this.value !== "0" &&
                this.value !== "1"
            ) {

                this.value =
                    this.value
                    .replace(
                        /[^01]/g,
                        ""
                    );

            }

        }
    );


    return input;

}


/* =========================================================
   HOLIDAY MANAGEMENT
   ========================================================= */

function addHolidayRow(
    date = "",
    name = ""
) {

    const container =
        document.getElementById(
            "holidayRows"
        );


    const row =
        document.createElement("div");


    row.className =
        "holiday-row";


    row.innerHTML = `

        <input
            type="date"
            class="holiday-date"
            value="${date}"
        >

        <input
            type="text"
            class="holiday-name"
            placeholder="Holiday name"
            value="${escapeHtml(name)}"
        >

        <button
            type="button"
            onclick="removeHolidayRow(this)"
        >
            Remove
        </button>

    `;


    container.appendChild(row);


    row.querySelector(
        ".holiday-date"
    ).addEventListener(
        "change",
        holidayChanged
    );


    row.querySelector(
        ".holiday-name"
    ).addEventListener(
        "input",
        holidayChanged
    );

}


function removeHolidayRow(button) {

    button.parentElement.remove();

    readHolidayRows();

    generateCalendar();

}


function readHolidayRows() {

    holidays = [];


    document
        .querySelectorAll(".holiday-row")
        .forEach(function (row) {

            const date =
                row.querySelector(
                    ".holiday-date"
                ).value;


            const name =
                row.querySelector(
                    ".holiday-name"
                ).value.trim();


            if (date) {

                holidays.push({

                    date: date,

                    name:
                        name ||
                        "Public Holiday"

                });

            }

        });

}


function holidayChanged() {

    readHolidayRows();

    /*
       When a date becomes a holiday,
       automatically set attendance to 0.
    */

    attendance =
        attendance.map(function (row) {

            const holiday =
                getHoliday(row.date);

            if (holiday) {

                row.floor3 = 0;
                row.floor1 = 0;

            }

            return row;

        });


    generateCalendar();

    renderAttendance();

    updateCalculations();

}



function renderHolidayRows() {

    const container =
        document.getElementById(
            "holidayRows"
        );


    container.innerHTML = "";


    holidays.forEach(function (holiday) {

        addHolidayRow(
            holiday.date,
            holiday.name
        );

    });

}


function updateCalculations() {

    readHolidayRows();


    let workingDays = 0;

    let floor3Total = 0;

    let floor1Total = 0;


    attendance.forEach(function (row) {

        const date =
            getDateObject(row.date);


        const holiday =
            getHoliday(row.date);


        /*
           Working days = normal Monday-Friday
           dates, regardless of whether attendance
           is 0 or 1.
        */

        if (
            !isWeekend(date) &&
            !holiday
        ) {

            workingDays++;

        }


        /*
           PAYMENT IS BASED ON ACTUAL 0/1
           ATTENDANCE.

           A holiday/Saturday/Sunday marked as 1
           is included in the attendance total.
        */

        floor3Total +=
            cleanAttendanceValue(
                row.floor3
            );


        floor1Total +=
            cleanAttendanceValue(
                row.floor1
            );

    });


    const rate =
        Number(
            document.getElementById(
                "rate"
            ).value || 0
        );


    const extra =
        Number(
            document.getElementById(
                "extra"
            ).value || 0
        );


    /*
       Actual worker-days
    */

    const totalWorkerDays =
        floor3Total +
        floor1Total;


    /*
       PAYMENT RULE

       20 days or less = Rs.100,000
       21 days or more = Rs.103,000

       paymentDays uses the attendance days
       of the worker with the higher attendance.
    */

    const paymentDays =
        Math.max(
            floor3Total,
            floor1Total
        );


    const monthlyPayment =
        paymentDays >= 21
            ? 103000
            : 100000;


    /*
       Extra amount is added separately.
    */

    const grandTotal =
        monthlyPayment +
        extra;


    /*
       Number of workers
    */

    const workers =
        2;



    /* ================= DISPLAY ================= */

    document.getElementById(
        "paymentRate"
    ).textContent =
        formatNumber(rate);


    document.getElementById(
        "paymentDays"
    ).textContent =
        paymentDays;


    document.getElementById(
        "paymentWorkers"
    ).textContent =
        workers;


    document.getElementById(
        "paymentTotal"
    ).textContent =
        formatNumber(monthlyPayment);


    document.getElementById(
        "totalWorkingDays"
    ).textContent =
        workingDays;


    document.getElementById(
        "extraPayment"
    ).textContent =
        extra > 0
            ? formatNumber(extra)
            : "-";


    document.getElementById(
        "monthlyPayment"
    ).textContent =
        formatNumber(monthlyPayment);


    document.getElementById(
        "extraPaymentBottom"
    ).textContent =
        extra > 0
            ? formatNumber(extra)
            : "-";


    document.getElementById(
        "grandTotal"
    ).textContent =
        formatNumber(grandTotal);

}


/* =========================================================
   FORMAT
   ========================================================= */

function formatNumber(number) {

    return Number(number || 0)
        .toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

}


/* =========================================================
   SAVE
   ========================================================= */

function saveMonth() {

    readHolidayRows();


    const month =
        Number(
            document.getElementById(
                "month"
            ).value
        );


    const year =
        Number(
            document.getElementById(
                "year"
            ).value
        );


    const data = {

        month: month,

        year: year,

        rate:
            document.getElementById(
                "rate"
            ).value,

        workers3:
            document.getElementById(
                "workers3"
            ).value,

        workers1:
            document.getElementById(
                "workers1"
            ).value,

        extra:
            document.getElementById(
                "extra"
            ).value,

        holidays:
            holidays,

        attendance:
            attendance

    };


    const key =
        "cooplife_" +
        year +
        "_" +
        pad(month + 1);


    localStorage.setItem(
        key,
        JSON.stringify(data)
    );


    alert(
        "Month saved successfully."
    );

}


/* =========================================================
   LOAD
   ========================================================= */

function loadMonth() {

    const month =
        Number(
            document.getElementById(
                "month"
            ).value
        );


    const year =
        Number(
            document.getElementById(
                "year"
            ).value
        );


    const key =
        "cooplife_" +
        year +
        "_" +
        pad(month + 1);


    const saved =
        localStorage.getItem(key);


    if (!saved) {

        alert(
            "No saved record found for this month."
        );

        return;

    }


    const data =
        JSON.parse(saved);


    document.getElementById(
        "rate"
    ).value =
        data.rate;


    document.getElementById(
        "workers3"
    ).value =
        data.workers3;


    document.getElementById(
        "workers1"
    ).value =
        data.workers1;


    document.getElementById(
        "extra"
    ).value =
        data.extra;


    holidays =
        data.holidays || [];


    attendance =
        data.attendance || [];


    /*
       Clean old records so they can only
       contain 0 or 1.
    */

    attendance =
        attendance.map(function (row) {

            return {

                date: row.date,

                floor3:
                    cleanAttendanceValue(
                        row.floor3
                    ),

                floor1:
                    cleanAttendanceValue(
                        row.floor1
                    ),

                note:
                    row.note || ""

            };

        });


    renderHolidayRows();

    renderAttendance();

    updateCalculations();


    alert(
        "Saved month loaded successfully."
    );

}


/* =========================================================
   EXCEL EXPORT
   ========================================================= */

function exportExcel() {

    if (
        typeof XLSX ===
        "undefined"
    ) {

        alert(
            "Excel library is not available. Please connect to the internet and reload the page."
        );

        return;

    }


    readHolidayRows();


    const month =
        Number(
            document.getElementById(
                "month"
            ).value
        );


    const year =
        Number(
            document.getElementById(
                "year"
            ).value
        );


    const rate =
        Number(
            document.getElementById(
                "rate"
            ).value || 0
        );


    const extra =
        Number(
            document.getElementById(
                "extra"
            ).value || 0
        );


    let workingDays = 0;

    let floor3Total = 0;

    let floor1Total = 0;


    attendance.forEach(function (row) {

        const date =
            getDateObject(row.date);


        const holiday =
            getHoliday(row.date);


        if (
            !isWeekend(date) &&
            !holiday
        ) {

            workingDays++;

        }


        floor3Total +=
            cleanAttendanceValue(
                row.floor3
            );


        floor1Total +=
            cleanAttendanceValue(
                row.floor1
            );

    });


    const totalWorkerDays =
        floor3Total +
        floor1Total;


    const monthlyPayment =
        totalWorkerDays *
        rate;


    const grandTotal =
        monthlyPayment +
        extra;


    const paymentDays =
        Math.max(
            floor3Total,
            floor1Total
        );


    /* =====================================================
       EXACT EXCEL STRUCTURE
       ===================================================== */

    const rows = [];


    rows.push([
        "Cooplife Insurance Ltd"
    ]);


    rows.push([
        "Cleaning Days",
        "",
        "Month of " +
        monthNames[month]
    ]);


    rows.push([
        "Date",
        "03rd Floor",
        "01st Floor",
        "Total days"
    ]);


    /*
       ATTENDANCE ROWS
    */

    attendance.forEach(function (row) {

        const date =
            getDateObject(row.date);


        const holiday =
            getHoliday(row.date);


        let dateText =
            date.toLocaleDateString(
                "en-GB",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );


        if (isWeekend(date)) {

            const dayName =
                date.toLocaleDateString(
                    "en-US",
                    {
                        weekday: "short"
                    }
                );


            dateText =
                dayName +
                " " +
                dateText;

        }


        if (holiday) {

            dateText =
                holiday.name +
                " " +
                dateText;

        }


        const floor3 =
            cleanAttendanceValue(
                row.floor3
            );


        const floor1 =
            cleanAttendanceValue(
                row.floor1
            );


        const total =
            floor3 +
            floor1;


        /*
           IMPORTANT:
           Excel now shows 0 or 1 for EVERY date.
           Total is also 0, 1 or 2.
        */

        rows.push([
            dateText,
            floor3,
            floor1,
            total
        ]);

    });


    /*
       TOTAL DAYS
    */

    rows.push([
        "Total days",
        floor3Total,
        floor1Total,
        totalWorkerDays
    ]);


    rows.push([]);
    rows.push([]);


    /*
       PAYMENT SECTION
    */

    rows.push([
        "",
        "Rs",
        ""
    ]);


    rows.push([
        "",
        "One day",
        rate
    ]);


    rows.push([
        "",
        "Days",
        paymentDays
    ]);


    rows.push([
        "",
        "02 Workers",
        2
    ]);


    rows.push([
        "",
        "Total",
        monthlyPayment
    ]);


    rows.push([]);


    rows.push([
        "",
        "Total Working days",
        workingDays
    ]);


    rows.push([
        "",
        "Maximum Extra Payment",
        extra > 0
            ? extra
            : "-"
    ]);


    rows.push([]);


    rows.push([
        "",
        "Monthly Payment",
        monthlyPayment
    ]);


    rows.push([
        "",
        "Maximum Extra Payment",
        extra > 0
            ? extra
            : "-"
    ]);


    rows.push([
        "",
        "",
        grandTotal
    ]);


    /* =====================================================
       WORKBOOK
       ===================================================== */

    const workbook =
        XLSX.utils.book_new();


    const worksheet =
        XLSX.utils.aoa_to_sheet(
            rows
        );


    worksheet["!cols"] = [

        {
            wch: 32
        },

        {
            wch: 25
        },

        {
            wch: 20
        },

        {
            wch: 18
        }

    ];


    worksheet["!merges"] = [

        {
            s: {
                r: 0,
                c: 0
            },

            e: {
                r: 0,
                c: 3
            }
        }

    ];


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Cleaning Days"
    );


    const filename =
        "Cooplife_Cleaning_Days_" +
        year +
        "_" +
        pad(month + 1) +
        ".xlsx";


    XLSX.writeFile(
        workbook,
        filename
    );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    return String(value)
        .replace(
            /[&<>'"]/g,
            function (character) {

                const map = {

                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    "'": "&#39;",
                    '"': "&quot;"

                };

                return map[character];

            }
        );

}
