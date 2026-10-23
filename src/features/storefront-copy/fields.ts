// Every storefront text the admin can change (Configuración → Textos). One
// definition drives the admin editor, the Sanity schema, the write validation
// and what the storefront renders, so a field added here shows up everywhere.
// `default` is the text the store shows while the field was never edited.

/**
 * text / multiline: plain text. url: absolute http(s) link. link: a store path
 * ("/productos") or an absolute link. phone: digits, spaces, + ( ) -.
 * list: one item per line. richtext: the page format of rich-text.tsx
 * (paragraphs, "## " headings, "- " bullets, **bold**).
 */
export type CopyFieldKind = "text" | "multiline" | "url" | "link" | "phone" | "list" | "richtext";

export type CopyFieldDefinition = {
  label: string;
  description?: string;
  default: string;
  maxLength: number;
  /** "text" when omitted. */
  kind?: CopyFieldKind;
};

export type CopySectionDefinition = {
  label: string;
  description: string;
  /** Where the section sits in the editor's index. */
  group: "general" | "home" | "pages";
  fields: Record<string, CopyFieldDefinition>;
};

export const COPY_SECTION_GROUPS = {
  general: "Toda la tienda",
  home: "Inicio",
  pages: "Páginas",
} as const;

export const STOREFRONT_COPY_SECTIONS = {
  announcement: {
    label: "Barra de anuncios",
    description: "La franja fina arriba de todo, en todas las páginas.",
    group: "general",
    fields: {
      text: {
        label: "Mensaje",
        default: "Envios a todo el pais y asesoramiento para ambientar tus espacios.",
        maxLength: 120,
      },
    },
  },
  navigation: {
    label: "Menú",
    description: "Los enlaces del menú principal (computadora y celular).",
    group: "general",
    fields: {
      home: { label: "Inicio", default: "Inicio", maxLength: 24 },
      products: { label: "Productos", default: "Productos", maxLength: 24 },
      contact: { label: "Contacto", default: "Contacto", maxLength: 24 },
      returns: { label: "Política de devolución", default: "Politica de devolucion", maxLength: 32 },
      howToBuy: { label: "Cómo comprar", default: "Como comprar", maxLength: 24 },
    },
  },
  contact: {
    label: "Datos de contacto",
    description: "Se muestran en el pie de página y en la página de Contacto.",
    group: "general",
    fields: {
      phone: { label: "Teléfono", default: "+54 3624750741", maxLength: 32, kind: "phone" },
      email: { label: "Correo", default: "deluar2024@hotmail.com", maxLength: 80 },
      address: { label: "Ubicación", default: "Resistencia - Chaco - Argentina", maxLength: 80 },
    },
  },
  footer: {
    label: "Pie de página",
    description: "Se ve en todas las páginas de la tienda.",
    group: "general",
    fields: {
      socialTitle: { label: "Título de redes", default: "Seguinos", maxLength: 32 },
      tagline: {
        label: "Frase de redes",
        default: "Inspiración cotidiana, lanzamientos y piezas elegidas para cada espacio.",
        maxLength: 160,
        kind: "multiline",
      },
      instagramUrl: { label: "Enlace de Instagram", default: "https://www.instagram.com", maxLength: 200, kind: "url" },
      facebookUrl: { label: "Enlace de Facebook", default: "https://www.facebook.com", maxLength: 200, kind: "url" },
      productsTitle: { label: "Título de productos", default: "Nuestros productos", maxLength: 32 },
      contactTitle: { label: "Título de contacto", default: "Contactanos", maxLength: 32 },
      paymentsTitle: { label: "Título de medios de pago", default: "Medios de pago", maxLength: 32 },
      newsletterTitle: { label: "Título de suscripción", default: "Novedades", maxLength: 32 },
      newsletterPlaceholder: { label: "Texto del campo de correo", default: "Tu correo", maxLength: 40 },
      newsletterButton: { label: "Botón de suscripción", default: "Enviar", maxLength: 20 },
    },
  },
  whatsapp: {
    label: "WhatsApp",
    description: "El botón flotante de consultas.",
    group: "general",
    fields: {
      label: { label: "Texto del botón", description: "Solo en computadoras.", default: "¿Necesitas ayuda?", maxLength: 32 },
      number: {
        label: "Número",
        description: "Con código de país y sin el 15, por ejemplo 5493644448683.",
        default: "5493644448683",
        maxLength: 20,
        kind: "phone",
      },
      message: {
        label: "Mensaje inicial",
        description: "El texto que aparece escrito al abrir el chat.",
        default: "Hola, vengo de la pagina! Quería hacer una consulta.",
        maxLength: 200,
        kind: "multiline",
      },
    },
  },
  categories: {
    label: "Categorías",
    description: "La fila de categorías con fotos, debajo del hero.",
    group: "home",
    fields: {
      title: { label: "Título", default: "Categorías", maxLength: 40 },
    },
  },
  newArrivals: {
    label: "Lo nuevo",
    description: "La franja animada de productos recién llegados.",
    group: "home",
    fields: {
      titleLead: {
        label: "Título grande",
        description: "En celulares, la última palabra baja a otra línea.",
        default: "Lo nuevo",
        maxLength: 18,
      },
      titleTail: { label: "Título chico", default: "en Deluar", maxLength: 24 },
      viewAll: { label: "Enlace", default: "Ver todo", maxLength: 24 },
    },
  },
  benefits: {
    label: "Beneficios",
    description: "Los tres beneficios del inicio: la franja animada y el bloque de abajo usan los mismos textos.",
    group: "home",
    fields: {
      label: {
        label: "Nombre de la sección",
        description: "Lo anuncian los lectores de pantalla; no se ve.",
        default: "Beneficios de comprar en Deluar",
        maxLength: 80,
      },
      shippingTitle: { label: "Beneficio 1 · título", default: "Envíos", maxLength: 24 },
      shippingText: { label: "Beneficio 1 · texto", default: "A todo el país", maxLength: 48 },
      paymentTitle: {
        label: "Beneficio 2 · título",
        description: "Va destacado en rojo promocional.",
        default: "20% OFF",
        maxLength: 24,
      },
      paymentText: { label: "Beneficio 2 · texto", default: "Con pago en efectivo", maxLength: 48 },
      installmentsTitle: { label: "Beneficio 3 · título", default: "Cuotas", maxLength: 24 },
      installmentsText: { label: "Beneficio 3 · texto", default: "En todos nuestros productos", maxLength: 48 },
    },
  },
  editorial: {
    label: "Banners de categorías",
    description: "Los dos banners grandes con foto del inicio.",
    group: "home",
    fields: {
      firstTitle: { label: "Banner 1 · título", default: "Mesa & Comedor", maxLength: 40 },
      firstText: {
        label: "Banner 1 · texto",
        default: "Diseño y estilo para vestir tu mesa con personalidad.",
        maxLength: 120,
        kind: "multiline",
      },
      secondTitle: { label: "Banner 2 · título", default: "Decoración & Hogar", maxLength: 40 },
      secondText: {
        label: "Banner 2 · texto",
        default: "Detalles que transforman tus espacios todos los días.",
        maxLength: 120,
        kind: "multiline",
      },
      cta: { label: "Botón de ambos banners", default: "Conocer más", maxLength: 24 },
    },
  },
  offers: {
    label: "Ofertas destacadas",
    description: "El carrusel de ofertas del inicio.",
    group: "home",
    fields: {
      eyebrow: { label: "Antetítulo", default: "Ofertas destacadas", maxLength: 40 },
      title: { label: "Título", default: "Oportunidades curadas para DELUAR", maxLength: 60 },
      viewAll: { label: "Enlace a todos", default: "Ver todos", maxLength: 24 },
      badge: { label: "Etiqueta de cada oferta", default: "Oferta", maxLength: 20 },
      productCta: { label: "Botón de cada oferta", default: "Ver producto", maxLength: 24 },
    },
  },
  newsletter: {
    label: "Suscripción",
    description: "El bloque de newsletter al final del inicio.",
    group: "home",
    fields: {
      eyebrow: { label: "Antetítulo", default: "Novedades", maxLength: 40 },
      title: { label: "Título", default: "Recibí todas las ofertas", maxLength: 60 },
      text: {
        label: "Texto",
        default: "Novedades, lanzamientos y oportunidades seleccionadas para tu casa en una sola suscripción.",
        maxLength: 200,
        kind: "multiline",
      },
      placeholder: { label: "Texto del campo de correo", default: "Tu correo", maxLength: 40 },
      button: { label: "Botón", default: "Enviar", maxLength: 20 },
    },
  },
  pageContact: {
    label: "Página Contacto",
    description: "/contacto. Teléfono, correo y ubicación salen de «Datos de contacto».",
    group: "pages",
    fields: {
      title: { label: "Título", default: "Contacto", maxLength: 60 },
      intro: {
        label: "Texto",
        default: "Dejanos tu consulta y a la brevedad nos estaremos comunicando! DELUAR Deco Home",
        maxLength: 400,
        kind: "multiline",
      },
      seoDescription: {
        label: "Descripción para Google",
        description: "El resumen que muestran los buscadores.",
        default: "Contactate con DELUAR Deco Home. Teléfono, email y formulario de consulta.",
        maxLength: 160,
      },
    },
  },
  pageHowToBuy: {
    label: "Página Cómo comprar",
    description: "/como-comprar.",
    group: "pages",
    fields: {
      title: { label: "Título", default: "Información Importante para Comprar", maxLength: 80 },
      seoTitle: {
        label: "Título para Google",
        description: "El de la pestaña del navegador y los buscadores.",
        default: "Cómo Comprar",
        maxLength: 60,
      },
      stepsTitle: { label: "Título de los pasos", default: "Pasos para comprar:", maxLength: 60 },
      steps: {
        label: "Pasos",
        description: "Un paso por línea; se numeran solos.",
        default: [
          "Elegí el/los productos que querés comprar.",
          'Hacé clic en el botón "Agregar al carrito".',
          'Podés seguir agregando otros productos o hacer clic en "Iniciar compra".',
          'Completá tus datos de contacto y hacé clic en "Continuar".',
          'Ingresá la dirección donde querés recibir el pedido. Luego, hacé clic en "Continuar".',
          'Seleccioná el medio de envío y hacé clic en "Continuar".',
          "Elegí el medio de pago.",
          'Una vez elegido, hacé clic en "Continuar".',
          "En la página de confirmación, revisá todos los datos y confirmá la compra.",
          "Después de confirmar, recibirás un e-mail con los detalles.",
          "Una vez recibido el pago, te enviaremos el comprobante y prepararemos tu pedido.",
        ].join("\n"),
        maxLength: 3000,
        kind: "list",
      },
      extraTitle: { label: "Título de información adicional", default: "Información adicional:", maxLength: 60 },
      extra: {
        label: "Información adicional",
        default: [
          "- **Envío gratis** a todo el país en compras superiores a $50.000. El envío gratuito aplica a la sucursal más cercana. Al ingresar tu código postal, podrás ver los puntos disponibles para retirar en la opción **Punto de retiro**.",
          "- **Compras con tarjeta de crédito:** Podés abonar en 3 o 6 cuotas sin interés (según la fecha) con tarjetas Visa, MasterCard, American Express o Cabal de cualquier banco. Para acceder a esta opción, seleccioná **CUOTA SIMPLE 3/6** (últimas opciones de pago).",
        ].join("\n"),
        maxLength: 4000,
        kind: "richtext",
      },
      seoDescription: {
        label: "Descripción para Google",
        default: "Guía paso a paso para realizar tu compra en DELUAR Deco Home.",
        maxLength: 160,
      },
    },
  },
  pageReturns: {
    label: "Página Política de devolución",
    description: "/politica-de-devolucion.",
    group: "pages",
    fields: {
      title: { label: "Título", default: "Política de Devolución", maxLength: 80 },
      body: {
        label: "Contenido",
        default: [
          "En **DELUAR**, queremos que tu experiencia de compra sea excelente. Si no estás conforme con tu producto, podés solicitar la devolución siguiendo estos lineamientos:",
          "",
          "## 1. Plazo de Arrepentimiento",
          "Tenés un plazo de **15 días corridos** desde que recibís el producto para solicitar la devolución. (Conforme a la Ley 24.240, los primeros 10 días corresponden al derecho de arrepentimiento legal. Luego del plazo, el envío queda a cargo del cliente.)",
          "",
          "## 2. Condiciones del Producto",
          "Para que la devolución sea aceptada, el artículo debe cumplir con los siguientes requisitos:",
          "- Estar en **iguales condiciones** en las que fue entregado.",
          "- No debe presentar **signos de uso**, lavado o daños por manipulación.",
          "- Debe conservar su **empaque original** y todas sus etiquetas intactas.",
          "",
          "## 3. Productos con Daños o Defectos",
          "Si tu pedido llegó roto o con algún daño de transporte, ¡no te preocupes! En este caso, podés elegir entre:",
          "- El **reenvío** de un producto nuevo (sujeto a stock).",
          "- El **reintegro total** del dinero abonado por el producto.",
          "",
          "## 4. ¿Cómo inicio el proceso?",
          "Es muy simple. Ponete en contacto con nosotros a través de:",
          "- **WhatsApp:** +549 3624750741",
          "- **Email:** deluar2024@hotmail.com",
          "",
          "Detallanos el inconveniente o modificación que querés realizar. Nosotros te indicaremos los pasos a seguir. Una vez recibido e inspeccionado el producto, procederemos con el cambio o la devolución del dinero según corresponda.",
        ].join("\n"),
        maxLength: 8000,
        kind: "richtext",
      },
      seoDescription: {
        label: "Descripción para Google",
        default: "Conocé nuestra política de devolución y cambios. DELUAR Deco Home.",
        maxLength: 160,
      },
    },
  },
} as const satisfies Record<string, CopySectionDefinition>;

