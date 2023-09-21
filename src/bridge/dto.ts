/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export type IdRetrievalDTO = { [key: number]: string | null };

export type AddressCreationDTO = { [key: string]: number };

export type HeadHash = { hash: string };

export type OptionalHeadHash = { hash: string | null };
