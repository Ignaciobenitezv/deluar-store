import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env.production.local" });
loadEnv({ path: ".env" });

type PrismaModule = typeof import("../src/lib/prisma");
type OrderRepositoryModule = typeof import("../src/features/orders/server/order-repository");
type ShippingModule = typeof import("../src/features/shipping/shipping");
type PaymentsModule = typeof import("../src/features/payments/types");
type PricingModule = typeof import("../src/features/pricing/commercial-pricing");
type OrderValidationModule = typeof import("../src/features/order/validation");
type ShipmentReadinessModule = typeof import("../src/features/shipments/server/shipment-readiness");
type ShipmentServiceModule = typeof import("../src/features/shipments/server/shipment-service");
type AndreaniExportsModule = typeof import("../src/features/shipments/andreani-export/batch-service");
type AndreaniExportServiceModule = typeof import("../src/features/shipments/andreani-export/service");
type AndreaniTemplateModule = typeof import("../src/features/shipments/andreani-export/template");
type AndreaniValidationModule = typeof import("../src/features/shipments/andreani-export/validation");
type AndreaniNormalizeModule = typeof import("../src/features/shipments/andreani-export/normalize");
type ShipmentTypesModule = typeof import("../src/features/shipments/types");

type ProductSeed = {
  productId: string;
  slug: string;
  name: string;
  basePrice: number;
  logistics: {
    weightGrams: number;
    heightCm: number;
    widthCm: number;
    depthCm: number;
  };
};

type ProductKey = "CUBIERTOS" | "SETX4" | "PERAK" | "CONTENEDOR";

type FixtureSpec = {
  key: "01" | "02" | "03" | "04" | "05";
  orderNumber: string;
  recipient: {
    firstName: string;
    lastName: string;
    dni: string;
    email: string;
    phone: string;
    phoneAreaCode: string;
    phoneNumber: string;
    street: string;
    streetNumber: string;
    floor: string;
    apartment: string;
    city: string;
    province: string;
    postalCode: string;
    notes: string;
  };
  lines: Array<{ productKey: ProductKey; quantity: number }>;
};

let prisma: PrismaModule["prisma"];
let saveOrder: OrderRepositoryModule["saveOrder"];
let calculateShippingCost: ShippingModule["calculateShippingCost"];
let SHIPPING_METHODS: ShippingModule["SHIPPING_METHODS"];
let PAYMENT_METHODS: PaymentsModule["PAYMENT_METHODS"];
let resolveCommercialUnitPrice: PricingModule["resolveCommercialUnitPrice"];
let buildOrderShippingAddressSnapshot: OrderValidationModule["buildOrderShippingAddressSnapshot"];
let buildInitialShipmentParcel: ShipmentReadinessModule["buildInitialShipmentParcel"];
let ensureAndreaniShipmentReadyForOrder: ShipmentServiceModule["ensureAndreaniShipmentReadyForOrder"];
let shipmentExportInclude: AndreaniExportServiceModule["shipmentExportInclude"];
let toAndreaniExportSource: AndreaniExportServiceModule["toAndreaniExportSource"];
let getAndreaniExportsDashboardData: AndreaniExportsModule["getAndreaniExportsDashboardData"];
let getAndreaniTemplateMetadata: AndreaniTemplateModule["getAndreaniTemplateMetadata"];
let validateAndreaniExcelExport: AndreaniValidationModule["validateAndreaniExcelExport"];
let normalizeAndreaniLocationKey: AndreaniNormalizeModule["normalizeAndreaniLocationKey"];
let SHIPMENT_STATUSES: ShipmentTypesModule["SHIPMENT_STATUSES"];

const PRODUCTS: Record<ProductKey, ProductSeed> = {
  CUBIERTOS: {
    productId: "import-product-cubiertos-147b7",
    slug: "cubiertos-147b7",
    name: "Setx24 Cubiertos BLACK",
    basePrice: 64900,
    logistics: { weightGrams: 500, heightCm: 15, widthCm: 15, depthCm: 15 },
  },
  SETX4: {
    productId: "import-product-setx4-individuales-cuerina-40x28cm-gris-oscuro-13l1s",
    slug: "setx4-individuales-cuerina-40x28cm-gris-oscuro-13l1s",
    name: "Set x4 individuales cuerina 40x28 cm gris oscuro",
    basePrice: 1000,
    logistics: { weightGrams: 20, heightCm: 10, widthCm: 10, depthCm: 1 },
  },
  PERAK: {
    productId: "import-product-indivudual-perak-flecos-negros-35-cm-cqaf7",
    slug: "indivudual-perak-flecos-negros-35-cm-cqaf7",
    name: "INDIVUDUAL PERAK FLECOS NEGROS 35 CM",
    basePrice: 9500,
    logistics: { weightGrams: 50, heightCm: 1, widthCm: 20, depthCm: 20 },
  },
  CONTENEDOR: {
    productId: "import-product-contenedor-bathroom",
    slug: "contenedor-bathroom",
    name: "Contenedor Bathroom",
    basePrice: 14900,
    logistics: { weightGrams: 80, heightCm: 20, widthCm: 13, depthCm: 2 },
  },
};

