import { Workbook } from './api/_lib/excel.js';
import fs from 'fs';

async function checkXlsx() {
  const file = 'Ets-0EEzj_tiktok_us.xlsx';
  if (!fs.existsSync(file)) {
    console.log('File not found');
    return;
  }

  const workbook = new Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.getWorksheet('Template') || workbook.worksheets[0];
  
  console.log('Sheet Name:', sheet.name);
  console.log('Total Rows:', sheet.rowCount);

  // Read header (row 2 contains the names)
  const headerRow = sheet.getRow(2);
  console.log(`Col 13 (M): ${headerRow.getCell(13).value}`);
  console.log(`Col 14 (N): ${headerRow.getCell(14).value}`);
  console.log(`Col 17 (Q): ${headerRow.getCell(17).value}`);

  // Read sample data
  for (let i = 5; i <= 10; i++) {
    const row = sheet.getRow(i);
    console.log(`Row ${i}: M=${row.getCell(13).value}, N=${row.getCell(14).value}, Q=${row.getCell(17).value}`);
  }
}

checkXlsx().catch(console.error);
