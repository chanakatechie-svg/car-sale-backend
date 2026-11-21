/** Length of the id prefix appended to every slug (hex characters of the UUID). */
export const SLUG_ID_LENGTH = 8;

/** Lower-case, ASCII-only, hyphen-separated words: "Mercedes-Benz E 300 AMG" → "mercedes-benz-e-300-amg". */
export function slugify(text: string, maxLength = 90): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents (é → e)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/** Fields that make up a vehicle's URL. */
export interface SlugSource {
  id: string;
  year: number;
  make: string;
  model: string;
  variant?: string | null;
}

/** "{year}-{make}-{model}-{variant}-{first 8 of id}" */
export function vehicleSlug(v: SlugSource): string {
  const title = slugify([v.year, v.make, v.model, v.variant].filter(Boolean).join(' '));
  const code = v.id.replace(/-/g, '').slice(0, SLUG_ID_LENGTH).toLowerCase();
  return title ? `${title}-${code}` : code;
}

/** The id-prefix code at the end of a slug, if it has one. */
export function slugIdCode(slug: string): string | null {
  const match = new RegExp(`(?:^|-)([0-9a-f]{${SLUG_ID_LENGTH}})$`).exec(slug.toLowerCase());
  return match ? match[1] : null;
}
