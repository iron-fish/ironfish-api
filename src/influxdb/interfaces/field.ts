/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
interface BooleanField {
  name: string;
  type: 'boolean';
  value: boolean;
}

interface FloatField {
  name: string;
  type: 'float';
  value: number;
}

interface IntegerField {
  name: string;
  type: 'integer';
  value: number;
}

interface StringField {
  name: string;
  type: 'string';
  value: string;
}

export type Field = BooleanField | FloatField | IntegerField | StringField;
