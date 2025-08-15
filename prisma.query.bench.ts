import { bench } from "@ark/attest";

import type { PrismaClient } from "./generated/client.ts";

declare const prisma: PrismaClient;

// trivial getAll expressions moved to baseline to match drizzle
bench.baseline(async () => {
  await prisma.customer.findMany();
  await prisma.employee.findMany();
  await prisma.supplier.findMany();
  await prisma.product.findMany();
  await prisma.order.findMany();
});

bench("Prisma ORM Customers: getInfo", async () => {
  await prisma.customer.findUnique({
    where: {
      id: "id1",
    },
  });
}).types([437, "instantiations"]);

bench("Prisma ORM Customers: search", async () => {
  await prisma.customer.findMany({
    where: {
      companyName: {
        contains: "search1",
        mode: "insensitive",
      },
    },
  });
}).types([213, "instantiations"]);

bench("Prisma ORM Employees: getInfo", async () => {
  await prisma.employee.findUnique({
    where: {
      id: "id2",
    },
    include: {
      recipient: true,
    },
  });
}).types([1050, "instantiations"]);

bench("Prisma ORM Suppliers: getInfo", async () => {
  await prisma.supplier.findUnique({
    where: {
      id: "id3",
    },
  });
}).types([429, "instantiations"]);

bench("Prisma ORM Products: getInfo", async () => {
  await prisma.product.findUnique({
    where: {
      id: "id4",
    },
    include: {
      supplier: true,
    },
  });
}).types([900, "instantiations"]);

bench("Prisma ORM Products: search", async () => {
  await prisma.product.findMany({
    where: {
      name: {
        contains: "search2",
        mode: "insensitive",
      },
    },
  });
}).types([213, "instantiations"]);

bench("Prisma ORM Orders: getAll", async () => {
  const result = await prisma.order.findMany({
    include: {
      details: true,
    },
  });
  result.map((item) => {
    return {
      id: item.id,
      shippedDate: item.shippedDate,
      shipName: item.shipName,
      shipCity: item.shipCity,
      shipCountry: item.shipCountry,
      productsCount: item.details.length,
      quantitySum: item.details.reduce(
        (sum, detail) => (sum += +detail.quantity),
        0,
      ),
      totalPrice: item.details.reduce(
        (sum, detail) => (sum += +detail.quantity * +detail.unitPrice),
        0,
      ),
    };
  });
}).types([1538, "instantiations"]);

bench("Prisma ORM Orders: getById", async () => {
  const result = await prisma.order.findFirst({
    include: {
      details: true,
    },
    where: {
      id: "id5",
    },
  });

  return {
    id: result!.id,
    shippedDate: result!.shippedDate,
    shipName: result!.shipName,
    shipCity: result!.shipCity,
    shipCountry: result!.shipCountry,
    productsCount: result!.details.length,
    quantitySum: result!.details.reduce(
      (sum, detail) => (sum += +detail.quantity),
      0,
    ),
    totalPrice: result!.details.reduce(
      (sum, detail) => (sum += +detail.quantity * +detail.unitPrice),
      0,
    ),
  };
}).types([1542, "instantiations"]);

bench("Prisma ORM Orders: getInfo", async () => {
  await prisma.order.findMany({
    where: {
      id: "id6",
    },
    include: {
      details: {
        include: {
          product: true,
        },
      },
    },
  });
}).types([747, "instantiations"]);
