export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateSlug(title: string): string {
  const base = slugify(title);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}
