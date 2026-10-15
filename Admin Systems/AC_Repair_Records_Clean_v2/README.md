# AC Repair Records - Clean Project

## Project structure

- `index.html` — main page
- `css/styles.css` — all CSS
- `js/app.js` — all JavaScript
- `data/AC_Repair_Records_Updated.xlsx` — updated workbook
- `README.md` — setup notes

## Excel columns

The workbook now uses:

1. Branch
2. Date
3. Asset Code
4. Description
5. Amount
6. Floor
7. Company
8. Repair Person

The existing records from the supplied workbook were retained. The repeated header row in the supplied sheet was removed, and the new Company / Repair Person fields are blank for those existing records.

## D:\tharusha

The intended Windows data folder is:

`D:\tharusha`

A normal browser page cannot silently access an arbitrary Windows folder. In Chrome/Edge, use **Open Excel File**, select the workbook inside `D:\tharusha`, then use **Save Excel File**. With File System Access support, the app can write back to the selected workbook.

If you need the app to automatically use `D:\tharusha` without a file picker, it should be converted to a desktop/local application (for example Electron, Tauri, or a local Python/Node app).
