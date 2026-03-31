import { formatDate, formatDateTime } from "./date";

export interface PurchaseOrderReportEntry {
  medicineName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  expiryDate: string;
  lineTotal: number;
}

export interface PurchaseOrderReportData {
  poNumber: string;
  supplierName: string;
  orderDate: string;
  receivedAt: string;
  generatedAt: string;
  status: string;
  entries: PurchaseOrderReportEntry[];
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

function formatCurrency(value: number): string {
  return `Rs ${value.toFixed(2)}`;
}

function buildPurchaseOrderReportPdf(data: PurchaseOrderReportData): Uint8Array {
  const commands: string[] = [];
  const entries = data.entries.slice(0, 12);
  const totalOrderedQuantity = data.entries.reduce((sum, item) => sum + item.orderedQuantity, 0);
  const totalReceivedQuantity = data.entries.reduce((sum, item) => sum + item.receivedQuantity, 0);
  const totalAmount = data.entries.reduce((sum, item) => sum + item.lineTotal, 0);

  commands.push(rectFillCommand(0, 760, 595, 82, [0.08, 0.33, 0.28]));
  commands.push(textCommand("F2", 22, 34, 804, "PURCHASE ORDER RECEIPT", [1, 1, 1]));
  commands.push(
    textCommand(
      "F1",
      10.5,
      34,
      784,
      "Auto-generated when a purchase order is marked as received",
      [0.9, 0.97, 0.94]
    )
  );

  commands.push(textCommand("F1", 10, 34, 738, `PO Number: ${data.poNumber}`));
  commands.push(textCommand("F1", 10, 34, 720, `Supplier: ${truncateText(data.supplierName, 40)}`));
  commands.push(textCommand("F1", 10, 34, 702, `Order Date: ${formatDate(data.orderDate) || data.orderDate}`));
  commands.push(textCommand("F1", 10, 310, 738, `Status: ${data.status}`));
  commands.push(
    textCommand("F1", 10, 310, 720, `Received At: ${formatDateTime(data.receivedAt) || data.receivedAt}`)
  );
  commands.push(
    textCommand("F1", 10, 310, 702, `Generated: ${formatDateTime(data.generatedAt) || data.generatedAt}`)
  );

  commands.push(textCommand("F2", 11, 34, 668, "Received Items"));

  const tableX = 26;
  const tableTop = 648;
  const rowHeight = 22;
  const colWidths = [180, 48, 52, 78, 88, 97];
  const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);

  commands.push(rectFillCommand(tableX, tableTop - rowHeight, tableWidth, rowHeight, [0.91, 0.97, 0.94]));
  commands.push(lineCommand(tableX, tableTop, tableX + tableWidth, tableTop));
  commands.push(lineCommand(tableX, tableTop - rowHeight, tableX + tableWidth, tableTop - rowHeight));
  commands.push(lineCommand(tableX, tableTop, tableX, tableTop - rowHeight));
  commands.push(lineCommand(tableX + tableWidth, tableTop, tableX + tableWidth, tableTop - rowHeight));

  let runningX = tableX;
  for (let i = 0; i < colWidths.length - 1; i += 1) {
    runningX += colWidths[i];
    commands.push(lineCommand(runningX, tableTop, runningX, tableTop - rowHeight));
  }

  commands.push(textCommand("F2", 9.5, tableX + 8, tableTop - 15, "Medicine"));
  commands.push(textCommand("F2", 9.5, tableX + colWidths[0] + 8, tableTop - 15, "Ord"));
  commands.push(textCommand("F2", 9.5, tableX + colWidths[0] + colWidths[1] + 8, tableTop - 15, "Rec"));
  commands.push(
    textCommand("F2", 9.5, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 8, tableTop - 15, "Unit Price")
  );
  commands.push(
    textCommand(
      "F2",
      9.5,
      tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 8,
      tableTop - 15,
      "Expiry Date"
    )
  );
  commands.push(
    textCommand(
      "F2",
      9.5,
      tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 8,
      tableTop - 15,
      "Amount"
    )
  );

