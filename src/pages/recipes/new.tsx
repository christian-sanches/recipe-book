import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Head from "next/head";
import Layout from "~/components/Layout";
import RecipeForm from "~/components/RecipeForm";

export default function NewRecipe() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "ADMIN";

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
          Please sign in to create recipes.
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  return (
    <Layout>
      <Head>
        <title>New Recipe - Recipe Book</title>
      </Head>
      <RecipeForm />
    </Layout>
  );
}
