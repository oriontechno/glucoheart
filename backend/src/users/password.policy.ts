export function validatePasswordStrength(pw: string): string[] {
  const issues: string[] = [];
  if (pw.length < 8) issues.push('Minimal 8 karakter');
  if (!/[a-z]/.test(pw)) issues.push('Harus ada huruf kecil');
  if (!/[A-Z]/.test(pw)) issues.push('Harus ada huruf besar');
  if (!/[0-9]/.test(pw)) issues.push('Harus ada angka');
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push('Harus ada simbol');
  return issues;
}
