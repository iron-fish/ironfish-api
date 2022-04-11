import { User } from ".prisma/client";
import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { GraphileWorkerPattern } from "../graphile-worker/enums/graphile-worker-pattern";
import { GraphileWorkerHandlerResponse } from "../graphile-worker/interfaces/graphile-worker-handler-response";
import { UsersService } from "../users/users.service";

@Controller()
export class UserPointsJobsController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @MessagePattern(GraphileWorkerPattern.REFRESH_USERS_POINTS)
  async upsertBlockMinedEvent(): Promise<GraphileWorkerHandlerResponse> {
    return { requeue: false }
  }

  private async *usersGenerator(): AsyncGenerator<User> {
    let after: number | undefined;
    do {
      const { data, hasNext } = await this.usersService.list({ after })
      if (data.length && hasNext) {
        after = data[data.length - 1].id
      }

      for (const user of data) {
        yield user
      }
    } while (after)
  }

  @MessagePattern(GraphileWorkerPattern.DELETE_BLOCK_MINED_EVENT)
  async deleteBlockMinedEvent({
    block_id: blockId,
  }: DeleteBlockMinedEventOptions): Promise<GraphileWorkerHandlerResponse> {
    const block = await this.blocksService.find(blockId);
    if (!block) {
      this.loggerService.error(`No block found for '${blockId}'`, '');
      return { requeue: false };
    }

    await this.eventsService.deleteBlockMined(block);
    return { requeue: false };
  }
}
