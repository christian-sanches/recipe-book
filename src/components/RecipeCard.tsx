import { Card, Tag, Typography, Space } from "antd";
import { ClockCircleOutlined, FireOutlined, UserOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Text, Paragraph } = Typography;

interface RecipeCardProps {
  recipe: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    cooklangContent: string;
    servings: number | null;
    prepTime: number | null;
    cookTime: number | null;
    totalTime: number | null;
    image: string | null;
    tags: { tag: { id: string; name: string; slug: string } }[];
  };
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const totalTime = recipe.totalTime ?? (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);

  return (
    <Link href={`/recipes/${recipe.slug}`} style={{ textDecoration: "none" }}>
      <Card
        hoverable
        cover={
          recipe.image ? (
            <img
              alt={recipe.title}
              src={recipe.image}
              style={{ height: 180, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                height: 120,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FireOutlined style={{ fontSize: 40, color: "rgba(255,255,255,0.6)" }} />
            </div>
          )
        }
        bodyStyle={{ padding: 12 }}
      >
        <Card.Meta
          title={
            <Text strong ellipsis style={{ fontSize: 16 }}>
              {recipe.title}
            </Text>
          }
          description={
            <>
              {recipe.description && (
                <Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ marginBottom: 8, color: "#666" }}
                >
                  {recipe.description}
                </Paragraph>
              )}
              <Space size={16}>
                {totalTime > 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <ClockCircleOutlined /> {totalTime} min
                  </Text>
                )}
                {recipe.servings && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <UserOutlined /> {recipe.servings} servings
                  </Text>
                )}
              </Space>
              {recipe.tags.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {recipe.tags.slice(0, 3).map((rt) => (
                    <Tag key={rt.tag.id} style={{ fontSize: 11 }}>
                      {rt.tag.name}
                    </Tag>
                  ))}
                </div>
              )}
            </>
          }
        />
      </Card>
    </Link>
  );
}