const FIXTURES: FixtureSpec[] = [
  {
    key: "01",
    orderNumber: "FINAL-E2E-SHIP-01",
    lines: [{ productKey: "CUBIERTOS", quantity: 4 }],
    recipient: {
      firstName: "Agustin",
      lastName: "Lopez",
      dni: "40111221",
      email: "final.e2e.01@deluar.test",
      phone: "+54 9 362 4123451",
      phoneAreaCode: "362",
      phoneNumber: "4123451",
      street: "Junin",
      streetNumber: "1234",
      floor: "2",
      apartment: "B",
      city: "Corrientes Capital",
      province: "Corrientes",
      postalCode: "3400",
      notes: "Final E2E Corrientes no llamar.",
    },
  },
  {
    key: "02",
    orderNumber: "FINAL-E2E-SHIP-02",
    lines: [
      { productKey: "CUBIERTOS", quantity: 4 },
      { productKey: "SETX4", quantity: 1 },
    ],
    recipient: {
      firstName: "Mariana",
      lastName: "Gomez",
      dni: "40111222",
      email: "final.e2e.02@deluar.test",
      phone: "+54 9 351 4123452",
      phoneAreaCode: "351",
      phoneNumber: "4123452",
      street: "Av Colon",
      streetNumber: "1450",
      floor: "6",
      apartment: "A",
      city: "Cordoba Capital",
      province: "Cordoba",
      postalCode: "5000",
      notes: "Final E2E Cordoba no llamar.",
    },
  },
  {
    key: "03",
    orderNumber: "FINAL-E2E-SHIP-03",
    lines: [
      { productKey: "CUBIERTOS", quantity: 4 },
      { productKey: "CONTENEDOR", quantity: 1 },
    ],
    recipient: {
      firstName: "Pedro",
      lastName: "Sosa",
      dni: "40111223",
      email: "final.e2e.03@deluar.test",
      phone: "+54 9 342 4123453",
      phoneAreaCode: "342",
      phoneNumber: "4123453",
      street: "San Martin",
      streetNumber: "987",
      floor: "1",
      apartment: "C",
      city: "Santa Fe",
      province: "Santa Fe",
      postalCode: "3000",
      notes: "Final E2E Santa Fe no llamar.",
    },
  },
  {
    key: "04",
    orderNumber: "FINAL-E2E-SHIP-04",
    lines: [
      { productKey: "CUBIERTOS", quantity: 4 },
      { productKey: "SETX4", quantity: 2 },
    ],
    recipient: {
      firstName: "Lucia",
      lastName: "Fernandez",
      dni: "40111224",
      email: "final.e2e.04@deluar.test",
      phone: "+54 9 341 4123454",
      phoneAreaCode: "341",
      phoneNumber: "4123454",
      street: "Belgrano",
      streetNumber: "1810",
      floor: "3",
      apartment: "D",
      city: "Rosario",
      province: "Santa Fe",
      postalCode: "2000",
      notes: "Final E2E Rosario no llamar.",
    },
  },
  {
    key: "05",
    orderNumber: "FINAL-E2E-SHIP-05",
    lines: [
      { productKey: "CUBIERTOS", quantity: 4 },
      { productKey: "PERAK", quantity: 1 },
      { productKey: "SETX4", quantity: 1 },
    ],
    recipient: {
      firstName: "Nicolas",
      lastName: "Ramirez",
      dni: "40111225",
      email: "final.e2e.05@deluar.test",
      phone: "+54 9 376 4123455",
      phoneAreaCode: "376",
      phoneNumber: "4123455",
      street: "Cordoba",
      streetNumber: "2150",
      floor: "5",
      apartment: "E",
      city: "Posadas",
      province: "Misiones",
      postalCode: "3300",
      notes: "Final E2E Posadas no llamar.",
    },
  },
];

