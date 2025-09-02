# drizzle-comparison

Based on [Drizzle's Northwind benchmarks](https://github.com/drizzle-team/drizzle-northwind-benchmarks-pg), stripped down to only the typed expressions.

## Conclusions

Prisma is able to evaluate its generated client types about 10x as efficiently as Drizzle can evaluate its corresponding schemas.

Even once the schema is evaluated, Prisma is also able to check query interactions significantly more efficiently than Drizzle.

**Three Query Approaches Compared:**
1. **Prisma ORM**: Generated types, most efficient
2. **Drizzle RQB**: High-level relational API with `db.query.*` and `with` clauses
3. **Drizzle SQL-like**: Manual query builder with explicit joins

Critically, this doesn't necessarily tell us which types are better optimized since Drizzle schemas are inferred directly from `.ts` whereas Prisma client types are statically generated via `prisma generate`.

Each approach has its own trade offs, but this data confirms that an _extremely_ significant benefit of a typegen step is the type performance ceiling. If your schema is large and complex, you will get much further with Prisma before running up against the boundaries of TypeScript.

## Schemas

### Type Instantiations

| File               | Drizzle | Prisma | diff (count) | diff (%) |
| ------------------ | ------- | ------ | ------------ | -------- |
| \*.schema.bench.ts | 5017    | 428    | +4589        | +1072%   |

### Check Time

| File               | Drizzle  | Prisma   | diff (ms) | diff (%) |
| ------------------ | -------- | -------- | --------- | -------- |
| \*.schema.bench.ts | 161.12ms | 120.74ms | +40.38ms  | +33%     |

## Queries

### Type Instantiations

| Label              | Prisma  | Drizzle RQB | Drizzle SQL | RQB vs Prisma | SQL vs Prisma |
| ------------------ | ------- | ----------- | ----------- | ------------- | ------------- |
| Customers: getInfo | 437     | 364         | 883         | -17%          | +102%         |
| Customers: search  | 213     | 282         | 838         | +32%          | +293%         |
| Employees: getInfo | 1050    | 514         | 2963        | -51%          | +182%         |
| Suppliers: getInfo | 429     | 364         | 851         | -15%          | +98%          |
| Products: getInfo  | 900     | 514         | 1779        | -43%          | +98%          |
| Products: search   | 213     | 298         | 821         | +40%          | +285%         |
| Orders: getAll     | 1538    | 955         | 2451        | -38%          | +59%          |
| Orders: getById    | 1542    | 1022        | 2657        | -34%          | +72%          |
| Orders: getInfo    | 747     | 459         | 2781        | -39%          | +272%         |
| **Average**        | **785** | **530**     | **1780**    | **-32%**      | **+127%**     |

### Check Time

| File              | Prisma | Drizzle RQB | Drizzle SQL | RQB vs Prisma | SQL vs Prisma |
| ----------------- | ------ | ----------- | ----------- | ------------- | ------------- |
| \*.query.bench.ts | 155.58ms  | 175.83ms | 204.21ms    | +13%          | +31%          |
