/**
 * Drizzle ORM Relational Queries Benchmark Suite
 *
 * This benchmark suite tests Drizzle's high-level relational queries API (RQB)
 * using the `db.query.*` pattern with `with` clauses for relationships.
 * This provides a direct comparison to Prisma's query patterns and is distinct
 * from the SQL-like query builder API used in drizzle.query.bench.ts.
 */

import { bench } from "@ark/attest";
import { relations } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  date,
  doublePrecision,
  foreignKey,
  integer,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";

const customers = pgTable("customers", {
  id: varchar("id", { length: 5 }).primaryKey().notNull(),
  companyName: varchar("company_name").notNull(),
  contactName: varchar("contact_name").notNull(),
  contactTitle: varchar("contact_title").notNull(),
  address: varchar("address").notNull(),
  city: varchar("city").notNull(),
  postalCode: varchar("postal_code"),
  region: varchar("region"),
  country: varchar("country").notNull(),
  phone: varchar("phone").notNull(),
  fax: varchar("fax"),
});

const employees = pgTable(
  "employees",
  {
    id: varchar("id").primaryKey().notNull(),
    lastName: varchar("last_name").notNull(),
    firstName: varchar("first_name"),
    title: varchar("title").notNull(),
    titleOfCourtesy: varchar("title_of_courtesy").notNull(),
    birthDate: date("birth_date", { mode: "date" }).notNull(),
    hireDate: date("hire_date", { mode: "date" }).notNull(),
    address: varchar("address").notNull(),
    city: varchar("city").notNull(),
    postalCode: varchar("postal_code").notNull(),
    country: varchar("country").notNull(),
    homePhone: varchar("home_phone").notNull(),
    extension: integer("extension").notNull(),
    notes: text("notes").notNull(),
    recipientId: varchar("recipient_id"),
  },
  (table) => [
    foreignKey({
      columns: [table.recipientId],
      foreignColumns: [table.id],
      name: "recipientFk",
    }),
  ],
);

const orders = pgTable("orders", {
  id: varchar("id").primaryKey().notNull(),
  orderDate: date("order_date", { mode: "date" }).notNull(),
  requiredDate: date("required_date", { mode: "date" }).notNull(),
  shippedDate: date("shipped_date", { mode: "date" }),
  shipVia: integer("ship_via").notNull(),
  freight: doublePrecision("freight").notNull(),
  shipName: varchar("ship_name").notNull(),
  shipCity: varchar("ship_city").notNull(),
  shipRegion: varchar("ship_region"),
  shipPostalCode: varchar("ship_postal_code"),
  shipCountry: varchar("ship_country").notNull(),

  customerId: varchar("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),

  employeeId: varchar("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
});

const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().notNull(),
  companyName: varchar("company_name").notNull(),
  contactName: varchar("contact_name").notNull(),
  contactTitle: varchar("contact_title").notNull(),
  address: varchar("address").notNull(),
  city: varchar("city").notNull(),
  region: varchar("region"),
  postalCode: varchar("postal_code").notNull(),
  country: varchar("country").notNull(),
  phone: varchar("phone").notNull(),
});

const products = pgTable("products", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  quantityPerUnit: varchar("qt_per_unit").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  unitsInStock: integer("units_in_stock").notNull(),
  unitsOnOrder: integer("units_on_order").notNull(),
  reorderLevel: integer("reorder_level").notNull(),
  discontinued: integer("discontinued").notNull(),

  supplierId: varchar("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
});

const details = pgTable("order_details", {
  unitPrice: doublePrecision("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
  discount: doublePrecision("discount").notNull(),

  orderId: varchar("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),

  productId: varchar("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
});

const ordersRelations = relations(orders, (r) => {
  return {
    details: r.many(details),
    products: r.many(products),
  };
});

const detailsRelations = relations(details, (r) => {
  return {
    order: r.one(orders, {
      fields: [details.orderId],
      references: [orders.id],
    }),
    product: r.one(products, {
      fields: [details.productId],
      references: [products.id],
    }),
  };
});

const employeesRelations = relations(employees, (r) => {
  return {
    recipient: r.one(employees, {
      fields: [employees.recipientId],
      references: [employees.id],
    }),
  };
});

const productsRelations = relations(products, (r) => {
  return {
    supplier: r.one(suppliers, {
      fields: [products.supplierId],
      references: [suppliers.id],
    }),
    order: r.one(orders),
  };
});

const schema = {
  customers,
  employees,
  orders,
  suppliers,
  products,
  details,
  ordersRelations,
  detailsRelations,
  employeesRelations,
  productsRelations,
};

// Type-safe database client with schema for relational queries
// This enables the db.query.* API with full type safety and relationship support
declare const drizzle: NodePgDatabase<typeof schema>;

// trivial getAll expressions moved to baseline to match other benchmarks
bench.baseline(async () => {
  await drizzle.query.customers.findMany();
  await drizzle.query.employees.findMany();
  await drizzle.query.suppliers.findMany();
  await drizzle.query.products.findMany();
  await drizzle.query.orders.findMany();
});

bench("Drizzle RQB Customers: getInfo", async () => {
  await drizzle.query.customers.findFirst({
    where: (customers, { eq }) => eq(customers.id, "id1"),
  });
}).types([731, "instantiations"]);

bench("Drizzle RQB Customers: search", async () => {
  await drizzle.query.customers.findMany({
    where: (customers, { ilike }) => ilike(customers.companyName, "%search1%"),
  });
}).types([341, "instantiations"]);

bench("Drizzle RQB Employees: getInfo", async () => {
  await drizzle.query.employees.findFirst({
    where: (employees, { eq }) => eq(employees.id, "id2"),
    with: {
      recipient: true,
    },
  });
}).types([1710, "instantiations"]);

bench("Drizzle RQB Suppliers: getInfo", async () => {
  await drizzle.query.suppliers.findFirst({
    where: (suppliers, { eq }) => eq(suppliers.id, "id3"),
  });
}).types([697, "instantiations"]);

bench("Drizzle RQB Products: getInfo", async () => {
  await drizzle.query.products.findFirst({
    where: (products, { eq }) => eq(products.id, "id4"),
    with: {
      supplier: true,
    },
  });
}).types([1626, "instantiations"]);

bench("Drizzle RQB Products: search", async () => {
  await drizzle.query.products.findMany({
    where: (products, { ilike }) => ilike(products.name, "%search2%"),
  });
}).types([341, "instantiations"]);

bench("Drizzle RQB Orders: getAll", async () => {
  const result = await drizzle.query.orders.findMany({
    with: {
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
}).types([1441, "instantiations"]);

bench("Drizzle RQB Orders: getById", async () => {
  const result = await drizzle.query.orders.findFirst({
    where: (orders, { eq }) => eq(orders.id, "id5"),
    with: {
      details: true,
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
}).types([1649, "instantiations"]);

bench("Drizzle RQB Orders: getInfo", async () => {
  await drizzle.query.orders.findMany({
    where: (orders, { eq }) => eq(orders.id, "id6"),
    with: {
      details: {
        with: {
          product: true,
        },
      },
    },
  });
}).types([1950, "instantiations"]);