function fail(message: string): never {
  throw new Error(message);
}

function buildOrderItems(fixture: FixtureSpec) {
  return fixture.lines.map((line) => {
    const product = PRODUCTS[line.productKey];
    const unitPrice = resolveCommercialUnitPrice(
      { basePrice: product.basePrice },
      PAYMENT_METHODS.TRANSFER,
    );

    return {
      productId: product.productId,
      productSlug: product.slug,
      title: product.name,
      imageUrl: null,
      quantity: line.quantity,
      unitPrice,
      lineTotal: unitPrice * line.quantity,
      weightGrams: product.logistics.weightGrams,
      heightCm: product.logistics.heightCm,
      widthCm: product.logistics.widthCm,
      depthCm: product.logistics.depthCm,
    };
  });
}

function buildEnvelopeReport(fixture: FixtureSpec) {
  const parcel = buildInitialShipmentParcel(
    fixture.lines.map((line) => {
      const product = PRODUCTS[line.productKey];
      return {
        weightGrams: product.logistics.weightGrams,
        heightCm: product.logistics.heightCm,
        widthCm: product.logistics.widthCm,
        depthCm: product.logistics.depthCm,
        quantity: line.quantity,
      };
    }),
  );

  const subtotal = buildOrderItems(fixture).reduce((sum, item) => sum + item.lineTotal, 0);
  return {
    subtotal,
    calculatedWeightGrams: parcel.calculatedWeightGrams,
    weightGrams: parcel.weightGrams,
    heightCm: parcel.heightCm,
    widthCm: parcel.widthCm,
    depthCm: parcel.depthCm,
    sumSides:
      parcel.heightCm !== null && parcel.widthCm !== null && parcel.depthCm !== null
        ? parcel.heightCm + parcel.widthCm + parcel.depthCm
        : null,
  };
}

function formatDimensions(parcel: { heightCm: number | null; widthCm: number | null; depthCm: number | null }) {
  return `${parcel.heightCm ?? "-"} x ${parcel.widthCm ?? "-"} x ${parcel.depthCm ?? "-"}`;
}

function selectAndreaniLocation(
  metadata: Awaited<ReturnType<typeof getAndreaniTemplateMetadata>>,
  fixture: FixtureSpec,
) {
  const locations: Record<FixtureSpec["key"], Array<{ province: string; city: string; postalCode: string }>> = {
    "01": [
      { province: "Corrientes", city: "Corrientes Capital", postalCode: "3400" },
      { province: "Corrientes", city: "Corrientes", postalCode: "3400" },
    ],
    "02": [
      { province: "Cordoba", city: "Cordoba Capital", postalCode: "5000" },
      { province: "Cordoba", city: "Cordoba", postalCode: "5000" },
    ],
    "03": [
      { province: "Santa Fe", city: "Santa Fe", postalCode: "3000" },
      { province: "Santa Fe", city: "Santa Fe Capital", postalCode: "3000" },
    ],
    "04": [
      { province: "Santa Fe", city: "Rosario", postalCode: "2000" },
      { province: "Santa Fe", city: "Rosario", postalCode: "S2000" },
    ],
    "05": [
      { province: "Misiones", city: "Posadas", postalCode: "3300" },
      { province: "Misiones", city: "Posadas", postalCode: "N3300" },
    ],
  };

  for (const candidate of locations[fixture.key]) {
    const lookupKey = normalizeAndreaniLocationKey(candidate.province, candidate.city, candidate.postalCode);
    const resolved = metadata.locationLookup.get(lookupKey);
    if (resolved) {
      return { ...candidate, resolved };
    }
  }

  fail(`No se encontro una ubicacion Andreani valida para ${fixture.orderNumber}.`);
}

