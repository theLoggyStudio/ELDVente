import { jsPDF } from 'jspdf';
import { ELLADARIE_DEFAULT_LOGO } from '../constants/ts/Brand.constant';
import { COULEUR_NOIR, COULEUR_PRINCIPALE } from '../constants/ts/Couleur.constant';
import { formatPrice } from './formatPrice';

const siteLogoUrl = ELLADARIE_DEFAULT_LOGO;

export type ReceiptPdfLabels = {
  title: string;
  thanks: string;
  id: string;
  email: string;
  application: string;
  date: string;
  amount: string;
  options: string;
  paymentSection: string;
  appSection: string;
  category: string;
  description: string;
  website: string;
  assistance: string;
  included: string;
};

export type ReceiptPdfArticleInfo = {
  nom: string;
  version?: string;
  categorie?: string;
  description?: string;
  siteUrl?: string;
  tel?: string;
  imageUrl?: string;
  elements?: string[];
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
  /** Fiche de l'application achetée (sans le lien de téléchargement). */
  article?: ReceiptPdfArticleInfo;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const wrapText = (doc: jsPDF, text: string, maxWidth: number): string[] =>
  doc.splitTextToSize(text, maxWidth) as string[];

type LoadedImage = { dataUrl: string; width: number; height: number };

/**
 * Charge une image (locale ou distante) et la normalise en PNG via canvas,
 * pour que jsPDF l'accepte quel que soit le format d'origine (webp, svg…).
 * Retourne null en cas d'échec (CORS, 404…) : le PDF est alors généré sans l'image.
 */
const loadImageAsPng = async (url: string, timeoutMs = 5000): Promise<LoadedImage | null> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, mode: 'cors' });
    clearTimeout(timer);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('image load failed'));
        el.src = objectUrl;
      });
      const w = img.naturalWidth || 256;
      const h = img.naturalHeight || 256;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      return { dataUrl: canvas.toDataURL('image/png'), width: w, height: h };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
};

