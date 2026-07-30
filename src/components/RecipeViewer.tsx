import { Card, Tag, Typography, Descriptions, Space } from "antd";
import { ClockCircleOutlined, FireOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import { CooklangParser, HTMLRenderer } from "@cooklang/cooklang";
import { useTranslation } from "~/i18n";

const { Title, Text, Paragraph } = Typography;

function renderSectionsOnly(recipe: any): string {
  const renderer = new HTMLRenderer();
  const full = renderer.render(recipe);
  const hrIndex = full.lastIndexOf("<hr>");
  if (hrIndex !== -1) {
    return full.slice(hrIndex + 4);
  }
  return full;
}

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
      const parser = new CooklangParser();
      const [recipe] = parser.parse(cooklangContent);

      const ingredients = aggregateIngredients(recipe.ingredients);
      const uniqueCookware = [
        ...new Set(recipe.cookware.map((c: any) => c.name)),
      ] as string[];

      const stepsHtml = renderSectionsOnly(recipe);

      return { html: stepsHtml, ingredients, cookware: uniqueCookware };
    } catch {
      return {
        html: `<p>${cooklangContent}</p>`,
        ingredients: [] as AggregatedIngredient[],
        cookware: [],
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

      {rendered.html && (
        <>
          <Title level={3}>{t("Instructions")}</Title>
          <div
            className="cooklang-steps"
            dangerouslySetInnerHTML={{ __html: rendered.html }}
          />
        </>
      )}
    </div>
  );
}
