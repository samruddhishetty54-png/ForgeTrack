const XLSX = require('xlsx');
const filePath = 'c:\\Users\\Samrudhi\\OneDrive\\Documents\\ForgeTrack\\docs\\Data Engineering and AI - Actual Program.xlsx';
const workbook = XLSX.readFile(filePath);
console.log('Sheet Names:', workbook.SheetNames);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log('Data Length:', data.length);
if (data.length > 0) {
    for (let i = 0; i < Math.min(data.length, 5); i++) {
        console.log(`Row ${i}:`, data[i]);
    }
}