async function cleanupExistingFinalFixtures() {
  const targetPrefix = "FINAL-E2E-SHIP-";
  const existingOrders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: targetPrefix } },
    select: { id: true, orderNumber: true, customerId: true, shippingAddressId: true },
  });

  if (existingOrders.length === 0) {
    return;
  }

  const orderIds = existingOrders.map((order) => order.id);
  const customerIds = [...new Set(existingOrders.map((order) => order.customerId))];
  const shippingAddressIds = [...new Set(existingOrders.map((order) => order.shippingAddressId).filter(Boolean))] as string[];
  const fixtureOrderNumbers = new Set(existingOrders.map((order) => order.orderNumber));
  const batches = await prisma.andreaniExportBatch.findMany({
    include: {
      shipments: {
        include: {
          order: { select: { orderNumber: true } },
        },
      },
    },
  });
  const batchIds = batches
    .filter((batch) => batch.shipments.length > 0 && batch.shipments.every((shipment) => fixtureOrderNumbers.has(shipment.order.orderNumber)))
    .map((batch) => batch.id);

  await prisma.$transaction(async (tx) => {
    if (batchIds.length > 0) {
      await tx.andreaniExportBatch.deleteMany({ where: { id: { in: batchIds } } });
    }

    await tx.mercadoPagoWebhookEvent.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.paymentWebhookEvent.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.emailLog.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.analyticsEvent.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.analyticsCart.deleteMany({ where: { convertedOrderId: { in: orderIds } } });
    await tx.order.deleteMany({ where: { id: { in: orderIds } } });

    if (shippingAddressIds.length > 0) {
      await tx.shippingAddress.deleteMany({ where: { id: { in: shippingAddressIds } } });
    }

    if (customerIds.length > 0) {
      const customers = await tx.customer.findMany({
        where: { id: { in: customerIds } },
        select: {
          id: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

      const deletableCustomerIds = customers.filter((customer) => customer._count.orders === 0).map((customer) => customer.id);
      if (deletableCustomerIds.length > 0) {
        await tx.customer.deleteMany({ where: { id: { in: deletableCustomerIds } } });
      }
    }
  });
}

async function createFixture(
  fixture: FixtureSpec,
  location: { province: string; city: string; postalCode: string },
) {
  const recipient = fixture.recipient;
  const shippingAddress = buildOrderShippingAddressSnapshot({
    firstName: recipient.firstName,
    lastName: recipient.lastName,
    dni: recipient.dni,
    email: recipient.email,
    phone: recipient.phone,
    phoneAreaCode: recipient.phoneAreaCode,
    phoneNumber: recipient.phoneNumber,
    street: recipient.street,
    streetNumber: recipient.streetNumber,
    floor: recipient.floor,
    apartment: recipient.apartment,
    city: location.city,
    province: location.province,
    postalCode: location.postalCode,
    notes: recipient.notes,
    shippingMethod: SHIPPING_METHODS.HOME_DELIVERY,
    paymentMethod: PAYMENT_METHODS.TRANSFER,
  });

  const items = buildOrderItems(fixture);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingCost = calculateShippingCost(subtotal, SHIPPING_METHODS.HOME_DELIVERY);
  const total = subtotal + shippingCost;

  const savedOrder = await saveOrder({
    orderNumber: fixture.orderNumber,
    customer: {
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      email: recipient.email,
      phone: recipient.phone,
      notes: recipient.notes,
    },
    shippingAddress,
    items,
    shippingMethod: SHIPPING_METHODS.HOME_DELIVERY,
    paymentMethod: PAYMENT_METHODS.TRANSFER,
    subtotal,
    shippingCost,
    total,
  });

  await prisma.order.update({
    where: { id: savedOrder.id },
    data: {
      status: "PAID",
      paymentStatus: "APPROVED",
      rawProviderStatus: "fixture_paid",
    },
  });

  await ensureAndreaniShipmentReadyForOrder(savedOrder.id);

  return savedOrder.id;
}

async function reportFixture(orderId: string, fixture: FixtureSpec) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      subtotal: true,
      shippingCost: true,
      total: true,
      shippingAddress: {
        select: {
          firstName: true,
          lastName: true,
          dni: true,
          email: true,
          phone: true,
          phoneAreaCode: true,
          phoneNumber: true,
          street: true,
          streetNumber: true,
          floor: true,
          apartment: true,
          city: true,
          province: true,
          postalCode: true,
        },
      },
      items: {
        select: {
          productName: true,
          productSlug: true,
          quantity: true,
        },
      },
      shipments: {
        orderBy: { createdAt: "asc" },
        include: {
          parcels: {
            orderBy: { sequence: "asc" },
          },
        },
      },
    },
  });

  if (!order) {
    fail(`No se pudo leer la orden ${fixture.orderNumber}.`);
  }

  const shipment = order.shipments[0];
  if (!shipment) {
    fail(`La orden ${fixture.orderNumber} no genero shipment.`);
  }

  const shipmentWithOrder = await prisma.shipment.findUnique({ where: { id: shipment.id }, include: shipmentExportInclude });
  if (!shipmentWithOrder) {
    fail(`No se pudo cargar el shipment ${shipment.id}.`);
  }

  const metadata = await getAndreaniTemplateMetadata();
  const plan = await validateAndreaniExcelExport([
    {
      ...toAndreaniExportSource(shipmentWithOrder),
      carrier: "ANDREANI",
    },
  ], metadata);

  const report = plan.shipments[0];
  const parcel = shipment.parcels[0] ?? null;

  return {
    orderNumber: order.orderNumber,
    destination: `${fixture.recipient.city}, ${fixture.recipient.province}`,
    products: order.items.map((item) => `${item.productName} x${item.quantity}`).join(" + "),
    subtotal: typeof order.subtotal === "number" ? order.subtotal : order.subtotal.toNumber(),
    shipmentStatus: shipment.status,
    shipmentId: shipment.id,
    calculatedWeightGrams: parcel?.calculatedWeightGrams ?? null,
    weightGrams: parcel?.weightGrams ?? null,
    heightCm: parcel?.heightCm ?? null,
    widthCm: parcel?.widthCm ?? null,
    depthCm: parcel?.depthCm ?? null,
    sumSides:
      parcel?.heightCm !== null && parcel?.widthCm !== null && parcel?.depthCm !== null
        ? parcel.heightCm + parcel.widthCm + parcel.depthCm
        : null,
    exportable: Boolean(report?.exportable),
  };
}

