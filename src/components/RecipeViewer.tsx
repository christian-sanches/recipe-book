import { Card, Tag, Typography, Descriptions, Space } from "antd";
import { ClockCircleOutlined, FireOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import { CooklangParser, HTMLRenderer } from "@cooklang/cooklang";

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

      const uniqueIngredients = recipe.ingredients.filter(
        (ing: any, i: number, arr: any[]) =>
          arr.findIndex((x: any) => x.name === ing.name) === i
      );
      const uniqueCookware = [
        ...new Set(recipe.cookware.map((c: any) => c.name)),
      ] as string[];

      const stepsHtml = renderSectionsOnly(recipe);

      return { html: stepsHtml, ingredients: uniqueIngredients, cookware: uniqueCookware };
    } catch {
      return {
        html: `<p>${cooklangContent}</p>`,
        ingredients: [],
        cookware: [],
      };
    }
  }, [cooklangContent]);

  return (
    <div>
      {(servings || prepTime || cookTime || totalTime) && (
        <Descriptions column={{ xs: 1, sm: 2, md: 4 }} style={{ marginBottom: 24 }}>
          {servings && (
            <Descriptions.Item label="Servings">{servings}</Descriptions.Item>
          )}
          {prepTime && (
            <Descriptions.Item label="Prep time">
              <ClockCircleOutlined /> {prepTime} min
            </Descriptions.Item>
          )}
          {cookTime && (
            <Descriptions.Item label="Cook time">
              <FireOutlined /> {cookTime} min
            </Descriptions.Item>
          )}
          {totalTime && (
            <Descriptions.Item label="Total time">
              <ClockCircleOutlined /> {totalTime} min
            </Descriptions.Item>
          )}
        </Descriptions>
      )}

      {source && (
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Source: {source}
        </Paragraph>
      )}

      {rendered.ingredients.length > 0 && (
        <>
          <Title level={3}>Ingredients</Title>
          <Card size="small" style={{ marginBottom: 24 }}>
            {rendered.ingredients.map((ing: any, i: number) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  borderBottom:
                    i < rendered.ingredients.length - 1 ? "1px solid #f0f0f0" : "none",
                }}
              >
                <Text>{ing.name}</Text>
              </div>
            ))}
          </Card>
        </>
      )}

      {rendered.cookware.length > 0 && (
        <>
          <Title level={3}>Cookware</Title>
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
          <Title level={3}>Instructions</Title>
          <div
            className="cooklang-steps"
            dangerouslySetInnerHTML={{ __html: rendered.html }}
          />
        </>
      )}
    </div>
  );
}