export type StorefrontCopySectionId = keyof typeof STOREFRONT_COPY_SECTIONS;

// The hero slides are a list kept in Sanity Studio (with their images), so
// their texts are corrections over each slide's own: there is no fixed
// default, the "original" is whatever the slide has in Studio.
export const HERO_SLIDE_FIELDS = {
  eyebrow: { label: "Antetítulo", default: "", maxLength: 60 },
  title: { label: "Título", default: "", maxLength: 120 },
  text: { label: "Texto", default: "", maxLength: 300, kind: "multiline" },
  ctaLabel: { label: "Botón principal", default: "", maxLength: 32 },
  ctaHref: { label: "Enlace del botón principal", description: "Por ejemplo /productos.", default: "", maxLength: 300, kind: "link" },
  secondaryCtaLabel: { label: "Botón secundario", default: "", maxLength: 32 },
  secondaryCtaHref: { label: "Enlace del botón secundario", default: "", maxLength: 300, kind: "link" },
} as const satisfies Record<string, CopyFieldDefinition>;

export type HeroSlideTextKey = keyof typeof HERO_SLIDE_FIELDS;

export type HeroSlideTexts = Record<HeroSlideTextKey, string>;

/** The slide's photo: a replacement uploaded from the admin (Sanity image asset id), or none at all. */
export type HeroSlideImageChoice = { assetRef: string } | "removed";

