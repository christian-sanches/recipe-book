"use client";

import { Button, Card, Typography, Space } from "antd";
import { GoogleOutlined, BookOutlined, UserOutlined } from "@ant-design/icons";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { useEffect } from "react";

const { Title, Text } = Typography;

export default function LoginClient({ devMode }: { devMode: boolean }) {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [session, router]);

  return (
    <>
      <Head>
        <title>Sign in - Recipe Book</title>
      </Head>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
        }}
      >
        <Card style={{ width: 400, textAlign: "center" }}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <BookOutlined style={{ fontSize: 48, color: "#1677ff" }} />
            <Title level={3} style={{ margin: 0 }}>
              Recipe Book
            </Title>
            <Text type="secondary">Sign in to manage your recipes</Text>

            {devMode ? (
              <Button
                type="primary"
                size="large"
                icon={<UserOutlined />}
                block
                onClick={() =>
                  signIn("credentials", { callbackUrl: "/", redirect: true })
                }
              >
                Dev Login (Admin)
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                icon={<GoogleOutlined />}
                block
                onClick={() => signIn("google", { callbackUrl: "/" })}
              >
                Sign in with Google
              </Button>
            )}
          </Space>
        </Card>
      </div>
    </>
  );
}
