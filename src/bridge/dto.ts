/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BridgeRequestStatus, BridgeRequestType } from '@prisma/client';

type Address = string;

type AddressFk = number;

export type BridgeDataDTO = {
  address: Address;
  asset: string;
  type: BridgeRequestType;
  transaction: string;
  status: BridgeRequestStatus;
};

export type BridgeRetrieveDTO = {
  [keyof: AddressFk]: BridgeDataDTO | null;
};

export type BridgeCreateDTO = { [keyof: Address]: AddressFk };

export type HeadHash = { hash: string };

export type OptionalHeadHash = { hash: string | null };
