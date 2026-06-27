import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ExportColumn {
  header: string;
  key: string;
}

export function exportToPDF(
  title: string,
  columns: ExportColumn[],
  rows: Array<object>,
  filename: string
) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Tendzu Ventures", 14, 18);
  doc.setFontSize(12);
  doc.text(title, 14, 28);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString("en-GH")}`, 14, 36);

  autoTable(doc, {
    startY: 42,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) =>
      columns.map((c) => String((row as Record<string, unknown>)[c.key] ?? ""))
    ),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [234, 88, 12] },
  });

  doc.save(`${filename}.pdf`);
}

export function exportToExcel(
  sheetName: string,
  columns: ExportColumn[],
  rows: Array<object>,
  filename: string
) {
  const data = rows.map((row) => {
    const entry: Record<string, string> = {};
    const record = row as Record<string, unknown>;
    for (const col of columns) {
      entry[col.header] = String(record[col.key] ?? "");
    }
    return entry;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
