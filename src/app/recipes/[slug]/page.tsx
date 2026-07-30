"use client";

import { use, useCallback } from "react";
import Head from "next/head";
import { Button, Spin, Typography, Space, Tag, message, Modal } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "~/components/Layout";
import RecipeViewer from "~/components/RecipeViewer";
import { api } from "~/trpc/react";
import { useTranslation } from "~/i18n";

const { Title } = Typography;

export default function RecipeDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { t } = useTranslation();

  const { data: recipe, isLoading, error } = api.recipe.bySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  const utils = api.useUtils();
  const deleteRecipe = api.recipe.delete.useMutation({
    onSuccess: () => {
      message.success(t("Recipe deleted"));
      utils.recipe.list.invalidate();
      router.push("/");
    },
    onError: (err) => message.error(err.message),
  });

  const handleDelete = useCallback(() => {
    if (!recipe) return;
    Modal.confirm({
      title: t("Delete recipe?"),
      content: `${t("Are you sure you want to delete")} "${recipe.title}"?`,
      okText: t("Delete"),
      okType: "danger",
      onOk: () => deleteRecipe.mutate({ id: recipe.id }),
    });
  }, [recipe, deleteRecipe]);

  const handleExport = useCallback(() => {
    if (!recipe) return;
    try {
      const blob = new Blob([recipe.cooklangContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${recipe.slug}.cook`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error(t("Failed to export"));
    }
  }, [recipe]);

  if (isLoading) {
    return (
      <Layout>
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  if (error || !recipe) {
    return (
      <Layout>
        <div style={{ textAlign: "center", padding: 60 }}>
          <Title level={3}>{t("Recipe not found")}</Title>
          <Link href="/">{t("Back to recipes")}</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{recipe.title} - Recipe Book</title>
      </Head>

      <Space style={{ marginBottom: 16 }}>
        <Link href="/">
          <Button icon={<ArrowLeftOutlined />}>{t("Back")}</Button>
        </Link>
      </Space>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0 }}>
            {recipe.title}
          </Title>
          {recipe.tags.length > 0 && (
            <Space wrap style={{ marginTop: 8 }}>
              {recipe.tags.map((rt: { tag: { id: string; name: string; slug: string } }) => (
                <Link key={rt.tag.id} href={`/?tag=${rt.tag.slug}`}>
                  <Tag color="blue">{rt.tag.name}</Tag>
                </Link>
              ))}
            </Space>
          )}
          {recipe.visibility === "HIDDEN" && (
            <Tag color="orange" style={{ marginTop: 8 }}>
              {t("Hidden")}
            </Tag>
          )}
        </div>

        {isAdmin && (
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              {t("Export .cook")}
            </Button>
            <Link href={`/recipes/${recipe.slug}/edit`}>
              <Button icon={<EditOutlined />}>{t("Edit")}</Button>
            </Link>
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
              {t("Delete")}
            </Button>
          </Space>
        )}
      </div>

      <RecipeViewer
        cooklangContent={recipe.cooklangContent}
        title={recipe.title}
        description={recipe.description}
        servings={recipe.servings}
        prepTime={recipe.prepTime}
        cookTime={recipe.cookTime}
        totalTime={recipe.totalTime}
        source={recipe.source}
      />
    </Layout>
  );
}
