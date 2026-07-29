import { useState } from "react";
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
import { SaveOutlined, EyeOutlined } from "@ant-design/icons";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import RecipeViewer from "./RecipeViewer";

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

  const { data: allTags } = api.tag.list.useQuery();
  const createRecipe = api.recipe.create.useMutation({
    onSuccess: (recipe) => {
      message.success("Recipe created!");
      router.push(`/recipes/${recipe.slug}`);
    },
    onError: (err) => message.error(err.message),
  });
  const updateRecipe = api.recipe.update.useMutation({
    onSuccess: (recipe) => {
      message.success("Recipe updated!");
      router.push(`/recipes/${recipe.slug}`);
    },
    onError: (err) => message.error(err.message),
  });

  const tagOptions =
    allTags?.map((t: { _count: { recipes: number }; id: string; name: string; slug: string }) => ({
      label: `${t.name} (${t._count.recipes})`,
      value: t.id,
    })) ?? [];

  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      ...values,
      cooklangContent,
    };
    if (isEditing && initialData) {
      updateRecipe.mutate({ id: initialData.id, ...payload } as any);
    } else {
      createRecipe.mutate(payload as any);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <Title level={2}>{isEditing ? "Edit Recipe" : "New Recipe"}</Title>

      {preview ? (
        <div>
          <Button onClick={() => setPreview(false)} style={{ marginBottom: 16 }}>
            Back to editing
          </Button>
          <RecipeViewer
            cooklangContent={cooklangContent}
            title={(form.getFieldValue("title") as string) ?? "Recipe Title"}
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
            label="Recipe Title"
            rules={[{ required: true, message: "Please enter a title" }]}
          >
            <Input placeholder="e.g. Grandma's Tomato Sauce" size="large" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={2} placeholder="A short description of the recipe..." />
          </Form.Item>

          <Form.Item
            label="Cooklang Content"
            required
            help="Write your recipe in Cooklang markup"
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
              Preview
            </Button>
          </Form.Item>

          <Divider />

          <Space size={24} wrap>
            <Form.Item name="servings" label="Servings">
              <InputNumber min={1} placeholder="4" />
            </Form.Item>
            <Form.Item name="prepTime" label="Prep Time (min)">
              <InputNumber min={0} placeholder="15" />
            </Form.Item>
            <Form.Item name="cookTime" label="Cook Time (min)">
              <InputNumber min={0} placeholder="30" />
            </Form.Item>
            <Form.Item name="totalTime" label="Total Time (min)">
              <InputNumber min={0} placeholder="45" />
            </Form.Item>
          </Space>

          <Form.Item name="source" label="Source">
            <Input placeholder="e.g. https://example.com/recipe or Family Cookbook p.42" />
          </Form.Item>

          <Form.Item name="tags" label="Tags">
            <Select
              mode="multiple"
              placeholder="Select tags"
              options={tagOptions}
              allowClear
            />
          </Form.Item>

          <Form.Item name="visibility" label="Public" valuePropName="checked">
            <Switch checkedChildren="Public" unCheckedChildren="Hidden" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              size="large"
              loading={createRecipe.isPending || updateRecipe.isPending}
            >
              {isEditing ? "Update Recipe" : "Create Recipe"}
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  );
}