/** Génère et télécharge le reçu PDF (logo du site, fiche de l'application, détails du paiement). */
export const downloadReceiptPdf = async (input: ReceiptPdfInput): Promise<void> => {
  const [siteLogo, appLogo] = await Promise.all([
    loadImageAsPng(siteLogoUrl),
    input.article?.imageUrl ? loadImageAsPng(input.article.imageUrl) : Promise.resolve(null),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const [yR, yG, yB] = hexToRgb(COULEUR_PRINCIPALE);
  const [kR, kG, kB] = hexToRgb(COULEUR_NOIR);

  const left = 18;
  const right = pageW - 18;
  const contentW = right - left;
  const labelColW = 46;

  // ---------- Bandeau d'en-tête jaune ----------
  const headerH = 58;
  doc.setFillColor(yR, yG, yB);
  doc.rect(0, 0, pageW, headerH, 'F');

  let y = 12;
  if (siteLogo) {
    const logoH = 16;
    const logoW = Math.min(70, (siteLogo.width / siteLogo.height) * logoH);
    doc.addImage(siteLogo.dataUrl, 'PNG', pageW / 2 - logoW / 2, y, logoW, logoH);
    y += logoH + 8;
  } else {
    doc.setTextColor(kR, kG, kB);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(input.brandName, pageW / 2, y + 8, { align: 'center' });
    y += 18;
  }

  doc.setTextColor(kR, kG, kB);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(input.labels.title, pageW / 2, y, { align: 'center' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(input.labels.thanks, pageW / 2, y, { align: 'center' });

  // ---------- Corps ----------
  y = headerH + 14;

  const drawRow = (label: string, value: string) => {
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kR, kG, kB);
    doc.text(`${label} :`, left, y);
    doc.setFont('helvetica', 'normal');
    const valueLines = wrapText(doc, value, contentW - labelColW);
    valueLines.forEach((line, i) => {
      doc.text(line, left + labelColW, y + i * 5.2);
    });
    y += Math.max(7.5, valueLines.length * 5.2 + 2.3);
  };

  const drawSectionTitle = (title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(kR, kG, kB);
    doc.text(title.toUpperCase(), left, y);
    doc.setDrawColor(yR, yG, yB);
    doc.setLineWidth(1.1);
    doc.line(left, y + 2.2, right, y + 2.2);
    y += 10;
  };

  // Détails du paiement
  drawSectionTitle(input.labels.paymentSection);
  drawRow(input.labels.id, input.receiptId);
  if (input.buyerEmail?.trim()) drawRow(input.labels.email, input.buyerEmail.trim());
  drawRow(input.labels.application, input.applicationName);
  drawRow(input.labels.date, input.purchasedAt.toLocaleString('fr-FR'));
  drawRow(input.labels.amount, formatPrice(input.totalAmount));
  drawRow(input.labels.options, input.optionsSummary);
  y += 6;

  // Fiche de l'application (sans lien de téléchargement)
  const article = input.article;
  if (article) {
    drawSectionTitle(input.labels.appSection);

    const logoSize = 24;
    const textLeft = appLogo ? left + logoSize + 7 : left;
    const blockTop = y;

    if (appLogo) {
      doc.setDrawColor(kR, kG, kB);
      doc.setLineWidth(0.3);
      doc.roundedRect(left, blockTop - 4.5, logoSize + 2, logoSize + 2, 2, 2, 'S');
      const ratio = appLogo.width / appLogo.height;
      const drawW = ratio >= 1 ? logoSize : logoSize * ratio;
      const drawH = ratio >= 1 ? logoSize / ratio : logoSize;
      doc.addImage(
        appLogo.dataUrl,
        'PNG',
        left + 1 + (logoSize - drawW) / 2,
        blockTop - 3.5 + (logoSize - drawH) / 2,
        drawW,
        drawH,
      );
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const titleText = article.version?.trim() ? `${article.nom} (${article.version.trim()})` : article.nom;
    const titleLines = wrapText(doc, titleText, right - textLeft);
    doc.text(titleLines, textLeft, y);
    y += titleLines.length * 6 + 0.5;

    if (article.categorie?.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.text(`${input.labels.category} : ${article.categorie.trim()}`, textLeft, y);
      y += 6;
    }

    if (appLogo) y = Math.max(y, blockTop + logoSize + 2);
    y += 3;

    if (article.description?.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(`${input.labels.description} :`, left, y);
      y += 5.4;
      doc.setFont('helvetica', 'normal');
      const descLines = wrapText(doc, article.description.trim(), contentW);
      descLines.forEach((line) => {
        doc.text(line, left, y);
        y += 5.2;
      });
      y += 2.5;
    }

    if (article.siteUrl?.trim()) drawRow(input.labels.website, article.siteUrl.trim());
    if (article.tel?.trim()) drawRow(input.labels.assistance, article.tel.trim());

    if (article.elements?.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(`${input.labels.included} :`, left, y);
      y += 5.6;
      doc.setFont('helvetica', 'normal');
      doc.setFillColor(kR, kG, kB);
      for (const el of article.elements) {
        const lines = wrapText(doc, el, contentW - 6);
        doc.circle(left + 1.2, y - 1.2, 0.8, 'F');
        lines.forEach((line, i) => {
          doc.text(line, left + 5, y + i * 5.2);
        });
        y += lines.length * 5.2 + 1;
      }
    }
  }

  // ---------- Pied de page ----------
  doc.setDrawColor(yR, yG, yB);
  doc.setLineWidth(1.1);
  doc.line(0, pageH - 16, pageW, pageH - 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(kR, kG, kB);
  doc.text(input.brandName, pageW / 2, pageH - 8.5, { align: 'center' });

  doc.save(`recu-${input.receiptId}.pdf`);
};
