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
type AndreaniExportServiceModule = typeof import("../src/features/shipments/andreani-export/service");
type AndreaniTemplateModule = typeof import("../src/features/shipments/andreani-export/template");
type AndreaniValidationModule = typeof import("../src/features/shipments/andreani-export/validation");
type AndreaniNormalizeModule = typeof import("../src/features/shipments/andreani-export/normalize");
type ShipmentTypesModule = typeof import("../src/features/shipments/types");

type FixtureProductSeed = {
  key: "CUBIERTOS" | "SETX4" | "PERAK" | "CONTENEDOR";
  productId: string;
  productSlug: string;
  productName: string;
  basePrice: number;
  transferPrice?: number | null;
  logistics: {
    weightGrams: number;
    heightCm: number;
    widthCm: number;
    depthCm: number;
  };
};

type FixtureLine = {
  productKey: FixtureProductSeed["key"];
  quantity: number;
};

type FixtureSpec = {
  key: "CORRIENTES" | "CORDOBA" | "SANTAFE";
  orderNumber: string;
  lines: FixtureLine[];
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
};

type CreatedFixtureReport = {
  orderNumber: string;
  destination: string;
  products: Array<{ productName: string; productSlug: string; quantity: number }>;
  subtotal: number;
  shippingCost: number;
  total: number;
  shipmentId: string;
  shipmentStatus: string;
  calculatedWeightGrams: number | null;
  weightGrams: number | null;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  sumSides: number | null;
  recipientComplete: boolean;
  exportableAndreani: boolean;
  humanReason: string | null;
  knownGoodEnvelope: boolean;
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
let getAndreaniTemplateMetadata: AndreaniTemplateModule["getAndreaniTemplateMetadata"];
let validateAndreaniExcelExport: AndreaniValidationModule["validateAndreaniExcelExport"];
let normalizeAndreaniLocationKey: AndreaniNormalizeModule["normalizeAndreaniLocationKey"];
let SHIPMENT_STATUSES: ShipmentTypesModule["SHIPMENT_STATUSES"];

const FIXTURE_PRODUCTS: Record<FixtureProductSeed["key"], FixtureProductSeed> = {
  CUBIERTOS: {
    key: "CUBIERTOS",
    productId: "import-product-cubiertos-147b7",
    productSlug: "cubiertos-147b7",
    productName: "Setx24 Cubiertos BLACK",
    basePrice: 64900,
    logistics: {
      weightGrams: 500,
      heightCm: 15,
      widthCm: 15,
      depthCm: 15,
    },
  },
  SETX4: {
    key: "SETX4",
    productId: "import-product-setx4-individuales-cuerina-40x28cm-gris-oscuro-13l1s",
    productSlug: "setx4-individuales-cuerina-40x28cm-gris-oscuro-13l1s",
    productName: "Set x4 individuales cuerina 40x28 cm gris oscuro",
    basePrice: 1000,
    logistics: {
      weightGrams: 20,
      heightCm: 10,
      widthCm: 10,
      depthCm: 1,
    },
  },
  PERAK: {
    key: "PERAK",
    productId: "import-product-indivudual-perak-flecos-negros-35-cm-cqaf7",
    productSlug: "indivudual-perak-flecos-negros-35-cm-cqaf7",
    productName: "INDIVUDUAL PERAK FLECOS NEGROS 35 CM",
    basePrice: 9500,
    logistics: {
      weightGrams: 50,
      heightCm: 1,
      widthCm: 20,
      depthCm: 20,
    },
  },
  CONTENEDOR: {
    key: "CONTENEDOR",
    productId: "import-product-contenedor-bathroom",
    productSlug: "contenedor-bathroom",
    productName: "Contenedor Bathroom",
    basePrice: 14900,
    logistics: {
      weightGrams: 80,
      heightCm: 20,
      widthCm: 13,
      depthCm: 2,
    },
  },
};

const FIXTURES: FixtureSpec[] = [
  {
    key: "CORRIENTES",
    orderNumber: "E2E-SHIP-CORRIENTES-20260901-01",
    lines: [{ productKey: "CUBIERTOS", quantity: 4 }],
    recipient: {
      firstName: "Juan",
      lastName: "Perez",
      dni: "33111222",
      email: "juan.perez.e2e@deluar.test",
      phone: "+54 9 379 4123456",
      phoneAreaCode: "379",
      phoneNumber: "4123456",
      street: "Junin",
      streetNumber: "1234",
      floor: "2",
      apartment: "B",
      city: "Corrientes Capital",
      province: "Corrientes",
      postalCode: "3400",
      notes: "Fixture E2E Corrientes - no llamar.",
    },
  },
  {
    key: "CORDOBA",
    orderNumber: "E2E-SHIP-CORDOBA-20260901-01",
    lines: [
      { productKey: "CUBIERTOS", quantity: 4 },
      { productKey: "SETX4", quantity: 1 },
    ],
    recipient: {
      firstName: "Maria",
      lastName: "Lopez",
      dni: "34111223",
      email: "maria.lopez.e2e@deluar.test",
      phone: "+54 9 351 4123456",
      phoneAreaCode: "351",
      phoneNumber: "4123456",
      street: "Av. Colon",
      streetNumber: "1450",
      floor: "6",
      apartment: "A",
      city: "Cordoba Capital",
      province: "Cordoba",
      postalCode: "5000",
      notes: "Fixture E2E Cordoba - no llamar.",
    },
  },
  {
    key: "SANTAFE",
    orderNumber: "E2E-SHIP-SANTAFE-20260901-01",
    lines: [
      { productKey: "CUBIERTOS", quantity: 4 },
      { productKey: "CONTENEDOR", quantity: 1 },
    ],
    recipient: {
      firstName: "Pedro",
      lastName: "Gomez",
      dni: "36111224",
      email: "pedro.gomez.e2e@deluar.test",
      phone: "+54 9 342 4123456",
      phoneAreaCode: "342",
      phoneNumber: "4123456",
      street: "San Martin",
      streetNumber: "987",
      floor: "1",
      apartment: "C",
      city: "Santa Fe Capital",
      province: "Santa Fe",
      postalCode: "3000",
      notes: "Fixture E2E Santa Fe - no llamar.",
    },
  },
];

function fail(message: string): never {
  throw new Error(message);
}

function buildCheckoutValues(fixture: { recipient: FixtureSpec["recipient"] }) {
  return {
    firstName: fixture.recipient.firstName,
    lastName: fixture.recipient.lastName,
    dni: fixture.recipient.dni,
    email: fixture.recipient.email,
    phone: fixture.recipient.phone,
    phoneAreaCode: fixture.recipient.phoneAreaCode,
    phoneNumber: fixture.recipient.phoneNumber,
    street: fixture.recipient.street,
    streetNumber: fixture.recipient.streetNumber,
    floor: fixture.recipient.floor,
    apartment: fixture.recipient.apartment,
    city: fixture.recipient.city,
    province: fixture.recipient.province,
    postalCode: fixture.recipient.postalCode,
    notes: fixture.recipient.notes,
    shippingMethod: SHIPPING_METHODS.HOME_DELIVERY,
    paymentMethod: PAYMENT_METHODS.TRANSFER,
  };
}

function formatDimensions(parcel: { heightCm: number | null; widthCm: number | null; depthCm: number | null }) {
  return `${parcel.heightCm ?? "-"} x ${parcel.widthCm ?? "-"} x ${parcel.depthCm ?? "-"}`;
}

function makeHumanReason(issues: Array<{ message: string }>) {
  if (issues.length === 0) {
    return null;
  }

  const messages = [...new Set(issues.map((issue) => issue.message).filter(Boolean))];
  return messages.slice(0, 2).join(" · ");
}

function getFixtureProducts(fixture: FixtureSpec) {
  return fixture.lines.map((line) => {
    const product = FIXTURE_PRODUCTS[line.productKey];

    return {
      ...product,
      quantity: line.quantity,
    };
  });
}

function buildFixtureItems(fixture: FixtureSpec) {
  return getFixtureProducts(fixture).map((product) => {
    const unitPrice = resolveCommercialUnitPrice(
      {
        basePrice: product.basePrice,
        transferPrice: product.transferPrice,
      },
      PAYMENT_METHODS.TRANSFER,
    );

    return {
      productId: product.productId,
      productSlug: product.productSlug,
      title: product.productName,
      imageUrl: null,
      quantity: product.quantity,
      unitPrice,
      transferPrice: product.transferPrice ?? undefined,
      lineTotal: unitPrice * product.quantity,
      weightGrams: product.logistics.weightGrams,
      heightCm: product.logistics.heightCm,
      widthCm: product.logistics.widthCm,
      depthCm: product.logistics.depthCm,
    };
  });
}

function evaluateFixtureEnvelope(fixture: FixtureSpec) {
  const items = getFixtureProducts(fixture).map((product) => ({
    weightGrams: product.logistics.weightGrams,
    heightCm: product.logistics.heightCm,
    widthCm: product.logistics.widthCm,
    depthCm: product.logistics.depthCm,
    quantity: product.quantity,
  }));
  const parcel = buildInitialShipmentParcel(items);
  const subtotal = buildFixtureItems(fixture).reduce((sum, item) => sum + item.lineTotal, 0);

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
    knownGoodEnvelope:
      (parcel.weightGrams ?? 0) >= 2000 &&
      (parcel.heightCm ?? 0) >= 10 &&
      (parcel.widthCm ?? 0) >= 10 &&
      (parcel.depthCm ?? 0) >= 10 &&
      ((parcel.heightCm ?? 0) + (parcel.widthCm ?? 0) + (parcel.depthCm ?? 0)) >= 35 &&
      subtotal >= 100000,
  };
}

