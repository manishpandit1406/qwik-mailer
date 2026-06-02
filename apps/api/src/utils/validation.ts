export function isRelatedToCompany(companyName: string | null | undefined, valueToTest: string): boolean {
  if (!companyName) return false;
  if (!valueToTest) return false;

  const normalizedCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedValue = valueToTest.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Direct substring match
  if (normalizedValue.includes(normalizedCompany) || normalizedCompany.includes(normalizedValue)) {
    if (normalizedValue.length >= 3 || normalizedCompany.length >= 3) {
      return true;
    }
  }

  // Word-by-word match (if any word in company name of length >= 3 is in the value)
  const words = companyName.toLowerCase().split(/[^a-z0-9]/).filter(w => w.length >= 3);
  for (const word of words) {
    if (normalizedValue.includes(word)) {
      return true;
    }
  }

  return false;
}
