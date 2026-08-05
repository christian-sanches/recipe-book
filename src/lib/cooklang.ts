// ── Cooklang metadata serialize/parse helpers ────────────────
// Uses the canonical metadata keys from cooklang.org/docs/conventions:
//   title, description/introduction, tags, source/source.name,
//   servings/serves/yield, prep time/time.prep, cook time/time.cook,
//   time/time required/duration (total), image/images/picture/pictures.
// Both `>> key: value` lines (legacy) and YAML frontmatter are read.

export interface CookRecipeData {
  title?: string | null;
  description?: string | null;
  source?: string | null;
  image?: string | null;
  servings?: number | null;
  prepTime?: number | null;
  cookTime?: number | null;
  totalTime?: number | null;
  tags?: string[];
  cooklangContent?: string;
}

export interface ParsedCookRecipe {
  title: string | null;
  description: string | null;
  source: string | null;
  image: string | null;
  servings: number | null;
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  tags: string[];
  cooklangContent: string;
}

// ── Note blocks ───────────────────────────────────────────────
// Notes (`> text` lines) are handled here because the official parser
// merges them into step text (or emits stray `>` chars) instead of
// exposing them as a dedicated element.

const NOTE_LINE = /^\s*>/;

export type RecipeBlock =
  | { type: "note"; lines: string[] }
  | { type: "cooklang"; lines: string[] };

// Split content into alternating cooklang/note blocks, preserving order.
export function splitRecipeBlocks(content: string): RecipeBlock[] {
  const lines = content.split(/\r?\n/);
  const blocks: RecipeBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === "") {
      i++;
      continue;
    }

    if (NOTE_LINE.test(line)) {
      const noteLines: string[] = [];
      while (i < lines.length && NOTE_LINE.test(lines[i]!)) {
        noteLines.push(lines[i]!);
        i++;
      }
      blocks.push({ type: "note", lines: noteLines });
    } else {
      const cookLines: string[] = [];
      while (
        i < lines.length &&
        lines[i]!.trim() !== "" &&
        !NOTE_LINE.test(lines[i]!)
      ) {
        cookLines.push(lines[i]!);
        i++;
      }
      blocks.push({ type: "cooklang", lines: cookLines });
    }
  }

  return blocks;
}

// Rebuild content without note lines so the parser produces only
// steps/sections. A note run in the middle of a paragraph is replaced
// with a blank line so the surrounding text stays separate steps.
export function cleanRecipeContent(content: string): string {
  const lines = content.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === "") {
      out.push("");
      i++;
      continue;
    }
    if (NOTE_LINE.test(line)) {
      let j = i;
      while (j < lines.length && NOTE_LINE.test(lines[j]!)) j++;
      const hasTextBefore = i > 0 && lines[i - 1]!.trim() !== "";
      const hasTextAfter = j < lines.length && lines[j]!.trim() !== "";
      if (hasTextBefore && hasTextAfter) out.push("");
      i = j;
    } else {
      out.push(line);
      i++;
    }
  }

  return out.join("\n");
}

// Join a note block's lines into display text (strips the `>` marker).
export function noteBlockToText(lines: string[]): string {
  return lines
    .map((l) => l.replace(/^\s*>/, "").replace(/^\s+/, ""))
    .join(" ")
    .trim();
}

const METADATA_LINE = /^>>\s+([^:]+):\s*(.*)$/;

// Remove the metadata block (YAML frontmatter or leading `>>` lines)
// from a .cook file, returning just the recipe body.
export function stripMetadata(content: string): string {
  const lines = content.split(/\r?\n/);
  let i = 0;

  while (i < lines.length && lines[i]!.trim() === "") i++;

  if (lines[i]?.trim() === "---") {
    i++;
    while (i < lines.length && lines[i]!.trim() !== "---") i++;
    i++;
  } else {
    while (i < lines.length && METADATA_LINE.test(lines[i]!)) i++;
  }

  while (i < lines.length && lines[i]!.trim() === "") i++;
  return lines.slice(i).join("\n").replace(/\n+$/, "");
}

// Parse a duration string like "45 minutes", "1h", "1h30m",
// "1 hour 30 minutes", or a plain number, into total minutes.
export function parseDurationToMinutes(
  value: string | null | undefined,
): number | null {
  if (!value) return null;
  const s = value.trim().toLowerCase();
  if (!s) return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);

  let total = 0;
  let matched = false;

  const hourRe = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h|horas?)/g;
  const minuteRe = /(\d+)\s*(?:minutes?|mins?|m|minutos?)/g;

  let m: RegExpExecArray | null;
  while ((m = hourRe.exec(s)) !== null) {
    total += Math.round(parseFloat(m[1]!) * 60);
    matched = true;
  }
  while ((m = minuteRe.exec(s)) !== null) {
    total += parseInt(m[1]!, 10);
    matched = true;
  }

  return matched ? total : null;
}

