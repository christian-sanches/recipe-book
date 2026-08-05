import { Card, Tag, Typography, Descriptions, Space } from "antd";
import { ClockCircleOutlined, FireOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import {
  CooklangParser,
  quantity_display,
  ingredient_display_name,
  cookware_display_name,
} from "@cooklang/cooklang";
import { useTranslation } from "~/i18n";
import {
  splitRecipeBlocks,
  cleanRecipeContent,
  noteBlockToText,
} from "~/lib/cooklang";

const { Title, Text, Paragraph } = Typography;

// ── Ingredient aggregation ─────────────────────────────────────
interface AggregatedIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
}

function extractQty(ing: any): number | null {
  try {
    const v = ing.quantity?.value?.value?.value;
    return typeof v === "number" ? v : null;
  } catch {
    return null;
  }
}

function aggregateIngredients(ingredients: any[]): AggregatedIngredient[] {
  const map = new Map<string, AggregatedIngredient>();

  for (const ing of ingredients) {
    // Build a dedup key that includes the note so different preparations
    // (e.g. beaten egg vs whole egg) are listed separately
    const note = ing.note ?? null;
    const key = `${ing.name.toLowerCase()}::${note ?? ""}`;
    const qty = extractQty(ing);
    const unit = ing.quantity?.unit ?? null;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { name: ing.name, quantity: qty, unit, note });
    } else if (qty !== null && existing.unit === unit && unit !== null) {
      existing.quantity = (existing.quantity ?? 0) + qty;
    } else if (qty !== null && existing.quantity === null) {
      existing.quantity = qty;
      existing.unit = unit;
    }
  }

  return Array.from(map.values());
}

function formatQty(qty: number | null, unit: string | null, t: (key: string) => string): string {
  if (qty === null && !unit) return "";
  if (qty === null) return `(${t("to taste")})`;
  const formatted = Number.isInteger(qty) ? qty.toString() : qty.toFixed(1);
  return unit ? `${formatted} ${unit}` : formatted;
}

// ── Step/note/section rendering ───────────────────────────────
type RenderItem =
  | { kind: "section"; name: string; index: number }
  | { kind: "step"; step: any }
  | { kind: "note"; text: string }
  | { kind: "text"; value: string };

interface RenderedRecipe {
  recipe: any;
  renderList: RenderItem[];
}

function buildRenderedRecipe(cooklangContent: string): RenderedRecipe {
  const blocks = splitRecipeBlocks(cooklangContent);
  const clean = cleanRecipeContent(cooklangContent);

  const parser = new CooklangParser();
  const [recipe] = parser.parse(clean);
  const sections = recipe.sections ?? [];

  const parseUnits: RenderItem[] = [];
  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const section = sections[sIdx];
    if (section.name) {
      parseUnits.push({ kind: "section", name: section.name, index: sIdx + 1 });
    }
    for (const content of section.content ?? []) {
      if (content.type === "step") parseUnits.push({ kind: "step", step: content.value });
      else if (content.type === "text") parseUnits.push({ kind: "text", value: content.value });
    }
  }

  const renderList: RenderItem[] = [];
  // The HTML renderer shows an implicit header for an unnamed first
  // section when the recipe has more than one section.
  if (sections.length > 1 && !sections[0].name) {
    renderList.push({ kind: "section", name: "Section 1", index: 1 });
  }

  let unitIdx = 0;
  for (const block of blocks) {
    if (block.type === "note") {
      const text = noteBlockToText(block.lines);
      if (text) renderList.push({ kind: "note", text });
      continue;
    }
    const unit = parseUnits[unitIdx];
    unitIdx++;
    if (unit) renderList.push(unit);
  }
  for (; unitIdx < parseUnits.length; unitIdx++) {
    renderList.push(parseUnits[unitIdx]!);
  }

  return { recipe, renderList };
}

// ── Component ──────────────────────────────────────────────────
interface RecipeViewerProps {
  cooklangContent: string;
  title: string;
  description?: string | null;
  servings?: number | null;
  prepTime?: number | null;
  cookTime?: number | null;
  totalTime?: number | null;
  source?: string | null;
}

