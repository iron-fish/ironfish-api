/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export interface BridgeStatus {
  active: boolean;
  maintenance: boolean;
  incoming_addresses: string[];
  outgoing_addresses: string[];
  metadata?: Record<string, unknown>;
}

export type BridgesStatus = Record<string, BridgeStatus>;
