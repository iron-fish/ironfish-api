/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { MetricsGranularity } from '../../common/enums/metrics-granularity';
import { SerializedEventMetrics } from '../../events/interfaces/serialized-event-metrics';

export interface SerializedUserMetrics {
  user_id: number;
  granularity: MetricsGranularity;
  points: number;
  metrics: {
    blocks_mined: SerializedEventMetrics;
    bugs_caught: SerializedEventMetrics;
    community_contributions: SerializedEventMetrics;
    pull_requests_merged: SerializedEventMetrics;
    social_media_contributions: SerializedEventMetrics;
  };
  pools?: {
    main: SerializedEventMetrics;
    code: SerializedEventMetrics;
  };
}