function parseServings(value: string): number | null {
  const m = value.trim().match(/^(\d+)/);
  return m ? parseInt(m[1]!, 10) : null;
}

function parseTags(value: string): string[] {
  let v = value.trim();
  if (v.startsWith("[") && v.endsWith("]")) v = v.slice(1, -1);
  return v
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function extractFirstValue(value: string): string | null {
  let v = value.trim();
  if (v.startsWith("[") && v.endsWith("]")) v = v.slice(1, -1);
  const first = v
    .split(",")
    .map((p) => p.trim())
    .find(Boolean);
  return first ?? null;
}

function extractMetadata(content: string): [string, string][] {
  const entries: [string, string][] = [];
  const lines = content.split(/\r?\n/);

  let i = 0;
  while (i < lines.length && lines[i]!.trim() === "") i++;

  if (lines[i]?.trim() === "---") {
    i++;
    while (i < lines.length && lines[i]!.trim() !== "---") {
      const line = lines[i]!;
      const listItem = line.match(/^\s*-\s+(.+)$/);
      const last = entries[entries.length - 1];
      if (listItem && last && last[0] === "tags") {
        last[1] = last[1] ? `${last[1]}, ${listItem[1]!.trim()}` : listItem[1]!.trim();
      } else {
        const kv = line.match(/^([^:]+):\s*(.*)$/);
        if (kv) entries.push([kv[1]!.trim(), kv[2]!.trim()]);
      }
      i++;
    }
  } else {
    while (i < lines.length) {
      const kv = lines[i]!.match(METADATA_LINE);
      if (!kv) break;
      entries.push([kv[1]!.trim(), kv[2]!.trim()]);
      i++;
    }
  }

  return entries;
}

// Serialize a recipe into a .cook file including all metadata in
// canonical Cooklang format. Existing metadata in the stored content
// is stripped so values come from the DB fields (no duplicates).
export function serializeRecipeToCook(data: CookRecipeData): string {
  const meta: string[] = [];
  const add = (key: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return;
    meta.push(`>> ${key}: ${value}`);
  };

  add("title", data.title);
  add("description", data.description);
  if (data.tags && data.tags.length > 0) {
    add("tags", data.tags.join(", "));
  }
  add("source", data.source);
  add("servings", data.servings);
  add(
    "prep time",
    data.prepTime != null ? `${data.prepTime} minutes` : undefined,
  );
  add(
    "cook time",
    data.cookTime != null ? `${data.cookTime} minutes` : undefined,
  );
  const total =
    data.totalTime ??
    (data.prepTime != null || data.cookTime != null
      ? (data.prepTime ?? 0) + (data.cookTime ?? 0)
      : null);
  add("time", total != null ? `${total} minutes` : undefined);
  add("image", data.image);

  const body = stripMetadata(data.cooklangContent ?? "").trim();

  const sections: string[] = [];
  if (meta.length > 0) sections.push(meta.join("\n"));
  if (body) sections.push(body);
  return sections.join("\n\n") + "\n";
}

// Parse a .cook file (or raw text) into form-ready fields.
export function parseCookFile(content: string): ParsedCookRecipe {
  const result: ParsedCookRecipe = {
    title: null,
    description: null,
    source: null,
    image: null,
    servings: null,
    prepTime: null,
    cookTime: null,
    totalTime: null,
    tags: [],
    cooklangContent: stripMetadata(content),
  };

  for (const [key, rawValue] of extractMetadata(content)) {
    const value = rawValue.trim();
    switch (key.toLowerCase()) {
      case "title":
        result.title = value;
        break;
      case "description":
      case "introduction":
        result.description = value;
        break;
      case "source":
      case "source.name":
        result.source = value;
        break;
      case "servings":
      case "serves":
      case "yield": {
        const n = parseServings(value);
        if (n !== null) result.servings = n;
        break;
      }
      case "prep time":
      case "prep_time":
      case "time.prep": {
        const n = parseDurationToMinutes(value);
        if (n !== null) result.prepTime = n;
        break;
      }
      case "cook time":
      case "cook_time":
      case "time.cook": {
        const n = parseDurationToMinutes(value);
        if (n !== null) result.cookTime = n;
        break;
      }
      case "time":
      case "time required":
      case "duration":
      case "time.total":
      case "total time": {
        const n = parseDurationToMinutes(value);
        if (n !== null) result.totalTime = n;
        break;
      }
      case "image":
      case "images":
      case "picture":
      case "pictures": {
        const first = extractFirstValue(value);
        if (first) result.image = first;
        break;
      }
      case "tags":
        result.tags = parseTags(value);
        break;
      default:
        break;
    }
  }

  return result;
}
