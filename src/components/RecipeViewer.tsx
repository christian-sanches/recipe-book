import { Card, Tag, Typography, Descriptions, Space } from "antd";
import {
  ClockCircleOutlined,
  FireOutlined,
} from "@ant-design/icons";
import { useMemo } from "react";

const { Title, Text, Paragraph } = Typography;

// Simple cooklang parser for display purposes
function parseCooklang(content: string) {
  const lines = content.split("\n");
  const steps: string[] = [];
  const ingredients: { name: string; quantity?: string; optional?: boolean }[] = [];
  const cookware: string[] = [];
  const timers: { quantity?: string }[] = [];
  const metadata: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse metadata
    const metaMatch = trimmed.match(/^>>\s*([\w\s]+?):\s*(.+)$/);
    if (metaMatch) {
      metadata[metaMatch[1]!.trim().toLowerCase()] = metaMatch[2]!.trim();
      continue;
    }

    if (!trimmed) continue;

    // Extract ingredients: @name{quantity} or @name
    const ingredientRegex = /@([?+-]?)(\w[\w\s]*?)(?:\{([^}]*)\})?/g;
    let match;
    while ((match = ingredientRegex.exec(trimmed)) !== null) {
      const modifier = match[1] || "";
      const name = match[2]?.trim() ?? "";
      const quantity = match[3]?.trim();
      if (name && !name.startsWith("&") && !name.startsWith("@")) {
        ingredients.push({
          name,
          quantity,
          optional: modifier === "?",
        });
      }
    }

    // Extract cookware: #name
    const cookwareRegex = /#(\w[\w\s]*?)(?:\{([^}]*)\})?/g;
    while ((match = cookwareRegex.exec(trimmed)) !== null) {
      const name = match[1]?.trim() ?? "";
      if (name) cookware.push(name);
    }

    // Extract timers: ~{quantity}
    const timerRegex = /~\{(.+?)\}|~(\w+)\{(.+?)\}/g;
    while ((match = timerRegex.exec(trimmed)) !== null) {
      timers.push({ quantity: match[1] || match[3] });
    }

    steps.push(trimmed);
  }

  return { steps, ingredients, cookware, timers, metadata };
}

function renderCooklangText(text: string): string {
  return text
    .replace(
      /@([?+-]?)(\w[\w\s]*?)(?:\{([^}]*)\})?/g,
      (_, modifier, name, qty) => {
        const prefix = modifier === "?" ? "(optional) " : "";
        return `${prefix}[${name}${qty ? `: ${qty}` : ""}]`;
      }
    )
    .replace(/#(\w[\w\s]*?)(?:\{([^}]*)\})?/g, "{$1}")
    .replace(/~\{(.+?)\}|~(\w+)\{(.+?)\}/g, "⏱ $1$3");
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
  const parsed = useMemo(() => parseCooklang(cooklangContent), [cooklangContent]);

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

      {/* Ingredients */}
      {parsed.ingredients.length > 0 && (
        <>
          <Title level={3}>Ingredients</Title>
          <Card size="small" style={{ marginBottom: 24 }}>
            {parsed.ingredients.map((ing, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  borderBottom:
                    i < parsed.ingredients.length - 1 ? "1px solid #f0f0f0" : "none",
                }}
              >
                <Text
                  delete={ing.optional}
                  type={ing.optional ? "secondary" : undefined}
                >
                  {ing.optional && (
                    <Tag style={{ fontSize: 10, marginRight: 4 }}>Optional</Tag>
                  )}
                  {ing.name}
                </Text>
                {ing.quantity && <Text code>{ing.quantity}</Text>}
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Cookware */}
      {parsed.cookware.length > 0 && (
        <>
          <Title level={3}>Cookware</Title>
          <Space wrap style={{ marginBottom: 24 }}>
            {[...new Set(parsed.cookware)].map((item, i) => (
              <Tag key={i} color="processing">
                {item}
              </Tag>
            ))}
          </Space>
        </>
      )}

      {/* Steps */}
      {parsed.steps.length > 0 && (
        <>
          <Title level={3}>Instructions</Title>
          {parsed.steps.map((step, i) => (
            <Paragraph
              key={i}
              style={{
                padding: "8px 12px",
                background: i % 2 === 0 ? "#fafafa" : "transparent",
                borderRadius: 6,
                marginBottom: 4,
              }}
            >
              <Text strong style={{ marginRight: 8 }}>
                {i + 1}.
              </Text>
              {renderCooklangText(step)}
            </Paragraph>
          ))}
        </>
      )}
    </div>
  );
}
