import { bench } from "@ark/attest";

bench("prisma schemas", () => {
  return {} as InstanceType<
    typeof import("./generated/client.ts").PrismaClient
  >;
}).types([428, "instantiations"]);
