/* =====================================================
   OFFICE RENT PAYMENT SYSTEM

   Excel = Original Rent Data

   cashPayments = Manually Updated Cash Payments

   IMPORTANT:

   - Original Excel amount is never changed.
   - Only branches entered in cashPayments are updated.
   - All other branches continue using Excel amount.
===================================================== */


let rentData = [];


/*
 * Stores manually updated payment amounts.
 *
 * Example:
 *
 * cashPayments = {
 *
 *     "Kalutara": 45000,
 *
 *     "Galle": 55000
 *
 * };
 */
let cashPayments = {};



/* =====================================================
   INITIALIZATION
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setTodayDate();

    }
);



/* =====================================================
   SET TODAY DATE
===================================================== */

function setTodayDate() {

    const today =
        new Date();


    document.getElementById(
        "todayDate"
    ).textContent =
        today.toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );


    document.getElementById(
        "preparedDate"
    ).textContent =
        today.toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

}



/* =====================================================
   LOAD EXCEL
===================================================== */

function loadExcel() {

    const fileInput =
        document.getElementById(
            "excelFile"
        );


    const file =
        fileInput.files[0];


    if (!file) {

        showMessage(
            "Please select your Rent Excel file first."
        );

        return;

    }


    const reader =
        new FileReader();


    reader.onload =
        function (event) {

            try {

                const data =
                    new Uint8Array(
                        event.target.result
                    );


                const workbook =
                    XLSX.read(
                        data,
                        {
                            type: "array",
                            cellDates: true
                        }
                    );


                /*
                 * Use first worksheet.
                 */

                const sheetName =
                    workbook.SheetNames[0];


                const worksheet =
                    workbook.Sheets[
                        sheetName
                    ];


                /*
                 * Convert worksheet
                 * to array of rows.
                 */

                const rows =
                    XLSX.utils.sheet_to_json(
                        worksheet,
                        {
                            header: 1,
                            defval: ""
                        }
                    );


                if (!rows.length) {

                    throw new Error(
                        "The Excel sheet is empty."
                    );

                }


                /*
                 * Parse Excel data.
                 */

                rentData =
                    parseRentExcel(
                        rows
                    );


                if (!rentData.length) {

                    throw new Error(
                        "No branch/rent data could be found."
                    );

                }


                /*
                 * IMPORTANT:
                 *
                 * Clear previous manual
                 * payment updates when
                 * loading a new Excel file.
                 */

                cashPayments = {};


                /*
                 * Populate branch selectors.
                 */

                populateBranches();


                /*
                 * Clear updated payment display.
                 */

                displayUpdatedPayments();


                /*
                 * Enable controls.
                 */

                document
                    .getElementById(
                        "controlPanel"
                    )
                    .classList.remove(
                        "disabled"
                    );


                /*
                 * Show file status.
                 */

                document
                    .getElementById(
                        "fileStatus"
                    )
                    .textContent =
                    `${file.name} loaded successfully. ${rentData.length} branch(es) found.`;


                document
                    .getElementById(
                        "fileStatus"
                    )
                    .className =
                    "file-status success-text";


                hideMessage();


                /*
                 * Generate initial report.
                 */

                generateReport();

            }


            catch (error) {

                console.error(error);


                document
                    .getElementById(
                        "fileStatus"
                    )
                    .textContent =
                    "Error: " +
                    error.message;


                document
                    .getElementById(
                        "fileStatus"
                    )
                    .className =
                    "file-status error-text";

            }

        };


    reader.readAsArrayBuffer(
        file
    );

}



/* =====================================================
   PARSE RENT EXCEL
===================================================== */