/**
 * How a photo sits in its frame, set by hand in the admin: the point that
 * stays in view (0–1 from the left / top) and a zoom. It applies to whatever
 * photo the block shows (from Studio, uploaded, or the original file).
 */
export type ImageFraming = { x: number; y: number; zoom: number };

export const DEFAULT_IMAGE_FRAMING: ImageFraming = { x: 0.5, y: 0.5, zoom: 1 };

export const IMAGE_FRAMING_MAX_ZOOM = 3;

/** The colour panel a slide shows when it has no photo (same names as the hero's surfaces). */
export const HERO_SURFACES = {
  promo: "Rojo promoción",
  sand: "Arena",
  brown: "Marca",
} as const;

export type HeroSurfaceId = keyof typeof HERO_SURFACES;

/**
 * Corrections over a Studio slide, or a whole slide created in the admin
 * (`custom`: its texts are its own, there is nothing in Studio under them).
 * `products`: ids picked for the two product tiles; absent: picked at random.
 */
export type HeroSlideOverride = Partial<HeroSlideTexts> & {
  image?: HeroSlideImageChoice;
  imageFraming?: ImageFraming;
  products?: string[];
  surface?: HeroSurfaceId;
  custom?: true;
};

export const HERO_PRODUCTS_MAX = 2;

