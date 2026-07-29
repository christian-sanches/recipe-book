import { useState } from "react";
import { Layout as AntLayout, Button, Space, Avatar, Dropdown, Typography } from "antd";
import { UserOutlined, LoginOutlined, PlusOutlined, LogoutOutlined, BookOutlined } from "@ant-design/icons";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MenuProps } from "antd";

const { Header, Content, Footer } = AntLayout;
const { Text } = Typography;

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      label: (
        <Text>
          {session?.user?.name ?? session?.user?.email}
        </Text>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Sign out",
      onClick: () => signOut(),
    },
  ];

  return (
    <AntLayout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          borderBottom: "1px solid #f0f0f0",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <Space>
            <BookOutlined style={{ fontSize: 24, color: "#1677ff" }} />
            <Text strong style={{ fontSize: 18 }}>
              Recipe Book
            </Text>
          </Space>
        </Link>

        <Space>
          {session?.user?.role === "ADMIN" && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push("/recipes/new")}
            >
              New Recipe
            </Button>
          )}
          {session?.user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: "pointer" }}>
                <Avatar src={session.user.image} icon={<UserOutlined />} />
                <Text>{session.user.name}</Text>
              </Space>
            </Dropdown>
          ) : (
            <Button
              icon={<LoginOutlined />}
              onClick={() => router.push("/login")}
            >
              Sign in
            </Button>
          )}
        </Space>
      </Header>

      <Content style={{ padding: "24px", maxWidth: 1200, width: "100%", margin: "0 auto" }}>
        {children}
      </Content>

      <Footer style={{ textAlign: "center", color: "#999" }}>
        Recipe Book &copy; {new Date().getFullYear()} &mdash; Powered by Cooklang
      </Footer>
    </AntLayout>
  );
}