function parseRentExcel(rows) {

    /*
     * Find header row.
     */

    let headerIndex = -1;


    for (
        let i = 0;
        i < rows.length;
        i++
    ) {

        const row =
            rows[i].map(
                cell =>
                    String(cell)
                        .trim()
                        .toLowerCase()
            );


        if (
            row.some(
                cell =>
                    cell === "branch"
            )
        ) {

            headerIndex = i;

            break;

        }

    }


    if (headerIndex === -1) {

        throw new Error(
            "Could not find the 'Branch' column."
        );

    }


    const headers =
        rows[headerIndex].map(
            h =>
                String(h).trim()
        );


    const branchColumn =
        findColumn(
            headers,
            [
                "Branch"
            ]
        );


    const ownerColumn =
        findColumn(
            headers,
            [
                "Building Owner"
            ]
        );


    const agreementColumn =
        findColumn(
            headers,
            [
                "Agreement End Date"
            ]
        );


    /*
     * Payee Name may not be
     * available in Excel.
     */

    const payeeColumn =
        findColumn(
            headers,
            [
                "Payee Name",
                "Payee"
            ]
        );


    const result = [];


    for (
        let rowIndex = headerIndex + 1;
        rowIndex < rows.length;
        rowIndex++
    ) {

        const row =
            rows[rowIndex];


        if (
            !row ||
            row.length === 0
        ) {

            continue;

        }


        const branchName =
            cleanValue(
                row[branchColumn]
            );


        /*
         * Skip blank rows.
         */

        if (!branchName) {

            continue;

        }


        /*
         * Skip total rows.
         */

        if (
            branchName
                .toLowerCase()
                === "total"
        ) {

            continue;

        }


        const owner =
            ownerColumn >= 0
                ? cleanValue(
                    row[ownerColumn]
                )
                : "";


        let payee =
            payeeColumn >= 0
                ? cleanValue(
                    row[payeeColumn]
                )
                : "";


        /*
         * If Payee Name is empty,
         * use Building Owner.
         */

        if (!payee) {

            payee = owner;

        }


        const agreementEnd =
            agreementColumn >= 0
                ? parseExcelDate(
                    row[agreementColumn]
                )
                : null;


        /*
         * Extract all rent periods.
         */

        const periods =
            extractRentPeriods(
                headers,
                row
            );


        result.push({

            branch:
                branchName,

            payee:
                payee,

            owner:
                owner,

            agreementEnd:
                agreementEnd,

            periods:
                periods

        });

    }


    return result;

}



/* =====================================================
   FIND COLUMN
===================================================== */

function findColumn(
    headers,
    names
) {

    for (
        let i = 0;
        i < headers.length;
        i++
    ) {

        const current =
            String(headers[i])
                .trim()
                .toLowerCase();


        for (
            const name of names
        ) {

            if (
                current ===
                name.toLowerCase()
            ) {

                return i;

            }

        }

    }


    return -1;

}



/* =====================================================
   EXTRACT RENT PERIODS
===================================================== */

function extractRentPeriods(
    headers,
    row
) {

    const periods = [];


    for (
        let i = 0;
        i < headers.length;
        i++
    ) {

        const header =
            String(headers[i])
                .trim()
                .toLowerCase();


        if (
            header ===
            "rent period from"
        ) {

            const from =
                parseExcelDate(
                    row[i]
                );


            /*
             * Find next Rent Period To.
             */

            let toIndex = -1;


            for (
                let j = i + 1;
                j < headers.length;
                j++
            ) {

                if (
                    String(headers[j])
                        .trim()
                        .toLowerCase()
                    ===
                    "rent period to"
                ) {

                    toIndex = j;

                    break;

                }

            }


            /*
             * Find Rent Amount.
             */

            let amountIndex = -1;


            if (
                toIndex !== -1
            ) {

                for (
                    let j = toIndex + 1;
                    j < headers.length;
                    j++
                ) {

                    if (
                        String(headers[j])
                            .trim()
                            .toLowerCase()
                        ===
                        "rent amount"
                    ) {

                        amountIndex = j;

                        break;

                    }

                }

            }


            const to =
                toIndex !== -1
                    ? parseExcelDate(
                        row[toIndex]
                    )
                    : null;


            const amount =
                amountIndex !== -1
                    ? parseNumber(
                        row[amountIndex]
                    )
                    : null;


            if (
                from &&
                to &&
                amount !== null
            ) {

                periods.push({

                    from:
                        from,

                    to:
                        to,

                    rent:
                        amount

                });

            }

        }

    }


    return periods;

}



/* =====================================================
   DATE PARSER
===================================================== */

