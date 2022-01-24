/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Version } from '@prisma/client';
import { SerializedVersion } from '../interfaces/serialized-version';

export function serializedVersionFromRecord(
  versionRecord: Version,
): SerializedVersion {
  const { created_at, version: versionString } = versionRecord;
  return {
    object: 'version',
    version: versionString,
    created_at: created_at.toISOString(),
  };
}