export default function RecipeViewer({
  cooklangContent,
  servings,
  prepTime,
  cookTime,
  totalTime,
  source,
}: RecipeViewerProps) {
  const rendered = useMemo(() => {
    try {
      const { recipe, renderList } = buildRenderedRecipe(cooklangContent);

      const ingredients = aggregateIngredients(recipe.ingredients);
      const uniqueCookware = [
        ...new Set(recipe.cookware.map((c: any) => c.name)),
      ] as string[];

      return { recipe, renderList, ingredients, cookware: uniqueCookware };
    } catch {
      return {
        recipe: null,
        renderList: [{ kind: "text", value: cooklangContent }] as RenderItem[],
        ingredients: [] as AggregatedIngredient[],
        cookware: [] as string[],
      };
    }
  }, [cooklangContent]);

  const { t } = useTranslation();

  return (
    <div>
      {(servings || prepTime || cookTime || totalTime) && (
        <Descriptions column={{ xs: 1, sm: 2, md: 4 }} style={{ marginBottom: 24 }}>
          {servings && (
            <Descriptions.Item label={t("Servings")}>{servings}</Descriptions.Item>
          )}
          {prepTime && (
            <Descriptions.Item label={t("Prep time")}>
              <ClockCircleOutlined /> {prepTime}{t(" min")}
            </Descriptions.Item>
          )}
          {cookTime && (
            <Descriptions.Item label={t("Cook time")}>
              <FireOutlined /> {cookTime}{t(" min")}
            </Descriptions.Item>
          )}
          {totalTime && (
            <Descriptions.Item label={t("Total time")}>
              <ClockCircleOutlined /> {totalTime}{t(" min")}
            </Descriptions.Item>
          )}
        </Descriptions>
      )}

      {source && (
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {t("Source:")} {source}
        </Paragraph>
      )}

      {rendered.ingredients.length > 0 && (
        <>
          <Title level={3}>{t("Ingredients")}</Title>
          <Card size="small" style={{ marginBottom: 24 }}>
            {rendered.ingredients.map((ing, i) => {
              const qtyText = formatQty(ing.quantity, ing.unit, t);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom:
                      i < rendered.ingredients.length - 1
                        ? "1px solid var(--border-color, #f0f0f0)"
                        : "none",
                  }}
                >
                  <Text>
                    {ing.name}
                    {ing.note ? <Text type="secondary"> ({ing.note})</Text> : null}
                  </Text>
                  <Text
                    type="secondary"
                    style={{
                      fontFamily: "monospace",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      marginLeft: 16,
                    }}
                  >
                    {qtyText || "\u00A0"}
                  </Text>
                </div>
              );
            })}
          </Card>
        </>
      )}

      {rendered.cookware.length > 0 && (
        <>
          <Title level={3}>{t("Cookware")}</Title>
          <Space wrap style={{ marginBottom: 24 }}>
            {rendered.cookware.map((item: string, i: number) => (
              <Tag key={i} color="processing">
                {item}
              </Tag>
            ))}
          </Space>
        </>
      )}

      {rendered.renderList.length > 0 && (
        <>
          <Title level={3}>{t("Instructions")}</Title>
          <div className="cooklang-steps">
            {rendered.renderList.map((item, i) => {
              if (item.kind === "section") {
                return (
                  <h3 key={i} className="cooklang-section">
                    ({item.index}) {item.name}
                  </h3>
                );
              }
              if (item.kind === "note") {
                return (
                  <div key={i} className="cooklang-note">
                    <span className="cooklang-note-label">{t("Note")}:</span>
                    {item.text}
                  </div>
                );
              }
              if (item.kind === "step" && rendered.recipe) {
                const step = item.step;
                return (
                  <p key={i} className="cooklang-step">
                    <b>{step.number}. </b>
                    {step.items.map((it: any, j: number) => {
                      switch (it.type) {
                        case "text":
                          return it.value;
                        case "ingredient": {
                          const ing = rendered.recipe.ingredients[it.index];
                          return (
                            <span key={j} className="ingredient">
                              {ingredient_display_name(ing)}
                              {ing.quantity ? (
                                <i>({quantity_display(ing.quantity)})</i>
                              ) : null}
                            </span>
                          );
                        }
                        case "timer": {
                          const tm = rendered.recipe.timers[it.index];
                          return (
                            <span key={j} className="timer">
                              {tm.name ? `(${tm.name})` : ""}
                              {tm.quantity ? (
                                <i>{quantity_display(tm.quantity)}</i>
                              ) : (
                                ""
                              )}
                            </span>
                          );
                        }
                        case "inlineQuantity": {
                          const q = rendered.recipe.inlineQuantities[it.index];
                          return (
                            <i key={j} className="temp">
                              ({quantity_display(q)})
                            </i>
                          );
                        }
                        case "cookware": {
                          const cw = rendered.recipe.cookware[it.index];
                          return (
                            <span key={j} className="cookware">
                              {cookware_display_name(cw)}
                              {cw.quantity ? (
                                <i>({quantity_display(cw.quantity)})</i>
                              ) : null}
                            </span>
                          );
                        }
                        default:
                          return null;
                      }
                    })}
                  </p>
                );
              }
              if (item.kind === "text") {
                return <p key={i}>{item.value}</p>;
              }
              return <p key={i} />;
            })}
          </div>
        </>
      )}
    </div>
  );
}
