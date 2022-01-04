/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { tracer } from 'dd-trace';

export function initializeTracer(service: string): void {
  tracer.init({
    env: process.env.NODE_ENV,
    logInjection: true,
    service,
    version: process.env.HEROKU_SLUG_COMMIT,
  });
}
