/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

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

export function handleIfModifiedSince(
  lastModified: Date,
  request: Request,
  response: Response,
): void {
  response.header('Last-Modified', lastModified.toUTCString());
  const ifModifiedSinceHeader = request.header('If-Modified-Since');
  if (ifModifiedSinceHeader) {
    const ifModifiedSince = new Date(ifModifiedSinceHeader);
    if (ifModifiedSince >= lastModified) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_MODIFIED,
        },
        HttpStatus.NOT_MODIFIED,
      );
    }
  }
}
