import { PrismaClient } from ".prisma/client";

export type BasePrismaClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>