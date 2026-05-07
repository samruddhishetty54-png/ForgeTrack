const XLSX = require('xlsx');
const filePath = 'c:\\Users\\Samrudhi\\OneDrive\\Documents\\ForgeTrack\\docs\\Data Engineering and AI - Actual Program.xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Actual'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log('Headers (Row 1):', data[0]);
console.log('Headers (Row 2):', data[1]);
