/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ExtractionCheck } from '../../jumio-api/interfaces/jumio-transaction-retrieve';

type ExtractionFixtureProps = {
  firstName?: string;
  lastName?: string;
  idCountryCode?: string;
  age?: number;
};

export const EXTRACTION_CHECK_FIXTURE = ({
  firstName = 'Jason',
  lastName = 'Spafford',
  idCountryCode = 'CHL',
  age = 70,
}: ExtractionFixtureProps = {}): ExtractionCheck => {
  return {
    id: '40cb204c-f7ff-43e7-864b-064dcc8aba85',
    credentials: [
      {
        id: 'fakecredentialsid',
        category: 'ID',
      },
    ],
    decision: {
      type: 'PASSED',
      details: {
        label: 'OK',
      },
    },
    data: {
      type: 'ID_CARD',
      subType: 'NATIONAL_ID',
      issuingCountry: idCountryCode,
      firstName: firstName,
      lastName: lastName,
      dateOfBirth: '1970-01-01',
      expiryDate: '2050-01-01',
      documentNumber: '1111111',
      optionalMrzField1: 'Z11',
      optionalMrzField2: '11111111',
      currentAge: String(age),
    },
  };
};
