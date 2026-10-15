OFFICE RENT PAYMENT SYSTEM - UPDATED

Files:
- index.html       Main application page
- style.css        Application styling
- script.js        Application logic with improved mixed-date Excel parsing
- Rent.xlsx        Original workbook supplied for testing

Rathnapura fix:
The workbook contains a mixed date format in the Rathnapura rent period:
01.15.2025 is MM.DD.YYYY, while 14.01.2027 is DD.MM.YYYY.
The updated script.js detects these formats automatically.

For July 2026, Rathnapura's first rent period is therefore recognized as:
15 January 2025 to 14 January 2027
Rent: Rs. 70,000

How to run:
1. Extract the ZIP.
2. Open index.html in a modern browser.
3. Select Rent.xlsx.
4. Click Load Excel.
5. Keep Payment Month as July 2026 to test Rathnapura.

Note:
The application reads the first worksheet in the workbook, which is the
"Office Rent Direct " sheet in the supplied Rent.xlsx file.
