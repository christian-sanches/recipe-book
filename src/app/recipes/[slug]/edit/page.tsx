"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { Spin } from "antd";
import Layout from "~/components/Layout";
import RecipeForm from "~/components/RecipeForm";
import { api } from "~/trpc/react";
import { useTranslation } from "~/i18n";

export default function EditRecipe({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { t } = useTranslation();

  const { data: recipe, isLoading } = api.recipe.bySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  useEffect(() => {
    if (session && !isAdmin) {
      router.push("/");
    }
  }, [session, isAdmin, router]);

  if (!session) {
    return (
      <Layout>
        <Head>
          <title>Sign in - Recipe Book</title>
        </Head>
        <div style={{ textAlign: "center", padding: 60 }}>
          {t("Please sign in to edit recipes.")}
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  if (!recipe) return null;

  return (
    <Layout>
      <Head>
        <title>Edit {recipe.title} - Recipe Book</title>
      </Head>
      <RecipeForm initialData={recipe} isEditing />
    </Layout>
  );
}