  let currentTop = tableTop - rowHeight;
  for (const item of entries) {
    const bottom = currentTop - rowHeight;

    commands.push(lineCommand(tableX, bottom, tableX + tableWidth, bottom, 0.8));
    commands.push(lineCommand(tableX, currentTop, tableX, bottom, 0.8));
    commands.push(lineCommand(tableX + tableWidth, currentTop, tableX + tableWidth, bottom, 0.8));

    let x = tableX;
    for (let i = 0; i < colWidths.length - 1; i += 1) {
      x += colWidths[i];
      commands.push(lineCommand(x, currentTop, x, bottom, 0.8));
    }

    commands.push(textCommand("F1", 9, tableX + 8, currentTop - 15, truncateText(item.medicineName, 30)));
    commands.push(textCommand("F1", 9, tableX + colWidths[0] + 8, currentTop - 15, String(item.orderedQuantity)));
    commands.push(
      textCommand(
        "F1",
        9,
        tableX + colWidths[0] + colWidths[1] + 8,
        currentTop - 15,
        String(item.receivedQuantity)
      )
    );
    commands.push(
      textCommand(
        "F1",
        9,
        tableX + colWidths[0] + colWidths[1] + colWidths[2] + 8,
        currentTop - 15,
        formatCurrency(item.unitPrice)
      )
    );
    commands.push(
      textCommand(
        "F1",
        9,
        tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 8,
        currentTop - 15,
        truncateText(formatDate(item.expiryDate) || item.expiryDate, 14)
      )
    );
    commands.push(
      textCommand(
        "F1",
        9,
        tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 8,
        currentTop - 15,
        formatCurrency(item.lineTotal)
      )
    );

    currentTop = bottom;
  }

  if (data.entries.length > entries.length) {
    commands.push(
      textCommand(
        "F1",
        8.5,
        34,
        currentTop - 14,
        `Showing first ${entries.length} items out of ${data.entries.length} received lines`
      )
    );
    currentTop -= 18;
  }

  const summaryTop = currentTop - 24;
  commands.push(rectFillCommand(34, summaryTop - 74, 250, 78, [0.97, 0.99, 0.98]));
  commands.push(lineCommand(34, summaryTop + 4, 284, summaryTop + 4, 0.8));
  commands.push(lineCommand(34, summaryTop - 74, 284, summaryTop - 74, 0.8));
  commands.push(lineCommand(34, summaryTop + 4, 34, summaryTop - 74, 0.8));
  commands.push(lineCommand(284, summaryTop + 4, 284, summaryTop - 74, 0.8));

  commands.push(textCommand("F2", 10.5, 46, summaryTop - 14, "Receipt Summary"));
  commands.push(textCommand("F1", 9.5, 46, summaryTop - 34, `Total Line Items: ${data.entries.length}`));
  commands.push(textCommand("F1", 9.5, 46, summaryTop - 50, `Ordered Qty: ${totalOrderedQuantity}`));
  commands.push(textCommand("F1", 9.5, 160, summaryTop - 50, `Received Qty: ${totalReceivedQuantity}`));

  commands.push(rectFillCommand(320, summaryTop - 74, 240, 78, [0.95, 0.98, 0.97]));
  commands.push(lineCommand(320, summaryTop + 4, 560, summaryTop + 4, 0.8));
  commands.push(lineCommand(320, summaryTop - 74, 560, summaryTop - 74, 0.8));
  commands.push(lineCommand(320, summaryTop + 4, 320, summaryTop - 74, 0.8));
  commands.push(lineCommand(560, summaryTop + 4, 560, summaryTop - 74, 0.8));

  commands.push(textCommand("F2", 10.5, 332, summaryTop - 14, "Financial Summary"));
  commands.push(textCommand("F1", 9.5, 332, summaryTop - 38, "Received Stock Value"));
  commands.push(textCommand("F2", 12, 332, summaryTop - 58, formatCurrency(totalAmount), [0.08, 0.33, 0.28]));

  commands.push(textCommand("F1", 8.5, 34, 38, "Generated from Pharmacy Management System", [0.35, 0.35, 0.35]));
  commands.push(
    textCommand("F1", 8.5, 34, 24, "This is a computer-generated purchase order receipt report.", [0.35, 0.35, 0.35])
  );

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

export function createPurchaseOrderReportPdfBlob(data: PurchaseOrderReportData): Blob {
  const pdfBytes = buildPurchaseOrderReportPdf(data);
  return new Blob([pdfBytes], { type: "application/pdf" });
}
