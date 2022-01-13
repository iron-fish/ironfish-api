/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { EventWithMetadata } from '../interfaces/event-with-metadata';
import { SerializedEvent } from '../interfaces/serialized-event';

export function serializedEventFromRecordWithMetadata(
  event: EventWithMetadata,
): SerializedEvent {
  const metadata = event.metadata;
  if (event.url) {
    metadata.url = event.url;
  }
  return {
    object: 'event',
    id: event.id,
    type: event.type,
    occurred_at: event.occurred_at.toISOString(),
    points: event.points,
    user_id: event.user_id,
    metadata: metadata,
  };
}
