import { formatDateTime } from "./date";

export interface SalesReportEntry {
  invoiceId: string;
  date: string;
  paymentMethod: string;
  total: number;
  items: number;
}

export interface MedicineSummaryEntry {
  medicineName: string;
  quantity: number;
}

export interface SalesReportData {
  generatedAt: string;
  periodLabel: string;
  entries: SalesReportEntry[];
  medicineSummary: MedicineSummaryEntry[];
}

function escapePdfText(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function textCommand(
  font: "F1" | "F2",
  size: number,
  x: number,
  y: number,
  text: string,
  color: [number, number, number] = [0, 0, 0]
): string {
  return `BT\n/${font} ${size} Tf\n${color[0]} ${color[1]} ${color[2]} rg\n1 0 0 1 ${x} ${y} Tm\n(${escapePdfText(text)}) Tj\nET`;
}

function lineCommand(x1: number, y1: number, x2: number, y2: number, width = 1): string {
  return `${width} w\n${x1} ${y1} m\n${x2} ${y2} l\nS`;
}

function rectFillCommand(x: number, y: number, w: number, h: number, color: [number, number, number]): string {
  return `${color[0]} ${color[1]} ${color[2]} rg\n${x} ${y} ${w} ${h} re\nf`;
}

function truncateText(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

function buildSalesReportPdf(data: SalesReportData): Uint8Array {
  const commands: string[] = [];
  const entries = data.entries.slice(0, 10);
  const medicineRows = data.medicineSummary.slice(0, 12);
  const totalSales = data.entries.reduce((sum, sale) => sum + sale.total, 0);
  const totalBills = data.entries.length;
  const totalItems = data.entries.reduce((sum, sale) => sum + sale.items, 0);

  commands.push(rectFillCommand(0, 765, 595, 77, [0.07, 0.29, 0.41]));
  commands.push(textCommand("F2", 22, 36, 802, "SALES REPORT", [1, 1, 1]));
  commands.push(textCommand("F1", 10.5, 36, 784, `Period: ${truncateText(data.periodLabel, 44)}`, [0.89, 0.95, 0.99]));
  commands.push(textCommand("F1", 10.5, 316, 784, `Generated: ${data.generatedAt}`, [0.89, 0.95, 0.99]));

  commands.push(textCommand("F2", 11, 36, 744, "Summary"));
  commands.push(textCommand("F1", 10, 36, 726, `Total Bills: ${totalBills}`));
  commands.push(textCommand("F1", 10, 176, 726, `Total Items: ${totalItems}`));
  commands.push(textCommand("F1", 10, 316, 726, `Revenue: Rs ${totalSales.toFixed(2)}`));

  const tableX = 36;
  const tableTop = 694;
  const rowHeight = 22;
  const colWidths = [96, 150, 88, 54, 95];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  commands.push(rectFillCommand(tableX, tableTop - rowHeight, tableWidth, rowHeight, [0.92, 0.96, 0.99]));
  commands.push(lineCommand(tableX, tableTop, tableX + tableWidth, tableTop));
  commands.push(lineCommand(tableX, tableTop - rowHeight, tableX + tableWidth, tableTop - rowHeight));
  commands.push(lineCommand(tableX, tableTop, tableX, tableTop - rowHeight));
  commands.push(lineCommand(tableX + tableWidth, tableTop, tableX + tableWidth, tableTop - rowHeight));

  let runningX = tableX;
  for (let i = 0; i < colWidths.length - 1; i += 1) {
    runningX += colWidths[i];
    commands.push(lineCommand(runningX, tableTop, runningX, tableTop - rowHeight));
  }

  commands.push(textCommand("F2", 10, tableX + 8, tableTop - 15, "Invoice"));
  commands.push(textCommand("F2", 10, tableX + colWidths[0] + 8, tableTop - 15, "Date/Time"));
  commands.push(textCommand("F2", 10, tableX + colWidths[0] + colWidths[1] + 8, tableTop - 15, "Payment"));
  commands.push(textCommand("F2", 10, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 8, tableTop - 15, "Items"));
  commands.push(textCommand("F2", 10, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 8, tableTop - 15, "Amount"));

  let currentTop = tableTop - rowHeight;
  for (const sale of entries) {
    const bottom = currentTop - rowHeight;

    commands.push(lineCommand(tableX, bottom, tableX + tableWidth, bottom, 0.8));
    commands.push(lineCommand(tableX, currentTop, tableX, bottom, 0.8));
    commands.push(lineCommand(tableX + tableWidth, currentTop, tableX + tableWidth, bottom, 0.8));

    let x = tableX;
    for (let i = 0; i < colWidths.length - 1; i += 1) {
      x += colWidths[i];
      commands.push(lineCommand(x, currentTop, x, bottom, 0.8));
    }

  commands.push(textCommand("F1", 9, tableX + 8, currentTop - 15, truncateText(sale.invoiceId, 14)));
  commands.push(textCommand("F1", 9, tableX + colWidths[0] + 8, currentTop - 15, truncateText(formatDateTime(sale.date), 20)));
  commands.push(textCommand("F1", 9, tableX + colWidths[0] + colWidths[1] + 8, currentTop - 15, truncateText(sale.paymentMethod, 13)));
  commands.push(textCommand("F1", 9, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 8, currentTop - 15, String(sale.items)));
  commands.push(
    textCommand(
        "F1",
        9,
        tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 8,
        currentTop - 15,
        `Rs ${sale.total.toFixed(2)}`
      )
    );

    currentTop = bottom;
  }

  if (data.entries.length > entries.length) {
    commands.push(
      textCommand("F1", 9, 36, currentTop - 14, `Showing first ${entries.length} rows out of ${data.entries.length} sales`)
    );
    currentTop -= 16;
  }

  const medsTitleY = currentTop - 30;
  commands.push(textCommand("F2", 11, 36, medsTitleY, "Medicine-wise Quantity Sold"));

  const medsX = 36;
  const medsTop = medsTitleY - 12;
  const medsRowHeight = 20;
  const medsColWidths = [380, 103];
  const medsWidth = medsColWidths[0] + medsColWidths[1];

  commands.push(rectFillCommand(medsX, medsTop - medsRowHeight, medsWidth, medsRowHeight, [0.92, 0.96, 0.99]));
  commands.push(lineCommand(medsX, medsTop, medsX + medsWidth, medsTop));
  commands.push(lineCommand(medsX, medsTop - medsRowHeight, medsX + medsWidth, medsTop - medsRowHeight));
  commands.push(lineCommand(medsX, medsTop, medsX, medsTop - medsRowHeight));
  commands.push(lineCommand(medsX + medsWidth, medsTop, medsX + medsWidth, medsTop - medsRowHeight));
  commands.push(lineCommand(medsX + medsColWidths[0], medsTop, medsX + medsColWidths[0], medsTop - medsRowHeight));
  commands.push(textCommand("F2", 10, medsX + 8, medsTop - 14, "Medicine"));
  commands.push(textCommand("F2", 10, medsX + medsColWidths[0] + 8, medsTop - 14, "Qty"));

  let medsCurrentTop = medsTop - medsRowHeight;
  for (const medicine of medicineRows) {
    const bottom = medsCurrentTop - medsRowHeight;
    commands.push(lineCommand(medsX, bottom, medsX + medsWidth, bottom, 0.8));
    commands.push(lineCommand(medsX, medsCurrentTop, medsX, bottom, 0.8));
    commands.push(lineCommand(medsX + medsWidth, medsCurrentTop, medsX + medsWidth, bottom, 0.8));
    commands.push(lineCommand(medsX + medsColWidths[0], medsCurrentTop, medsX + medsColWidths[0], bottom, 0.8));

    commands.push(textCommand("F1", 9, medsX + 8, medsCurrentTop - 14, truncateText(medicine.medicineName, 56)));
    commands.push(textCommand("F1", 9, medsX + medsColWidths[0] + 8, medsCurrentTop - 14, String(medicine.quantity)));
    medsCurrentTop = bottom;
  }

  if (data.medicineSummary.length > medicineRows.length) {
    commands.push(
      textCommand(
        "F1",
        8.5,
        36,
        medsCurrentTop - 12,
        `Showing first ${medicineRows.length} medicines out of ${data.medicineSummary.length}`
      )
    );
  }

  commands.push(textCommand("F1", 8.5, 36, 30, "Generated from Pharmacy Management System", [0.35, 0.35, 0.35]));

  const content = commands.join("\n");
  const stream = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n${stream}\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export function createSalesReportPdfBlob(data: SalesReportData): Blob {
  const pdfBytes = buildSalesReportPdf(data);
  return new Blob([pdfBytes], { type: "application/pdf" });
}
