# DELUAR Sanity manual test

Use this minimal order to validate the content model in Studio:

1. Create one `siteSettings` document.
2. Create one `promoSettings` document.
3. Create one `homePage` document.
4. Create one or more `staticPage` documents:
   - `contacto`
   - `politica-de-devolucion`
   - `como-comprar`
5. Create top-level categories:
   - `Cocina`
   - `Dormitorio`
   - `Living`
   - `Bano`
6. Create subcategories linked to their parent category:
   - `Manteles` -> `Cocina`
   - `Repasadores` -> `Cocina`
   - `Mantas` -> `Living`
   - `Toallas` -> `Bano`
7. Create one product:
   - title: `Manta tejida natural`
   - shortDescription: `Textil decorativo para living en tono natural.`
   - category: `Living`
   - subcategory: `Mantas`
   - basePrice: `100000`
   - stock: `3`
   - at least one image

What to verify in Studio:

- `subcategory.parentCategory` is required.
- `product.category` is required.
- `product.subcategory` only lists subcategories from the selected category.
- `images` requires at least one item.
- `basePrice` and `stock` are required.
