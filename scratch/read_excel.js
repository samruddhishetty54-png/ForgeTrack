const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'c:\\Users\\Samrudhi\\OneDrive\\Documents\\ForgeTrack\\docs\\Data Engineering and AI - Actual Program.xlsx';
const workbook = XLSX.readFile(filePath);
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\nSheet: ${sheetName}`);
  console.log('Sample Data (first 5 rows):');
  console.log(JSON.stringify(data.slice(0, 5), null, 2));
});
