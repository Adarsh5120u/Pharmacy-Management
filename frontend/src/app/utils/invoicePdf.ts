export interface InvoiceLine {
  medicineName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
}

export interface InvoiceData {
  invoiceId: string;
  invoiceDate: string;
  customerName: string;
  paymentMethod: string;
  items: InvoiceLine[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
}

function escapePdfText(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatCurrency(value: number): string {
  return `Rs ${value.toFixed(2)}`;
}

function truncateText(value: string, max = 34): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
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

function buildPremiumPdf(invoice: InvoiceData): Uint8Array {
  const commands: string[] = [];

  commands.push(rectFillCommand(0, 760, 595, 82, [0.11, 0.2, 0.42]));
  commands.push(textCommand("F2", 24, 40, 805, "PHARMACY INVOICE", [1, 1, 1]));
  commands.push(textCommand("F1", 11, 40, 785, "Professional Billing Statement", [0.87, 0.91, 1]));

  commands.push(textCommand("F1", 11, 40, 736, `Invoice ID: ${invoice.invoiceId}`));
  commands.push(textCommand("F1", 11, 40, 718, `Invoice Date: ${invoice.invoiceDate}`));
  commands.push(textCommand("F1", 11, 40, 700, `Customer: ${invoice.customerName || "Walk-in Customer"}`));
  commands.push(textCommand("F1", 11, 320, 736, `Payment Method: ${invoice.paymentMethod}`));

  const tableX = 40;
  const tableTop = 670;
  const rowHeight = 22;
  const colWidths = [215, 55, 80, 70, 95];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  commands.push(rectFillCommand(tableX, tableTop - rowHeight, tableWidth, rowHeight, [0.93, 0.95, 0.99]));
  commands.push(lineCommand(tableX, tableTop - rowHeight, tableX + tableWidth, tableTop - rowHeight));
  commands.push(lineCommand(tableX, tableTop, tableX + tableWidth, tableTop));
  commands.push(lineCommand(tableX, tableTop, tableX, tableTop - rowHeight));
  commands.push(lineCommand(tableX + tableWidth, tableTop, tableX + tableWidth, tableTop - rowHeight));

  let runningX = tableX;
  for (let i = 0; i < colWidths.length - 1; i += 1) {
    runningX += colWidths[i];
    commands.push(lineCommand(runningX, tableTop, runningX, tableTop - rowHeight));
  }

  commands.push(textCommand("F2", 10, tableX + 8, tableTop - 15, "Medicine"));
  commands.push(textCommand("F2", 10, tableX + colWidths[0] + 8, tableTop - 15, "Qty"));
  commands.push(textCommand("F2", 10, tableX + colWidths[0] + colWidths[1] + 8, tableTop - 15, "Rate"));
  commands.push(textCommand("F2", 10, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 8, tableTop - 15, "Disc %"));
  commands.push(textCommand("F2", 10, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 8, tableTop - 15, "Amount"));

  let currentTop = tableTop - rowHeight;
  const maxRows = 18;
  const rows = invoice.items.slice(0, maxRows);

  rows.forEach((item) => {
    const rowBottom = currentTop - rowHeight;
    commands.push(lineCommand(tableX, rowBottom, tableX + tableWidth, rowBottom, 0.8));
    commands.push(lineCommand(tableX, currentTop, tableX, rowBottom, 0.8));
    commands.push(lineCommand(tableX + tableWidth, currentTop, tableX + tableWidth, rowBottom, 0.8));

    let x = tableX;
    for (let i = 0; i < colWidths.length - 1; i += 1) {
      x += colWidths[i];
      commands.push(lineCommand(x, currentTop, x, rowBottom, 0.8));
    }

    commands.push(textCommand("F1", 9.5, tableX + 8, currentTop - 15, truncateText(item.medicineName)));
    commands.push(textCommand("F1", 9.5, tableX + colWidths[0] + 8, currentTop - 15, String(item.quantity)));
    commands.push(
      textCommand("F1", 9.5, tableX + colWidths[0] + colWidths[1] + 8, currentTop - 15, formatCurrency(item.unitPrice))
    );
    commands.push(
      textCommand(
        "F1",
        9.5,
        tableX + colWidths[0] + colWidths[1] + colWidths[2] + 8,
        currentTop - 15,
        item.discountPercent.toFixed(2)
      )
    );
    commands.push(
      textCommand(
        "F1",
        9.5,
        tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 8,
        currentTop - 15,
        formatCurrency(item.lineTotal)
      )
    );

    currentTop = rowBottom;
  });

  if (invoice.items.length > maxRows) {
    commands.push(textCommand("F1", 9, 40, currentTop - 15, `+ ${invoice.items.length - maxRows} more item(s) not shown`));
    currentTop -= 18;
  }

  const summaryX = 340;
  const summaryTop = currentTop - 18;
  commands.push(rectFillCommand(summaryX - 10, summaryTop - 86, 215, 92, [0.97, 0.98, 1]));
  commands.push(lineCommand(summaryX - 10, summaryTop + 6, summaryX + 205, summaryTop + 6, 0.8));
  commands.push(lineCommand(summaryX - 10, summaryTop - 86, summaryX + 205, summaryTop - 86, 0.8));
  commands.push(lineCommand(summaryX - 10, summaryTop + 6, summaryX - 10, summaryTop - 86, 0.8));
  commands.push(lineCommand(summaryX + 205, summaryTop + 6, summaryX + 205, summaryTop - 86, 0.8));

  commands.push(textCommand("F1", 10, summaryX, summaryTop - 14, "Subtotal"));
  commands.push(textCommand("F1", 10, summaryX + 95, summaryTop - 14, formatCurrency(invoice.subtotal)));

  commands.push(textCommand("F1", 10, summaryX, summaryTop - 34, "Discount"));
  commands.push(textCommand("F1", 10, summaryX + 95, summaryTop - 34, `- ${formatCurrency(invoice.discountTotal)}`));

  commands.push(lineCommand(summaryX, summaryTop - 42, summaryX + 170, summaryTop - 42, 0.8));
  commands.push(textCommand("F2", 12, summaryX, summaryTop - 62, "Grand Total"));
  commands.push(textCommand("F2", 12, summaryX + 95, summaryTop - 62, formatCurrency(invoice.grandTotal)));

  commands.push(textCommand("F1", 9, 40, 50, "Thank you for your business."));
  commands.push(textCommand("F1", 8.5, 40, 36, "This is a computer-generated invoice and does not require a signature.", [0.35, 0.35, 0.35]));

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

export function downloadInvoicePdf(invoice: InvoiceData): void {
  const pdfBytes = buildPremiumPdf(invoice);
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoice.invoiceId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