/** Slides the home hero may cycle through once the admin manages the list. */
export const HERO_SLIDES_MAX = 5;

// Hand-picked product lists of the home. A list left out keeps its automatic
// source (the product flags in Productos), so nothing changes until one is picked.
export const PRODUCT_LISTS = {
  featured: {
    label: "Productos de «Lo nuevo» y destacados",
    description: "La franja «Lo nuevo» y la grilla de productos con la banda animada que sigue.",
    automatic: "Productos marcados como Destacado.",
    max: 12,
  },
  spotlight: {
    label: "Selección giratoria",
    description: "El bloque que muestra un producto grande y va rotando.",
    automatic: "Productos de la campaña cargados en Studio; si no hay, las novedades.",
    max: 8,
  },
  offers: {
    label: "Productos en oferta",
    description: "Los del carrusel de ofertas destacadas.",
    automatic: "Productos marcados como En oferta.",
    max: 10,
  },
} as const;

export type ProductListId = keyof typeof PRODUCT_LISTS;

// Background photos of fixed home blocks. They always show a photo: one
// uploaded from the admin, or the original file shipped with the store.
export const SECTION_IMAGES = {
  editorialFirst: { label: "Foto del banner 1", section: "editorial", default: "/dcome.png" },
  editorialSecond: { label: "Foto del banner 2", section: "editorial", default: "/mdomi.jpg" },
  newsletter: { label: "Foto de fondo", section: "newsletter", default: "/mdomi.jpg" },
} as const satisfies Record<string, { label: string; section: string; default: string }>;

