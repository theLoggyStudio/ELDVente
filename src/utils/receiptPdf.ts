import { jsPDF } from 'jspdf';
import { COULEUR_NOIR, COULEUR_PRINCIPALE } from '../constants/ts/Couleur.constant';
import { formatPrice } from './formatPrice';

export type ReceiptPdfLabels = {
  title: string;
  thanks: string;
  id: string;
  email: string;
  application: string;
  date: string;
  amount: string;
  options: string;
};

export type ReceiptPdfInput = {
  receiptId: string;
  brandName: string;
  buyerEmail?: string;
  applicationName: string;
  purchasedAt: Date;
  totalAmount: number;
  optionsSummary: string;
  labels: ReceiptPdfLabels;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const wrapText = (doc: jsPDF, text: string, maxWidth: number): string[] =>
  doc.splitTextToSize(text, maxWidth) as string[];

/** Télécharge le reçu PDF dans le dossier de téléchargement par défaut du navigateur. */
export const downloadReceiptPdf = (input: ReceiptPdfInput): void => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const [yR, yG, yB] = hexToRgb(COULEUR_PRINCIPALE);
  const [kR, kG, kB] = hexToRgb(COULEUR_NOIR);

  doc.setFillColor(yR, yG, yB);
  doc.rect(0, 0, pageW, pageH, 'F');

  const left = 16;
  const contentW = pageW - 32;
  let y = 28;

  doc.setTextColor(kR, kG, kB);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(input.brandName, pageW / 2, y, { align: 'center' });
  y += 12;

  doc.setFontSize(15);
  doc.text(input.labels.title, pageW / 2, y, { align: 'center' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(input.labels.thanks, pageW / 2, y, { align: 'center' });
  y += 16;

  doc.setDrawColor(kR, kG, kB);
  doc.setLineWidth(0.4);
  doc.line(left, y, pageW - left, y);
  y += 12;

  const dateStr = input.purchasedAt.toLocaleString('fr-FR');
  const lines: Array<[string, string]> = [
    [input.labels.id, input.receiptId],
    ...(input.buyerEmail?.trim()
      ? ([[input.labels.email, input.buyerEmail.trim()]] as Array<[string, string]>)
      : []),
    [input.labels.application, input.applicationName],
    [input.labels.date, dateStr],
    [input.labels.amount, formatPrice(input.totalAmount)],
    [input.labels.options, input.optionsSummary],
  ];

  doc.setFontSize(11);
  for (const [label, value] of lines) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label} :`, left, y);
    doc.setFont('helvetica', 'normal');
    const valueLines = wrapText(doc, value, contentW - 44);
    valueLines.forEach((line, i) => {
      doc.text(line, left + 44, y + i * 5.5);
    });
    y += Math.max(9, valueLines.length * 5.5 + 3);
  }

  doc.save(`recu-${input.receiptId}.pdf`);
};
