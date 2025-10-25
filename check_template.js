import XLSX from 'xlsx-js-style';

try {
  const wb = XLSX.readFile('public/student_data_sample_template.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];

  console.log('Column widths:', ws['!cols']);
  console.log('Sheet data preview:');
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log('Headers:', data[0]);
  console.log('First row:', data[1]);
  console.log('Second row:', data[2]);
  console.log('Third row:', data[3]);
} catch (error) {
  console.error('Error reading file:', error);
}