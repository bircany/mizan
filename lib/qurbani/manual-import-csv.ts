export const QURBANI_IMPORT_COLUMNS = [
  "orderGroup",
  "productId",
  "shareholderName",
  "phone",
  "buyerName",
  "buyerPhone",
  "paymentReference",
  "proxyMethod",
  "proxyAt",
] as const;

export type QurbaniImportRow = Record<
  (typeof QURBANI_IMPORT_COLUMNS)[number],
  string
>;

function parseLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      cells.push(value.trim());
      value = "";
    } else value += character;
  }
  cells.push(value.trim());
  return cells;
}

export function parseQurbaniImportCsv(source: string) {
  const lines = source
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2) throw new Error("CSV başlık ve en az bir veri satırı içermelidir.");
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = parseLine(lines[0], delimiter);
  for (const column of QURBANI_IMPORT_COLUMNS)
    if (!headers.includes(column)) throw new Error(`CSV sütunu eksik: ${column}`);
  if (lines.length > 501) throw new Error("Tek içe aktarmada en fazla 500 satır kabul edilir.");

  return lines.slice(1).map((line, index): QurbaniImportRow => {
    const cells = parseLine(line, delimiter);
    const record = Object.fromEntries(
      headers.map((header, cellIndex) => [header, cells[cellIndex] || ""]),
    ) as QurbaniImportRow;
    const rowNumber = index + 2;
    for (const field of [
      "orderGroup",
      "productId",
      "shareholderName",
      "buyerName",
      "buyerPhone",
      "paymentReference",
      "proxyMethod",
      "proxyAt",
    ] as const)
      if (!record[field]) throw new Error(`${rowNumber}. satırda ${field} zorunludur.`);
    if (!["phone", "written", "digital"].includes(record.proxyMethod))
      throw new Error(`${rowNumber}. satırda proxyMethod phone, written veya digital olmalıdır.`);
    if (Number.isNaN(Date.parse(record.proxyAt)))
      throw new Error(`${rowNumber}. satırda proxyAt geçerli bir tarih olmalıdır.`);
    return record;
  });
}

export function groupQurbaniImportRows(rows: QurbaniImportRow[]) {
  const grouped = new Map<string, QurbaniImportRow[]>();
  for (const row of rows) grouped.set(row.orderGroup, [...(grouped.get(row.orderGroup) || []), row]);
  return [...grouped.entries()].map(([orderGroup, groupRows]) => {
    const first = groupRows[0];
    for (const row of groupRows)
      if (
        row.productId !== first.productId ||
        row.buyerName !== first.buyerName ||
        row.buyerPhone !== first.buyerPhone ||
        row.paymentReference !== first.paymentReference ||
        row.proxyMethod !== first.proxyMethod ||
        row.proxyAt !== first.proxyAt
      )
        throw new Error(`${orderGroup} grubundaki ortak sipariş alanları aynı olmalıdır.`);
    return {
      orderGroup,
      productId: first.productId,
      buyerName: first.buyerName,
      buyerPhone: first.buyerPhone,
      paymentReference: first.paymentReference,
      proxyMethod: first.proxyMethod as "phone" | "written" | "digital",
      proxyAt: new Date(first.proxyAt).toISOString(),
      shareholders: groupRows.map((row) => ({
        name: row.shareholderName,
        phone: row.phone || first.buyerPhone,
      })),
    };
  });
}
