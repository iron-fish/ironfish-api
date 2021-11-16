import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BlocksDailyService } from "./blocks-daily.service";

@Injectable()
export class BlocksDailyLoader {
  constructor(private readonly blocksDailyService: BlocksDailyService, private readonly prisma: PrismaService) {}

  async loadDateMetrics(date: Date): Promise<void> {
    await this.prisma.$transaction(async (prisma) => {
    })
  }
}