/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Request } from 'express';

export function fetchIpAddressFromRequest(request: Request): string {
  const xForwardedFor = request.header('X-Forwarded-For');
  if (xForwardedFor) {
    const addresses = xForwardedFor.split(',');
    if (addresses.length) {
      return addresses[0].trim();
    }
  }

  // In Heroku, `X-Forwarded-For` will always be set. However, this will be used
  // as a fallback in local development.
  return request.ip;
}
