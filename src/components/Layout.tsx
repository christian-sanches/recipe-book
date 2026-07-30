import {
  Layout as AntLayout,
  Button,
  Space,
  Avatar,
  Dropdown,
  Typography,
  Grid,
  theme,
} from "antd";
import {
  UserOutlined,
  LoginOutlined,
  PlusOutlined,
  LogoutOutlined,
  BookOutlined,
  MenuOutlined,
  SunOutlined,
  MoonOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MenuProps } from "antd";
import { useTheme } from "~/contexts/ThemeContext";
import { useTranslation } from "~/i18n";

const { Header, Content, Footer } = AntLayout;
const { Text } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();
  const screens = useBreakpoint();
  const isDesktop = screens.md;
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useTranslation();
  const { token } = useToken();

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
      label: t("Sign out"),
      onClick: () => signOut(),
    },
  ];

  const langLabel =
    lang === "en"
      ? "🇺🇸 English"
      : "🇧🇷 Português";

  const menuItems: MenuProps["items"] = [
    // ── Auth section ──
    ...(session?.user
      ? [
          {
            key: "profile",
            label: (
              <Space>
                <Avatar
                  src={session.user.image}
                  icon={<UserOutlined />}
                  size="small"
                />
                <Text>{session.user.name ?? session.user.email}</Text>
              </Space>
            ),
            disabled: true,
          } as NonNullable<MenuProps["items"]>[number],
        ]
      : []),
    // On mobile, show auth actions in the menu
    ...(!isDesktop
      ? [
          ...(session?.user?.role === "ADMIN"
            ? [
                {
                  key: "new-recipe",
                  icon: <PlusOutlined />,
                  label: t("New Recipe"),
                  onClick: () => router.push("/recipes/new"),
                } as NonNullable<MenuProps["items"]>[number],
              ]
            : []),
          ...(session?.user
            ? [
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: t("Sign out"),
                  onClick: () => signOut(),
                  danger: true,
                } as NonNullable<MenuProps["items"]>[number],
              ]
            : [
                {
                  key: "signin",
                  icon: <LoginOutlined />,
                  label: t("Sign in"),
                  onClick: () => router.push("/login"),
                } as NonNullable<MenuProps["items"]>[number],
              ]),
        ]
      : []),
    // ── Settings section ──
    { type: "divider" },
    {
      key: "theme",
      icon: theme === "dark" ? <SunOutlined /> : <MoonOutlined />,
      label: theme === "dark" ? t("Light mode") : t("Dark mode"),
      onClick: toggleTheme,
    },
    {
      key: "language",
      icon: <GlobalOutlined />,
      label: (
        <Space>
          <span>{langLabel}</span>
        </Space>
      ),
      onClick: () => setLang(lang === "en" ? "pt-BR" : "en"),
    },
  ];

  return (
    <AntLayout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
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
              {t("Recipe book")}
            </Text>
          </Space>
        </Link>

        <Space>
          {/* Desktop: visible auth buttons */}
          {isDesktop && session?.user?.role === "ADMIN" && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push("/recipes/new")}
            >
              {t("New Recipe")}
            </Button>
          )}
          {isDesktop && session?.user && (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: "pointer" }}>
                <Avatar
                  src={session.user.image}
                  icon={<UserOutlined />}
                />
                <Text>{session.user.name}</Text>
              </Space>
            </Dropdown>
          )}
          {isDesktop && !session?.user && (
            <Button
              icon={<LoginOutlined />}
              onClick={() => router.push("/login")}
            >
              {t("Sign in")}
            </Button>
          )}

          {/* Hamburger menu (all screen sizes) */}
          <Dropdown
            menu={{ items: menuItems }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <Button
              type="text"
              icon={<MenuOutlined />}
              style={{
                fontSize: 20,
                width: 40,
                height: 40,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
          </Dropdown>
        </Space>
      </Header>

      <Content
        style={{
          padding: "24px",
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {children}
      </Content>

      <Footer style={{ textAlign: "center", color: "#999" }}>
        {t("Recipe book")} &copy; {new Date().getFullYear()} &mdash; Powered by Cooklang
      </Footer>
    </AntLayout>
  );
}
