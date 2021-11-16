import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { getNextDate } from "../common/utils/date";
import { GraphileWorkerPattern } from "../graphile-worker/enums/graphile-worker-pattern";
import { GraphileWorkerService } from "../graphile-worker/graphile-worker.service";
import { GraphileWorkerHandlerResponse } from "../graphile-worker/interfaces/graphile-worker-handler-response";
import { SyncBlocksDailyOptions } from "./interfaces/sync-blocks-daily-options";

@Controller()
export class BlocksDailyJobsController {
  constructor(private readonly graphileWorkerService: GraphileWorkerService) {}

  @MessagePattern(GraphileWorkerPattern.SYNC_BLOCKS_DAILY)
  async sync({ date }: SyncBlocksDailyOptions): Promise<GraphileWorkerHandlerResponse> {
    const nextDate = getNextDate(date)
    await this.graphileWorkerService.addJob<SyncBlocksDailyOptions>(GraphileWorkerPattern.SYNC_BLOCKS_DAILY, { date: nextDate }, nextDate)
    return { requeue: false }
  }
}