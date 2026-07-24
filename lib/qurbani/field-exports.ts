import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export type QurbaniFieldShareRow = {
  ownerName: string;
  phone: string;
  shareCount: number;
};

export type QurbaniFieldAnimal = {
  code: string;
  kindLabel: string;
  uploadUrl: string;
  shares: QurbaniFieldShareRow[];
};

export type QurbaniFieldPackageExport = {
  packageCode: string;
  countryName: string;
  operatorName: string;
  preparedAt: Date;
  animals: QurbaniFieldAnimal[];
};

function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function pdfText(value: unknown) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
}

async function registerPdfFonts(doc: jsPDF) {
  const fontRoot = path.join(
    process.cwd(),
    "node_modules",
    "dejavu-fonts-ttf",
    "ttf",
  );
  const [regular, bold] = await Promise.all([
    readFile(path.join(fontRoot, "DejaVuSans.ttf")),
    readFile(path.join(fontRoot, "DejaVuSans-Bold.ttf")),
  ]);
  doc.addFileToVFS("DejaVuSans.ttf", regular.toString("base64"));
  doc.addFileToVFS("DejaVuSans-Bold.ttf", bold.toString("base64"));
  doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
  doc.addFont("DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
  doc.setFont("DejaVuSans", "normal");
}

export async function generateQurbaniFieldPackagePdf(
  input: QurbaniFieldPackageExport,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await registerPdfFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const pageHeader = () => {
    doc.setFillColor(236, 243, 237);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 26, 3, 3, "F");
    doc.setTextColor(26, 69, 54);
    doc.setFont("DejaVuSans", "bold");
    doc.setFontSize(15);
    doc.text("Mizan Derneği - Kurban Saha Görev Listesi", margin + 6, y + 9);
    doc.setFont("DejaVuSans", "normal");
    doc.setFontSize(8.5);
    doc.text(
      `${pdfText(input.packageCode)}  •  ${pdfText(input.countryName)}  •  ${pdfText(input.operatorName)}`,
      margin + 6,
      y + 17,
    );
    doc.text(
      new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(input.preparedAt),
      pageWidth - margin - 6,
      y + 17,
      { align: "right" },
    );
    y += 34;
  };

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
    pageHeader();
  };

  pageHeader();
  for (const animal of input.animals) {
    const rowHeight = Math.max(30, animal.shares.length * 7 + 20);
    ensureSpace(Math.min(rowHeight, 90));

    doc.setDrawColor(202, 216, 205);
    doc.setFillColor(251, 250, 246);
    doc.roundedRect(margin, y, pageWidth - margin * 2, rowHeight, 2.5, 2.5, "FD");
    doc.setTextColor(24, 55, 44);
    doc.setFont("DejaVuSans", "bold");
    doc.setFontSize(12);
    doc.text(pdfText(animal.code), margin + 5, y + 8);
    doc.setFont("DejaVuSans", "normal");
    doc.setFontSize(8);
    doc.text(pdfText(animal.kindLabel), margin + 5, y + 13);

    const qrData = await QRCode.toDataURL(animal.uploadUrl, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 256,
    });
    doc.addImage(qrData, "PNG", pageWidth - margin - 25, y + 4, 20, 20);

    let shareY = y + 21;
    doc.setFontSize(8.5);
    for (const share of animal.shares) {
      ensureSpace(8);
      const line = `${pdfText(share.ownerName)}  •  ${pdfText(share.phone)}  •  ${share.shareCount} hisse`;
      doc.text(line, margin + 5, shareY, { maxWidth: pageWidth - margin * 2 - 36 });
      shareY += 7;
    }
    y += rowHeight + 5;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("DejaVuSans", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(91, 108, 98);
    doc.text(
      `Sayfa ${page}/${pageCount} - Bu liste kişisel veri içerir; yalnız atanmış saha görevi için kullanılmalıdır.`,
      pageWidth / 2,
      pageHeight - 7,
      { align: "center" },
    );
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export function generateQurbaniFieldPackageExcel(input: QurbaniFieldPackageExport) {
  const rows = input.animals.flatMap((animal) =>
    animal.shares.map((share) => [
      input.packageCode,
      input.countryName,
      animal.code,
      animal.kindLabel,
      share.ownerName,
      share.phone,
      share.shareCount,
      animal.uploadUrl,
    ]),
  );
  const headers = [
    "Paket Kodu",
    "Ülke",
    "Kurban Kodu",
    "Tür",
    "Hissedar Adı",
    "Telefon",
    "Hisse Sayısı",
    "Görev Yükleme Bağlantısı",
  ];
  const cell = (value: unknown, number = false) =>
    `<Cell><Data ss:Type="${number ? "Number" : "String"}">${xmlEscape(value)}</Data></Cell>`;
  const tableRows = [
    `<Row ss:StyleID="Header">${headers.map((value) => cell(value)).join("")}</Row>`,
    ...rows.map(
      (row) =>
        `<Row>${row.map((value, index) => cell(value, index === 6)).join("")}</Row>`,
    ),
  ].join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Aptos" ss:Size="10"/></Style>
  <Style ss:ID="Header"><Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#245B48" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="Saha Görev Listesi"><Table>
  <Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="90"/>
  <Column ss:Width="180"/><Column ss:Width="110"/><Column ss:Width="75"/><Column ss:Width="260"/>
  ${tableRows}
 </Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>
</Workbook>`;
  return Buffer.from(xml, "utf8");
}
