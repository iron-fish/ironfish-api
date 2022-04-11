import { EventType } from ".prisma/client";

export interface UpsertUserPointsOptions {
  userId: number
  points: Map<EventType, { points: number; latest_occurred_at: Date }>
}