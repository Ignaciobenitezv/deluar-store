import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./src/integrations/sanity/schema";
import { structure } from "./src/integrations/sanity/structure";

// Documents that must exist at most once (fixed _id set in structure.ts) and
// are managed only from the Deluar admin: no "create new" entry and no
// document actions at all (no edit, publish, unpublish, duplicate or delete).
const SINGLETON_TYPES = new Set(["storefrontTheme"]);

export default defineConfig({
  name: "default",
  title: "DELUAR CMS",
  basePath: "/studio",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  plugins: [structureTool({ structure })],
  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter((template) => !SINGLETON_TYPES.has(template.schemaType)),
  },
  document: {
    actions: (actions, { schemaType }) => (SINGLETON_TYPES.has(schemaType) ? [] : actions),
  },
});
