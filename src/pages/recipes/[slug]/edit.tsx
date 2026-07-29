import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import Head from "next/head";
import { Spin } from "antd";
import Layout from "~/components/Layout";
import RecipeForm from "~/components/RecipeForm";
import { api } from "~/utils/api";

export default function EditRecipe() {
  const router = useRouter();
  const { slug } = router.query;
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const { data: recipe, isLoading } = api.recipe.bySlug.useQuery(
    { slug: slug as string },
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
          Please sign in to edit recipes.
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
