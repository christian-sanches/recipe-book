import Head from "next/head";
import { useSession } from "next-auth/react";
import { Input, Typography, Spin, Empty, Row, Col, Tag as AntTag, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useState } from "react";
import Layout from "~/components/Layout";
import RecipeCard from "~/components/RecipeCard";
import { api } from "~/utils/api";

const { Title } = Typography;

export default function Home() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: tagsData } = api.tag.list.useQuery();
  const { data: recipesData, isLoading } = api.recipe.list.useQuery({
    query: searchQuery || undefined,
    tagSlugs: selectedTags.length > 0 ? selectedTags : undefined,
    limit: 50,
  });

  const handleTagClick = (slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]
    );
  };

  return (
    <Layout>
      <Head>
        <title>Recipe Book</title>
        <meta name="description" content="A cookbook powered by Cooklang" />
      </Head>

      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ marginTop: 0 }}>
          {session ? "My Recipes" : "Recipe Book"}
        </Title>

        <Input
          placeholder="Search recipes by name, ingredient, or keyword..."
          prefix={<SearchOutlined />}
          size="large"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 500, marginBottom: 16 }}
          allowClear
        />

        {tagsData && tagsData.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Space wrap size={[4, 8]}>
              {tagsData.map((tag: { slug: string; name: string; _count: { recipes: number } }) => (
                <AntTag
                  key={tag.slug}
                  color={selectedTags.includes(tag.slug) ? "blue" : "default"}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleTagClick(tag.slug)}
                >
                  {tag.name} ({tag._count.recipes})
                </AntTag>
              ))}
            </Space>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : recipesData && recipesData.items.length > 0 ? (
        <Row gutter={[16, 16]}>
          {recipesData.items.map((recipe: { id: string; slug: string; title: string; description: string | null; cooklangContent: string; servings: number | null; prepTime: number | null; cookTime: number | null; totalTime: number | null; image: string | null; tags: { tag: { id: string; name: string; slug: string } }[] }) => (
            <Col key={recipe.id} xs={24} sm={12} md={8} lg={6}>
              <RecipeCard recipe={recipe} />
            </Col>
          ))}
        </Row>
      ) : (
        <Empty
          description="No recipes found"
          style={{ padding: 60 }}
        />
      )}
    </Layout>
  );
}
