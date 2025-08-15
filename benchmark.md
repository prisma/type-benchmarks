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
| \*.schema.bench.ts | 41150   | 428    | +40722       | +9514%   |

### Check Time

| File               | Drizzle | Prisma | diff (ms) | diff (%) |
| ------------------ | ------- | ------ | --------- | -------- |
| \*.schema.bench.ts | 219ms   | 101ms  | +118ms    | +117%    |

## Queries

### Type Instantiations

| Label              | Prisma | Drizzle RQB | Drizzle SQL | RQB vs Prisma | SQL vs Prisma |
| ------------------ | ------ | ----------- | ----------- | ------------- | ------------- |
| Customers: getInfo | 437    | 731         | 751         | +67%          | +72%          |
| Customers: search  | 213    | 341         | 701         | +60%          | +229%         |
| Employees: getInfo | 1050   | 1710        | 8448        | +63%          | +705%         |
| Suppliers: getInfo | 429    | 697         | 699         | +62%          | +63%          |
| Products: getInfo  | 900    | 1626        | 1753        | +81%          | +95%          |
| Products: search   | 213    | 341         | 609         | +60%          | +186%         |
| Orders: getAll     | 1538   | 1441        | 2179        | -6%           | +42%          |
| Orders: getById    | 1542   | 1649        | 2385        | +7%           | +55%          |
| Orders: getInfo    | 747    | 1950        | 2671        | +161%         | +258%         |
| **Average**        | **785** | **1165**    | **2244**    | **+48%**      | **+186%**     |

**Key Observations:**
- **Drizzle RQB** performs significantly better than SQL-like queries (-48% fewer instantiations on average)
- **Drizzle RQB** is +48% more expensive than Prisma, but much closer than SQL-like approach (+186% more expensive)

### Check Time

| File              | Prisma | Drizzle RQB | Drizzle SQL | RQB vs Prisma | SQL vs Prisma |
| ----------------- | ------ | ----------- | ----------- | ------------- | ------------- |
| \*.query.bench.ts | 134ms  | 231ms       | 253ms       | +72%          | +89%          |
