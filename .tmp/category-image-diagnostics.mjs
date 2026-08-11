import { createClient } from "@sanity/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.production.local" });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-04-01",
  useCdn: false,
  perspective: "published",
});

const query = `*[_type == "product" && category->slug.current == $categorySlug && ($subcategorySlug == "" || subcategory->slug.current == $subcategorySlug)] | order(isFeatured desc, _createdAt desc) [0...48]{ _id, title, slug, images[]{ _type, alt, image->{ asset->{ _ref, _type }, alt } }, category->{title, slug}, subcategory->{title, slug} }`;

const cats = ["cocina", "dormitorio", "living", "bano"];

for (const categorySlug of cats) {
  const docs = await client.fetch(query, { categorySlug, subcategorySlug: "" });
  console.log(`\nCATEGORY ${categorySlug} COUNT ${docs.length}`);
  for (const p of docs.slice(0, 3)) {
    console.log("PRODUCT", p.title, p.slug?.current || p.slug);
    console.log("images len", Array.isArray(p.images) ? p.images.length : "not-array");
    console.dir(p.images?.[0], { depth: 5 });
    console.log("has ref 0", !!p.images?.[0]?.image?.asset?._ref);
    console.log("has ref any", Array.isArray(p.images) && p.images.some((img) => !!img?.image?.asset?._ref));
  }
}