function parseExcelDate(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    /* JavaScript Date */
    if (
        Object.prototype.toString.call(value) === "[object Date]"
    ) {
        if (isNaN(value.getTime())) {
            return null;
        }

        return formatISODate(value);
    }

    /* Excel serial number */
    if (typeof value === "number") {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const date = new Date(
            excelEpoch.getTime() + value * 86400000
        );

        return formatISODate(date);
    }

    const text = String(value).trim();

    if (!text) {
        return null;
    }

    /*
     * Support mixed Excel date formats.
     *
     * Examples from the Rent workbook:
     *   01.15.2025 -> January 15, 2025 (MM.DD.YYYY)
     *   15.01.2027 -> January 15, 2027 (DD.MM.YYYY)
     *
     * When one of the first two values is greater than 12,
     * the format can be identified safely. When both are <= 12,
     * the existing workbook convention DD.MM.YYYY is used.
     */
    const match = text.match(
        /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/
    );

    if (match) {
        const first = Number(match[1]);
        const second = Number(match[2]);
        const year = Number(match[3]);

        let day;
        let month;

        if (first > 12 && second <= 12) {
            /* DD.MM.YYYY */
            day = first;
            month = second;
        }
        else if (second > 12 && first <= 12) {
            /* MM.DD.YYYY */
            month = first;
            day = second;
        }
        else {
            /* Default to the workbook's normal DD.MM.YYYY format. */
            day = first;
            month = second;
        }

        return makeISODate(year, month, day);
    }

    /* YYYY-MM-DD */
    const isoMatch = text.match(
        /^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/
    );

    if (isoMatch) {
        return makeISODate(
            Number(isoMatch[1]),
            Number(isoMatch[2]),
            Number(isoMatch[3])
        );
    }

    /* Final fallback for browser-recognized dates. */
    const date = new Date(text);

    if (!isNaN(date.getTime())) {
        return formatISODate(date);
    }

    return null;
}



/* =====================================================
   MAKE ISO DATE
===================================================== */

function makeISODate(
    year,
    month,
    day
) {

    const date =
        new Date(
            year,
            month - 1,
            day
        );


    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {

        return null;

    }


    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

}



/* =====================================================
   FORMAT ISO DATE
===================================================== */

