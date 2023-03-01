/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export interface JumioTransactionRetrieveResponse {
  account: {
    id: string;
  };
  web: {
    href: string;
  };
  workflow: {
    id: string;
    status: 'INITIATED' | 'PROCESSED' | 'SESSION_EXPIRED' | 'TOKEN_EXPIRED';
  };
  capabilities: {
    extraction: [
      {
        decision: {
          type: string;
          details: {
            label: string;
          };
        };
        data: {
          type: string;
          subType: string;
          issuingCountry: string;
        };
      },
    ];
    usability: {
      decision: {
        type: 'NOT_EXECUTED' | 'PASSED' | 'REJECTED' | 'WARNING';
        details: {
          label:
            | 'TECHNICAL_ERROR'
            | 'NOT_UPLOADED'
            | 'OK'
            | 'BAD_QUALITY'
            | 'BLURRED1'
            | 'BAD_QUALITY_IMAGE1'
            | 'PART_OF_DOCUMENT_MISSING1'
            | 'PART_OF_DOCUMENT_HIDDEN1'
            | 'DAMAGED_DOCUMENT1'
            | 'GLARE1'
            | 'MISSING_MANDATORY_DATAPOINTS1'
            | 'BLACK_WHITE'
            | 'MISSING_PAGE'
            | 'MISSING_SIGNATURE'
            | 'NOT_A_DOCUMENT'
            | 'PHOTOCOPY'
            | 'LIVENESS_UNDETERMINED'
            | 'UNSUPPORTED_COUNTRY'
            | 'UNSUPPORTED_DOCUMENT_TYPE';
        };
      };
    };
  };
}