export type SectionImageId = keyof typeof SECTION_IMAGES;

export const SECTION_IMAGE_IDS = Object.keys(SECTION_IMAGES) as SectionImageId[];

/** Replacement photos by block, as Sanity image asset ids. */
export type SectionImages = Partial<Record<SectionImageId, string>>;

export const PRODUCT_LIST_IDS = Object.keys(PRODUCT_LISTS) as ProductListId[];

/** Picked product ids per list, in display order. */
export type ProductLists = Partial<Record<ProductListId, string[]>>;

/** Corrections per slide (Sanity `_key`, or "hero-main" for the single fallback slide). */
export type HeroSlideOverrides = Record<string, HeroSlideOverride>;

export const HERO_SLIDE_TEXT_KEYS = Object.keys(HERO_SLIDE_FIELDS) as HeroSlideTextKey[];

/** Every text the storefront renders, defaults already applied. */
export type StorefrontCopy = {
  [Section in StorefrontCopySectionId]: {
    -readonly [Field in keyof (typeof STOREFRONT_COPY_SECTIONS)[Section]["fields"]]: string;
  };
} & {
  heroSlides: HeroSlideOverrides;
  /**
   * The slides the hero shows, in order (Studio slide keys and admin-created
   * ids). Null: the admin never managed the list, so Studio's slides show.
   */
  heroSlideOrder: string[] | null;
  productLists: ProductLists;
  images: SectionImages;
  /** Hand-set framing of each block's photo; absent: centred, no zoom. */
  imageFraming: Partial<Record<SectionImageId, ImageFraming>>;
};

export const STOREFRONT_COPY_SECTION_IDS = Object.keys(STOREFRONT_COPY_SECTIONS) as StorefrontCopySectionId[];

/** The fields of a section, untyped by name: for code that walks every field. */
export function sectionFields(section: StorefrontCopySectionId): [string, CopyFieldDefinition][] {
  return Object.entries(STOREFRONT_COPY_SECTIONS[section].fields);
}

export const DEFAULT_STOREFRONT_COPY = {
  ...Object.fromEntries(
    STOREFRONT_COPY_SECTION_IDS.map((section) => [
      section,
      Object.fromEntries(sectionFields(section).map(([key, field]) => [key, field.default])),
    ]),
  ),
  heroSlides: {},
  heroSlideOrder: null,
  productLists: {},
  images: {},
  imageFraming: {},
} as StorefrontCopy;
