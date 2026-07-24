export function normalizeTurkishIdentityNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidTurkishIdentityNumber(value: string) {
  const identityNumber = normalizeTurkishIdentityNumber(value);

  if (!/^\d{11}$/.test(identityNumber) || identityNumber[0] === "0") return false;

  const digits = [...identityNumber].map(Number);
  const oddTotal = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenTotal = digits[1] + digits[3] + digits[5] + digits[7];
  const tenthDigit = ((oddTotal * 7) - evenTotal) % 10;
  const eleventhDigit = digits.slice(0, 10).reduce((total, digit) => total + digit, 0) % 10;

  return digits[9] === tenthDigit && digits[10] === eleventhDigit;
}
