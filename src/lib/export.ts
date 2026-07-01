import { createElement } from "react";
import * as XLSX from "xlsx";
import { APP_NAME, INVOICE_GENERATION_ENABLED } from "@/lib/constants";
import { getBrandLogoUrl } from "@/lib/brand";
import { getSaleProfit } from "@/lib/sales";
import type { SaleRecord } from "@/types";
import type { ExportColumn } from "@/lib/pdf/report-document";

export type { ExportColumn };

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportToPDF(
  title: string,
  columns: ExportColumn[],
  rows: Array<object>,
  filename: string
) {
  const [{ pdf }, { ReportDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/report-document"),
  ]);

  const blob = await pdf(
    createElement(ReportDocument, {
      title,
      columns,
      rows,
      generatedAt: new Date().toLocaleString("en-GH"),
      logoUrl: getBrandLogoUrl(),
    })
  ).toBlob();

  downloadBlob(blob, `${filename}.pdf`);
}

export async function exportInvoicePDF(sale: SaleRecord) {
  if (!INVOICE_GENERATION_ENABLED) {
    throw new Error("Invoice generation is currently disabled.");
  }

  const [{ pdf }, { InvoiceDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/invoice-document"),
  ]);

  const profit = getSaleProfit(sale);
  const blob = await pdf(
    createElement(InvoiceDocument, {
      sale,
      profit,
      generatedAt: new Date().toLocaleString("en-GH"),
      logoUrl: getBrandLogoUrl(),
      companyName: APP_NAME,
    }) as never
  ).toBlob();

  downloadBlob(blob, `${sale.invoiceNumber}.pdf`);
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