function formatISODate(
    date
) {

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}-${String(
        date.getDate()
    ).padStart(2, "0")}`;

}



/* =====================================================
   NUMBER PARSER
===================================================== */

function parseNumber(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;

    }


    if (
        typeof value === "number"
    ) {

        return value;

    }


    const cleaned =
        String(value)
            .replace(/,/g, "")
            .replace(/Rs\.?/gi, "")
            .trim();


    const number =
        Number(cleaned);


    return isNaN(number)
        ? null
        : number;

}



/* =====================================================
   CLEAN VALUE
===================================================== */

function cleanValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value).trim();

}



/* =====================================================
   POPULATE BRANCHES
===================================================== */

function populateBranches() {

    const select =
        document.getElementById(
            "branchFilter"
        );


    const paymentBranch =
        document.getElementById(
            "paymentBranch"
        );


    /*
     * Main report branch filter.
     */

    select.innerHTML =
        `
        <option value="ALL">
            All Branches
        </option>
        `;


    /*
     * Payment update selector.
     */

    paymentBranch.innerHTML =
        `
        <option value="">
            Select Branch
        </option>
        `;


    rentData.forEach(
        (branch, index) => {


            /*
             * Main branch selector.
             */

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                index;


            option.textContent =
                branch.branch;


            select.appendChild(
                option
            );



            /*
             * Payment update selector.
             */

            const paymentOption =
                document.createElement(
                    "option"
                );


            paymentOption.value =
                index;


            paymentOption.textContent =
                branch.branch;


            paymentBranch.appendChild(
                paymentOption
            );

        }
    );

}



/* =====================================================
   FIND RENT FOR MONTH
===================================================== */

function findRentPeriod(
    branch,
    monthValue
) {

    const [
        year,
        month
    ] =
        monthValue
            .split("-")
            .map(Number);


    const firstDay =
        `${year}-${String(month).padStart(2, "0")}-01`;


    const lastDate =
        new Date(
            year,
            month,
            0
        );


    const lastDay =
        `${year}-${String(month).padStart(2, "0")}-${String(
            lastDate.getDate()
        ).padStart(2, "0")}`;


    return branch.periods.find(
        period => {

            return (
                firstDay <= period.to &&
                lastDay >= period.from
            );

        }
    );

}



/* =====================================================
   GET ACTUAL PAYMENT AMOUNT
===================================================== */

/*
 * This is the main function that decides
 * which amount should appear in the report.
 *
 * If branch was manually updated:
 *     use cashPayments amount.
 *
 * Otherwise:
 *     use Excel rent amount.
 */

function getPaymentAmount(
    branch,
    period
) {

    if (
        Object.prototype.hasOwnProperty.call(
            cashPayments,
            branch.branch
        )
    ) {

        return cashPayments[
            branch.branch
        ];

    }


    return period.rent;

}



/* =====================================================
   UPDATE CASH AMOUNT
===================================================== */

function updateCashAmount() {

    const branchIndex =
        document.getElementById(
            "paymentBranch"
        ).value;


    const cashAmountInput =
        document.getElementById(
            "cashAmount"
        );


    const cashAmount =
        parseFloat(
            cashAmountInput.value
        );


    /*
     * Check branch.
     */

    if (
        branchIndex === ""
    ) {

        showMessage(
            "Please select a branch to update."
        );

        return;

    }


    /*
     * Check amount.
     */

    if (
        isNaN(cashAmount) ||
        cashAmount < 0
    ) {

        showMessage(
            "Please enter a valid cash payment amount."
        );

        return;

    }


    const branch =
        rentData[
            Number(branchIndex)
        ];


    if (!branch) {

        showMessage(
            "Selected branch could not be found."
        );

        return;

    }


    /*
     * Check whether branch has
     * a rent period for selected month.
     */

    const monthValue =
        document.getElementById(
            "reportMonth"
        ).value;


    if (!monthValue) {

        showMessage(
            "Please select the payment month first."
        );

        return;

    }


    const period =
        findRentPeriod(
            branch,
            monthValue
        );


    if (!period) {

        showMessage(
            `${branch.branch} does not have a rent period for ${formatMonth(monthValue)}.`
        );

        return;

    }


    /*
     * SAVE MANUAL PAYMENT.
     */

    cashPayments[
        branch.branch
    ] = cashAmount;


    /*
     * Clear fields.
     */

    cashAmountInput.value = "";

    document.getElementById(
        "paymentBranch"
    ).value = "";


    /*
     * Show updated payments.
     */

    displayUpdatedPayments();


    /*
     * Automatically regenerate
     * complete report.
     */

    generateReport();


    hideMessage();

}



/* =====================================================
   DISPLAY UPDATED PAYMENTS
===================================================== */

function displayUpdatedPayments() {

    const container =
        document.getElementById(
            "updatedPayments"
        );


    container.innerHTML = "";


    const branches =
        Object.keys(
            cashPayments
        );


    if (
        !branches.length
    ) {

        return;

    }


    branches.forEach(
        branchName => {


            const amount =
                cashPayments[
                    branchName
                ];


            const item =
                document.createElement(
                    "span"
                );


            item.className =
                "updated-payment-item";


            /*
             * Create branch text safely.
             */

            const branchText =
                document.createElement(
                    "span"
                );


            branchText.textContent =
                `${branchName}: ${formatMoney(amount)}`;


            /*
             * Remove button.
             */

            const removeButton =
                document.createElement(
                    "button"
                );


            removeButton.className =
                "remove-payment";


            removeButton.textContent =
                "×";


            removeButton.title =
                "Remove update";


            removeButton.onclick =
                function () {

                    removeCashAmount(
                        branchName
                    );

                };


            item.appendChild(
                branchText
            );


            item.appendChild(
                removeButton
            );


            container.appendChild(
                item
            );

        }
    );

}



/* =====================================================
   REMOVE CASH UPDATE
===================================================== */

function removeCashAmount(
    branchName
) {

    delete cashPayments[
        branchName
    ];


    displayUpdatedPayments();


    generateReport();

}



/* =====================================================
   GENERATE REPORT
===================================================== */

function generateReport() {

    if (
        !rentData.length
    ) {

        showMessage(
            "Please upload the Rent Excel file first."
        );

        return;

    }


    const monthValue =
        document.getElementById(
            "reportMonth"
        ).value;


    if (!monthValue) {

        showMessage(
            "Please select a payment month."
        );

        return;

    }


    /*
     * IMPORTANT:
     *
     * Report contains ALL branches.
     */

    const selectedData =
        rentData;


    const tbody =
        document.getElementById(
            "reportBody"
        );


    tbody.innerHTML = "";


    let total = 0;

    let number = 1;


    selectedData.forEach(
        branch => {


            if (!branch) {

                return;

            }


            const period =
                findRentPeriod(
                    branch,
                    monthValue
                );


            /*
             * Skip branches that have
             * no applicable rent period.
             */

            if (!period) {

                return;

            }


            /*
             * Get Excel amount OR
             * manually updated amount.
             */

            const amount =
                getPaymentAmount(
                    branch,
                    period
                );


            total += amount;


            /*
             * Create table row.
             */

            const row =
                document.createElement(
                    "tr"
                );


            const noCell =
                document.createElement(
                    "td"
                );


            noCell.textContent =
                number;


            const branchCell =
                document.createElement(
                    "td"
                );


            branchCell.textContent =
                branch.branch;


            const payeeCell =
                document.createElement(
                    "td"
                );


            payeeCell.textContent =
                branch.payee;


            const amountCell =
                document.createElement(
                    "td"
                );


            amountCell.textContent =
                formatMoney(
                    amount
                );


            row.appendChild(
                noCell
            );


            row.appendChild(
                branchCell
            );


            row.appendChild(
                payeeCell
            );


            row.appendChild(
                amountCell
            );


            tbody.appendChild(
                row
            );


            number++;

        }
    );


    /*
     * Update table total.
     */

    document.getElementById(
        "tableTotal"
    ).textContent =
        formatMoney(total);


    /*
     * Update summary total.
     */

    document.getElementById(
        "totalAmount"
    ).textContent =
        formatMoney(total);


    /*
     * Branch count.
     */

    document.getElementById(
        "branchCount"
    ).textContent =
        number - 1;


    /*
     * Month.
     */

    const monthText =
        formatMonth(
            monthValue
        );


    document.getElementById(
        "reportMonthText"
    ).textContent =
        monthText;


    document.getElementById(
        "displayMonth"
    ).textContent =
        monthText;


    /*
     * Prepared date.
     */

    document.getElementById(
        "preparedDate"
    ).textContent =
        new Date().toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );


    hideMessage();

}



/* =====================================================
   FORMAT MONTH
===================================================== */

function formatMonth(
    monthValue
) {

    const [
        year,
        month
    ] =
        monthValue
            .split("-")
            .map(Number);


    const date =
        new Date(
            year,
            month - 1,
            1
        );


    return date.toLocaleDateString(
        "en-US",
        {
            month: "long",
            year: "numeric"
        }
    );

}



/* =====================================================
   FORMAT MONEY
===================================================== */

function formatMoney(
    amount
) {

    return "Rs. " +
        Number(amount)
            .toLocaleString(
                "en-LK",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );

}



/* =====================================================
   EXPORT REPORT TO EXCEL
===================================================== */

function exportReport() {

    if (
        !rentData.length
    ) {

        showMessage(
            "Please upload the Rent Excel file first."
        );

        return;

    }


    const monthValue =
        document.getElementById(
            "reportMonth"
        ).value;


    if (!monthValue) {

        showMessage(
            "Please select a payment month."
        );

        return;

    }


    /*
     * Always export ALL branches.
     */

    const selectedData =
        rentData;


    const excelRows = [];


    let total = 0;

    let number = 1;


    selectedData.forEach(
        branch => {


            if (!branch) {

                return;

            }


            const period =
                findRentPeriod(
                    branch,
                    monthValue
                );


            if (!period) {

                return;

            }


            /*
             * Get Excel amount or
             * updated cash amount.
             */

            const amount =
                getPaymentAmount(
                    branch,
                    period
                );


            total += amount;


            excelRows.push({

                "No.":

                    number,


                "Branch":

                    branch.branch,


                "Payee Name":

                    branch.payee,


                "Amount":

                    Number(
                        amount.toFixed(2)
                    )

            });


            number++;

        }
    );


    /*
     * Add total row.
     */

    excelRows.push({

        "No.": "",

        "Branch": "",

        "Payee Name":
            "TOTAL OFFICE RENT",

        "Amount":
            Number(
                total.toFixed(2)
            )

    });


    /*
     * Create worksheet.
     */

    const worksheet =
        XLSX.utils.json_to_sheet(
            excelRows
        );


    /*
     * Column widths.
     */

    worksheet["!cols"] = [

        {
            wch: 8
        },

        {
            wch: 25
        },

        {
            wch: 40
        },

        {
            wch: 18
        }

    ];


    /*
     * Create workbook.
     */

    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Rent Payment"
    );


    /*
     * Filename.
     */

    const fileName =
        "Office_Rent_Payment_" +
        monthValue.replace(
            "-",
            "_"
        ) +
        ".xlsx";


    /*
     * Download Excel.
     */

    XLSX.writeFile(
        workbook,
        fileName
    );


    showMessage(
        "Report exported to Excel successfully."
    );

}



/* =====================================================
   PRINT REPORT
===================================================== */

function printReport() {

    if (
        !rentData.length
    ) {

        showMessage(
            "Please upload the Rent Excel file first."
        );

        return;

    }


    /*
     * Make sure latest changes
     * are reflected before printing.
     */

    generateReport();


    window.print();

}



/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(
    value
) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}



/* =====================================================
   SHOW MESSAGE
===================================================== */

function showMessage(
    message
) {

    const element =
        document.getElementById(
            "message"
        );


    element.textContent =
        message;


    element.style.display =
        "block";

}



/* =====================================================
   HIDE MESSAGE
===================================================== */

function hideMessage() {

    document.getElementById(
        "message"
    ).style.display =
        "none";

}
