/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { GraphileWorkerHandlerResponse } from '../interfaces/graphile-worker-handler-response';

export type GraphileWorkerHandler = (
  payload: Record<string, unknown>,
) => Promise<GraphileWorkerHandlerResponse> | GraphileWorkerHandlerResponse;