async function main() {
  ({ prisma } = await import("../src/lib/prisma"));
  ({ saveOrder } = await import("../src/features/orders/server/order-repository"));
  ({ calculateShippingCost, SHIPPING_METHODS } = await import("../src/features/shipping/shipping"));
  ({ PAYMENT_METHODS } = await import("../src/features/payments/types"));
  ({ resolveCommercialUnitPrice } = await import("../src/features/pricing/commercial-pricing"));
  ({ buildOrderShippingAddressSnapshot } = await import("../src/features/order/validation"));
  ({ buildInitialShipmentParcel } = await import("../src/features/shipments/server/shipment-readiness"));
  ({ ensureAndreaniShipmentReadyForOrder } = await import("../src/features/shipments/server/shipment-service"));
  ({
    shipmentExportInclude,
    toAndreaniExportSource,
  } = await import("../src/features/shipments/andreani-export/service"));
  ({ getAndreaniExportsDashboardData } = await import("../src/features/shipments/andreani-export/batch-service"));
  ({ getAndreaniTemplateMetadata } = await import("../src/features/shipments/andreani-export/template"));
  ({ validateAndreaniExcelExport } = await import("../src/features/shipments/andreani-export/validation"));
  ({ normalizeAndreaniLocationKey } = await import("../src/features/shipments/andreani-export/normalize"));
  ({ SHIPMENT_STATUSES } = await import("../src/features/shipments/types"));

  await cleanupExistingFinalFixtures();

  console.log("Plan final E2E:");
  for (const fixture of FIXTURES) {
    const envelope = buildEnvelopeReport(fixture);
    console.log(
      [
        fixture.orderNumber,
        `subtotal=${envelope.subtotal}`,
        `peso=${envelope.weightGrams}`,
        `dimensiones=${formatDimensions(envelope)}`,
        `suma_lados=${envelope.sumSides}`,
      ].join(" | "),
    );
  }

  const metadata = await getAndreaniTemplateMetadata();

  for (const fixture of FIXTURES) {
    const location = selectAndreaniLocation(metadata, fixture);
    console.log(`Creando ${fixture.orderNumber} en ${location.resolved}...`);
    const orderId = await createFixture(fixture, location);
    const report = await reportFixture(orderId, fixture);
    console.log(
      [
        `orderNumber=${report.orderNumber}`,
        `destino=${report.destination}`,
        `productos=${report.products}`,
        `subtotal=${report.subtotal}`,
        `shipmentStatus=${report.shipmentStatus === SHIPMENT_STATUSES.READY ? "READY" : report.shipmentStatus}`,
        `peso=${report.calculatedWeightGrams ?? "-"}`,
        `dimensiones=${formatDimensions(report)}`,
        `suma_lados=${report.sumSides ?? "-"}`,
        `Generar etiqueta=${report.exportable ? "SI" : "NO"}`,
      ].join(" | "),
    );
  }

  const dashboard = await getAndreaniExportsDashboardData("");
  console.log(
    JSON.stringify(
      {
        pending: dashboard.summary.pending,
        generatedBatches: dashboard.summary.generatedBatches,
        generatedShipments: dashboard.summary.generatedShipments,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