async function cleanupExistingFixtures(orderNumbers: string[]) {
  const targetSet = new Set(orderNumbers);

  const existingOrders = await prisma.order.findMany({
    where: {
      orderNumber: {
        in: orderNumbers,
      },
    },
    select: {
      id: true,
      orderNumber: true,
      customerId: true,
    },
  });

  if (existingOrders.length === 0) {
    return;
  }

  const existingOrderIds = existingOrders.map((order) => order.id);
  const existingCustomerIds = [...new Set(existingOrders.map((order) => order.customerId))];

  const batches = await prisma.andreaniExportBatch.findMany({
    include: {
      shipments: {
        include: {
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
      },
    },
  });

  const batchIdsToDelete = batches
    .filter((batch) => {
      if (batch.shipments.length === 0) {
        return false;
      }

      return batch.shipments.every((shipment) => targetSet.has(shipment.order.orderNumber));
    })
    .map((batch) => batch.id);

  await prisma.$transaction(async (tx) => {
    if (batchIdsToDelete.length > 0) {
      await tx.andreaniExportBatch.deleteMany({
        where: {
          id: {
            in: batchIdsToDelete,
          },
        },
      });
    }

    if (existingOrderIds.length > 0) {
      await tx.paymentWebhookEvent.deleteMany({
        where: {
          orderId: {
            in: existingOrderIds,
          },
        },
      });

      await tx.emailLog.deleteMany({
        where: {
          orderId: {
            in: existingOrderIds,
          },
        },
      });

      await tx.analyticsEvent.deleteMany({
        where: {
          orderId: {
            in: existingOrderIds,
          },
        },
      });

      await tx.order.deleteMany({
        where: {
          id: {
            in: existingOrderIds,
          },
        },
      });
    }

    if (existingCustomerIds.length > 0) {
      const customers = await tx.customer.findMany({
        where: {
          id: {
            in: existingCustomerIds,
          },
        },
        select: {
          id: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

      const deletableCustomerIds = customers
        .filter((customer) => customer._count.orders === 0)
        .map((customer) => customer.id);

      if (deletableCustomerIds.length > 0) {
        await tx.customer.deleteMany({
          where: {
            id: {
              in: deletableCustomerIds,
            },
          },
        });
      }
    }
  });
}

function resolveAndreaniLocation(
  metadata: Awaited<ReturnType<typeof getAndreaniTemplateMetadata>>,
  fixture: FixtureSpec,
) {
  const variantsByKey: Record<FixtureSpec["key"], Array<{ province: string; city: string; postalCode: string }>> = {
    CORRIENTES: [
      { province: "Corrientes", city: "Corrientes Capital", postalCode: "3400" },
      { province: "Corrientes", city: "Corrientes", postalCode: "3400" },
      { province: "Corrientes", city: "Corrientes Capital", postalCode: "W3400" },
      { province: "Corrientes", city: "Corrientes", postalCode: "W3400" },
    ],
    CORDOBA: [
      { province: "Cordoba", city: "Cordoba Capital", postalCode: "5000" },
      { province: "Cordoba", city: "Cordoba", postalCode: "5000" },
      { province: "Cordoba", city: "CÃ³rdoba Capital", postalCode: "5000" },
      { province: "Cordoba", city: "CÃ³rdoba", postalCode: "5000" },
    ],
    SANTAFE: [
      { province: "Santa Fe", city: "Santa Fe Capital", postalCode: "3000" },
      { province: "Santa Fe", city: "Santa Fe", postalCode: "3000" },
      { province: "Santa Fe", city: "Santa Fe Capital", postalCode: "S3000" },
      { province: "Santa Fe", city: "Santa Fe", postalCode: "S3000" },
    ],
  };

  for (const candidate of variantsByKey[fixture.key]) {
    const lookupKey = normalizeAndreaniLocationKey(candidate.province, candidate.city, candidate.postalCode);
    const resolved = metadata.locationLookup.get(lookupKey);

    if (resolved) {
      return {
        province: candidate.province,
        city: candidate.city,
        postalCode: candidate.postalCode,
        resolved,
      };
    }
  }

  const attempted = variantsByKey[fixture.key]
    .map((candidate) => `${candidate.province} / ${candidate.city} / ${candidate.postalCode}`)
    .join(" | ");

  fail(`No se encontro una ubicacion Andreani valida para ${fixture.key}. Intentos: ${attempted}`);
}

async function createFixtureOrder(
  fixture: FixtureSpec,
  location: { province: string; city: string; postalCode: string },
) {
  const customerInput = buildCheckoutValues({
    ...fixture,
    recipient: {
      ...fixture.recipient,
      province: location.province,
      city: location.city,
      postalCode: location.postalCode,
    },
  });

  const items = buildFixtureItems(fixture);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingCost = calculateShippingCost(subtotal, SHIPPING_METHODS.HOME_DELIVERY);
  const total = subtotal + shippingCost;
  const shippingAddress = buildOrderShippingAddressSnapshot(customerInput);

  const savedOrder = await saveOrder({
    orderNumber: fixture.orderNumber,
    customer: {
      firstName: customerInput.firstName,
      lastName: customerInput.lastName,
      email: customerInput.email,
      phone: customerInput.phone,
      notes: customerInput.notes,
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

async function reportCreatedOrder(orderId: string, fixture: FixtureSpec) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      subtotal: true,
      shippingCost: true,
      total: true,
      shippingMethod: true,
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
          notes: true,
        },
      },
      items: {
        select: {
          productName: true,
          productSlug: true,
          quantity: true,
          unitPrice: true,
          weightGrams: true,
          heightCm: true,
          widthCm: true,
          depthCm: true,
        },
      },
      shipments: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          parcels: {
            orderBy: {
              sequence: "asc",
            },
          },
        },
      },
    },
  });

  if (!order) {
    fail(`No se pudo leer la orden creada ${fixture.orderNumber}.`);
  }

  const shipment = order.shipments[0];

  if (!shipment) {
    fail(`La orden ${fixture.orderNumber} no genero shipment automatico.`);
  }

  const metadata = await getAndreaniTemplateMetadata();
  const shipmentWithOrder = await prisma.shipment.findUnique({ where: { id: shipment.id }, include: shipmentExportInclude });

  if (!shipmentWithOrder) {
    fail(`No se pudo cargar el shipment ${shipment.id}.`);
  }

  const source = toAndreaniExportSource(shipmentWithOrder);
  const plan = await validateAndreaniExcelExport([source], metadata);
  const report = plan.shipments[0];
  const parcel = shipment.parcels[0] ?? null;
  const exportableAndreani = Boolean(report?.exportable);
  const humanReason = report?.issues ? makeHumanReason(report.issues) : null;
  const recipient = order.shippingAddress;
  const recipientComplete = Boolean(
    recipient &&
      recipient.firstName &&
      recipient.lastName &&
      recipient.dni &&
      recipient.email &&
      recipient.phone &&
      recipient.phoneAreaCode &&
      recipient.phoneNumber &&
      recipient.street &&
      recipient.streetNumber &&
      recipient.city &&
      recipient.province &&
      recipient.postalCode,
  );

  return {
    orderNumber: order.orderNumber,
    destination: `${fixture.recipient.city}, ${fixture.recipient.province}`,
    products: order.items.map((item) => ({
      productName: item.productName,
      productSlug: item.productSlug,
      quantity: item.quantity,
    })),
    subtotal: typeof order.subtotal === "number" ? order.subtotal : order.subtotal.toNumber(),
    shippingCost: typeof order.shippingCost === "number" ? order.shippingCost : order.shippingCost.toNumber(),
    total: typeof order.total === "number" ? order.total : order.total.toNumber(),
    shipmentId: shipment.id,
    shipmentStatus: shipment.status,
    calculatedWeightGrams: parcel?.calculatedWeightGrams ?? null,
    weightGrams: parcel?.weightGrams ?? null,
    heightCm: parcel?.heightCm ?? null,
    widthCm: parcel?.widthCm ?? null,
    depthCm: parcel?.depthCm ?? null,
    sumSides:
      parcel?.heightCm !== null && parcel?.widthCm !== null && parcel?.depthCm !== null
        ? parcel.heightCm + parcel.widthCm + parcel.depthCm
        : null,
    recipientComplete,
    exportableAndreani,
    humanReason,
    knownGoodEnvelope: Boolean(
      (parcel?.weightGrams ?? 0) >= 2000 &&
        (parcel?.heightCm ?? 0) >= 10 &&
        (parcel?.widthCm ?? 0) >= 10 &&
        (parcel?.depthCm ?? 0) >= 10 &&
        ((parcel?.heightCm ?? 0) + (parcel?.widthCm ?? 0) + (parcel?.depthCm ?? 0)) >= 35 &&
        (typeof order.subtotal === "number" ? order.subtotal : order.subtotal.toNumber()) >= 100000,
    ),
  } satisfies CreatedFixtureReport;
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
  ({ getAndreaniTemplateMetadata } = await import("../src/features/shipments/andreani-export/template"));
  ({ validateAndreaniExcelExport } = await import("../src/features/shipments/andreani-export/validation"));
  ({ normalizeAndreaniLocationKey } = await import("../src/features/shipments/andreani-export/normalize"));
  ({ SHIPMENT_STATUSES } = await import("../src/features/shipments/types"));

  console.log("Plan de fixtures E2E detectado en base local:");
  for (const fixture of FIXTURES) {
    const evaluation = evaluateFixtureEnvelope(fixture);
    const itemsText = fixture.lines
      .map((line) => {
        const product = FIXTURE_PRODUCTS[line.productKey];
        return `${product.productName} x${line.quantity}`;
      })
      .join(" + ");

    console.log(
      [
        `${fixture.key}: ${itemsText}`,
        `subtotal=${evaluation.subtotal}`,
        `peso=${evaluation.weightGrams ?? "-"}`,
        `dimensiones=${formatDimensions(evaluation)}`,
        `suma_lados=${evaluation.sumSides ?? "-"}`,
        `knownGoodEnvelope=${evaluation.knownGoodEnvelope ? "SI" : "NO"}`,
      ].join(" | "),
    );
  }

  const orderedFixtures = [...FIXTURES];

  for (const fixture of orderedFixtures) {
    const locationMetadata = await getAndreaniTemplateMetadata();
    const location = resolveAndreaniLocation(locationMetadata, fixture);

    console.log(
      `Preparando fixture ${fixture.key} en Andreani para ${location.resolved} con pedido ${fixture.orderNumber}...`,
    );

    await cleanupExistingFixtures([fixture.orderNumber]);
    const orderId = await createFixtureOrder(fixture, location);
    const report = await reportCreatedOrder(orderId, fixture);

    const shipmentStatus = report.shipmentStatus === SHIPMENT_STATUSES.READY ? "READY" : report.shipmentStatus;

    console.log(
      [
        `orderNumber=${report.orderNumber}`,
        `destino=${report.destination}`,
        `productos=${report.products.map((product) => `${product.productName} x${product.quantity}`).join(" + ")}`,
        `subtotal=${report.subtotal}`,
        `shippingCost=${report.shippingCost}`,
        `total=${report.total}`,
        `shipmentId=${report.shipmentId}`,
        `shipmentStatus=${shipmentStatus}`,
        `peso_calculado=${report.calculatedWeightGrams ?? "-"}`,
        `dimensiones_calculadas=${formatDimensions({
          heightCm: report.heightCm,
          widthCm: report.widthCm,
          depthCm: report.depthCm,
        })}`,
        `suma_lados=${report.sumSides ?? "-"}`,
        `recipientComplete=${report.recipientComplete ? "SI" : "NO"}`,
        `exportableAndreani=${report.exportableAndreani ? "SI" : "NO"}`,
        `knownGoodEnvelope=${report.knownGoodEnvelope ? "SI" : "NO"}`,
        report.exportableAndreani ? null : `motivo=${report.humanReason ?? "No exportable"}`,
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
