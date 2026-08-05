import { useState, useRef } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Switch,
  Typography,
  Space,
  Divider,
  message,
} from "antd";
import { SaveOutlined, EyeOutlined, UploadOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import RecipeViewer from "./RecipeViewer";
import { parseCookFile } from "~/lib/cooklang";
import { useTranslation } from "~/i18n";

const { Title } = Typography;
const { TextArea } = Input;

interface RecipeFormProps {
  initialData?: {
    id: string;
    title: string;
    cooklangContent: string;
    description: string | null;
    servings: number | null;
    prepTime: number | null;
    cookTime: number | null;
    totalTime: number | null;
    source: string | null;
    image: string | null;
    visibility: "PUBLIC" | "HIDDEN";
    tags: { tag: { id: string; name: string; slug: string } }[];
  };
  isEditing?: boolean;
}

export default function RecipeForm({ initialData, isEditing }: RecipeFormProps) {
  const [form] = Form.useForm();
  const router = useRouter();
  const [preview, setPreview] = useState(false);
  const [cooklangContent, setCooklangContent] = useState(
    initialData?.cooklangContent ?? ""
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const { data: allTags } = api.tag.list.useQuery();
  const createRecipe = api.recipe.create.useMutation({
    onSuccess: (recipe) => {
      message.success(t("Recipe created!"));
      router.push(`/recipes/${recipe.slug}`);
    },
    onError: (err) => message.error(err.message),
  });
  const updateRecipe = api.recipe.update.useMutation({
    onSuccess: (recipe) => {
      message.success(t("Recipe updated!"));
      router.push(`/recipes/${recipe.slug}`);
    },
    onError: (err) => message.error(err.message),
  });
  const createTag = api.tag.create.useMutation();

  // Build lookup maps: ID → tag, and name (lowercase) → ID
  const tagNameToId = new Map<string, string>();
  for (const t of allTags ?? []) {
    tagNameToId.set(t.name.toLowerCase(), t.id);
  }

  const tagOptions =
    allTags?.map((t) => ({
      label: `${t.name} (${t._count.recipes})`,
      value: t.id,
    })) ?? [];

  // ── Tag value resolver ──────────────────────────────────
  // With mode="tags", existing tags come through as their ID,
  // while new typed tags come through as the raw name string.
  // We resolve new names to IDs via find-or-create.
  async function resolveTags(rawTags: string[]): Promise<string[]> {
    const resolved: string[] = [];
    const toCreate: string[] = [];

    for (const val of rawTags) {
      const trimmed = val.trim();
      if (!trimmed) continue;

      // Check if it's an existing tag ID (from dropdown selection)
      if (tagOptions.some((o) => o.value === trimmed)) {
        resolved.push(trimmed);
        continue;
      }

      // Check if it matches an existing tag by name
      const existingId = tagNameToId.get(trimmed.toLowerCase());
      if (existingId) {
        resolved.push(existingId);
        continue;
      }

      // New tag name — create it
      toCreate.push(trimmed);
    }

    for (const name of toCreate) {
      try {
        const tag = await createTag.mutateAsync({ name });
        resolved.push(tag.id);
      } catch {
        // Tag already exists (race condition) or error — skip
      }
    }

    return resolved;
  }

  // ── Import .cook ──────────────────────────────────────────
  // Reads a .cook file and fills the form fields so the user can
  // review and edit before saving. It never saves automatically.
  const handleImport = async (file: File) => {
    try {
      const parsed = parseCookFile(await file.text());

      if (!parsed.title && !parsed.cooklangContent.trim()) {
        message.warning(t("No recipe data found in file"));
        return;
      }

      // Resolve tag names to existing tag IDs when possible; unknown
      // names stay as raw strings and are created on save.
      const tagValues = parsed.tags.map((name) => {
        const existingId = tagNameToId.get(name.toLowerCase());
        return existingId ?? name;
      });

      form.setFieldsValue({
        title: parsed.title ?? "",
        description: parsed.description ?? "",
        servings: parsed.servings ?? undefined,
        prepTime: parsed.prepTime ?? undefined,
        cookTime: parsed.cookTime ?? undefined,
        totalTime: parsed.totalTime ?? undefined,
        source: parsed.source ?? "",
        tags: tagValues,
      });
      setCooklangContent(parsed.cooklangContent);
      message.success(t("Imported recipe from file — review before saving"));
    } catch {
      message.error(t("Failed to import file"));
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    let tagIds: string[] | undefined;

    if (Array.isArray(values.tags) && values.tags.length > 0) {
      tagIds = await resolveTags(values.tags as string[]);
    }

    const payload = {
      ...values,
      cooklangContent,
      tags: tagIds,
      visibility: values.visibility ? "PUBLIC" : "HIDDEN",
    };

    if (isEditing && initialData) {
      updateRecipe.mutate({ id: initialData.id, ...payload } as any);
    } else {
      createRecipe.mutate(payload as any);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          {isEditing ? t("Edit Recipe") : t("New Recipe")}
        </Title>
        {!preview && (
          <>
            <input
              type="file"
              accept=".cook,.txt"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
                e.target.value = "";
              }}
            />
            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
              {t("Import .cook")}
            </Button>
          </>
        )}
      </div>

      {preview ? (
        <div>
          <Button onClick={() => setPreview(false)} style={{ marginBottom: 16 }}>
            {t("Back to editing")}
          </Button>
          <RecipeViewer
            cooklangContent={cooklangContent}
            title={(form.getFieldValue("title") as string) ?? t("Recipe Title")}
            description={form.getFieldValue("description") as string}
            servings={form.getFieldValue("servings") as number}
            prepTime={form.getFieldValue("prepTime") as number}
            cookTime={form.getFieldValue("cookTime") as number}
            totalTime={form.getFieldValue("totalTime") as number}
            source={form.getFieldValue("source") as string}
          />
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={
            initialData
              ? {
                  ...initialData,
                  tags: initialData.tags.map((rt) => rt.tag.id),
                  visibility: initialData.visibility === "HIDDEN" ? false : true,
                  prepTime: initialData.prepTime ?? undefined,
                  cookTime: initialData.cookTime ?? undefined,
                  totalTime: initialData.totalTime ?? undefined,
                }
              : { visibility: true }
          }
        >
          <Form.Item
            name="title"
            label={t("Recipe Title")}
            rules={[{ required: true, message: t("Please enter a title") }]}
          >
            <Input placeholder={t("e.g. Grandma's Tomato Sauce")} size="large" />
          </Form.Item>

          <Form.Item name="description" label={t("Description")}>
            <TextArea rows={2} placeholder={t("A short description of the recipe...")} />
          </Form.Item>

          <Form.Item
            label={t("Cooklang Content")}
            required
            help={t("Write your recipe in Cooklang markup")}
          >
            <TextArea
              rows={15}
              value={cooklangContent}
              onChange={(e) => setCooklangContent(e.target.value)}
              placeholder={
                "@flour{2%cups}\n@salt{1%tsp}\n#pan\n~{30%minutes}\n\n>> servings: 4"
              }
              style={{ fontFamily: "monospace", fontSize: 14 }}
            />
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => setPreview(true)}
              style={{ marginTop: 8 }}
            >
              {t("Preview")}
            </Button>
          </Form.Item>

          <Divider />

          <Space size={24} wrap>
            <Form.Item name="servings" label={t("Servings")}>
              <InputNumber min={1} placeholder="4" />
            </Form.Item>
            <Form.Item name="prepTime" label={t("Prep Time (min)")}>
              <InputNumber min={0} placeholder="15" />
            </Form.Item>
            <Form.Item name="cookTime" label={t("Cook Time (min)")}>
              <InputNumber min={0} placeholder="30" />
            </Form.Item>
            <Form.Item name="totalTime" label={t("Total Time (min)")}>
              <InputNumber min={0} placeholder="45" />
            </Form.Item>
          </Space>

          <Form.Item name="source" label={t("Source")}>
            <Input placeholder={t("e.g. Grandma's Tomato Sauce")} />
          </Form.Item>

          <Form.Item
            name="tags"
            label={t("Tags")}
            help={t("Type a name and press Enter or comma to create a new tag")}
          >
            <Select
              mode="tags"
              placeholder={t("Search existing tags or type to create new ones")}
              options={tagOptions}
              tokenSeparators={[","]}
              allowClear
            />
          </Form.Item>

          <Form.Item name="visibility" label={t("Public")} valuePropName="checked">
            <Switch checkedChildren={t("Public")} unCheckedChildren={t("Hidden")} />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              size="large"
              loading={createRecipe.isPending || updateRecipe.isPending}
            >
              {isEditing ? t("Update Recipe") : t("Create Recipe")}
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  );
}
