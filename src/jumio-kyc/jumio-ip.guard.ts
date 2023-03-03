/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
@Injectable()
export class JumioIpGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: { connection: { remoteAddress: string } } = context
      .switchToHttp()
      .getRequest();
    const allowedIp: Array<string> = [
      '34.202.241.227',
      '34.226.103.119',
      '34.226.254.127',
      '52.52.51.178',
      '52.53.95.123',
      '54.67.101.173',
    ];
    if (process.env.NODE_ENV === 'production') {
      const ip = request.connection.remoteAddress;
      Logger.log(ip, 'ACCESSED IP ADDRESS');
      if (allowedIp.includes(ip)) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }
}
