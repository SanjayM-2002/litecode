export { Prisma, PrismaClient } from "@prisma/client";
export type { Post as PostEntity, User as UserEntity } from "@prisma/client";
export { db } from "./db";
export { genId } from "./util";
