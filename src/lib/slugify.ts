const ACCENT_MAP: Record<string, string> = {
  À: 'A', Á: 'A', Â: 'A', Ã: 'A', Ä: 'A', Å: 'A',
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a',
  È: 'E', É: 'E', Ê: 'E', Ë: 'E',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  Ì: 'I', Í: 'I', Î: 'I', Ï: 'I',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  Ò: 'O', Ó: 'O', Ô: 'O', Õ: 'O', Ö: 'O',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o',
  Ù: 'U', Ú: 'U', Û: 'U', Ü: 'U',
  ù: 'u', ú: 'u', û: 'u', ü: 'u',
  Ç: 'C', ç: 'c',
  Ñ: 'N', ñ: 'n',
};

export function slugify(input: string): string {
  return input
    .split('')
    .map((char) => ACCENT_MAP[char] ?? char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
