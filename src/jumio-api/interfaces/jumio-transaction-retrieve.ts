/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export type LivenessLabel =
  | 'LIVENESS_UNDETERMINED'
  | 'ID_USED_AS_SELFIE'
  | 'MULTIPLE_PEOPLE'
  | 'DIGITAL_COPY'
  | 'PHOTOCOPY'
  | 'MANIPULATED'
  | 'NO_FACE_PRESENT'
  | 'FACE_NOT_FULLY_VISIBLE'
  | 'BLACK_WHITE'
  | 'OK'
  | 'AGE_DIFFERENCE'
  | 'BAD_QUALITY'
  | 'PRECONDITION_NOT_FULFILLED'
  | 'TECHNICAL_ERROR';

export type DataChecksLabel =
  | 'PRECONDITION_NOT_FULFILLED'
  | 'TECHNICAL_ERROR'
  | 'OK'
  | 'NFC_CERTIFICATE'
  | 'MISMATCHING_DATAPOINTS'
  | 'MRZ_CHECKSUM'
  | 'MISMATCHING_DATA_REPEATED_FACE'
  | 'MISMATCH_HRZ_MRZ_DATA';

export type SimilarityLabel =
  | 'NO_MATCH'
  | 'MATCH'
  | 'NOT_POSSIBLE'
  | 'PRECONDITION_NOT_FULFILLED'
  | 'TECHNICAL_ERROR';
export type ExtractionLabel =
  | 'PRECONDITION_NOT_FULFILLED'
  | 'TECHNICAL_ERROR'
  | 'OK';
export type UsabilityLabel =
  | 'TECHNICAL_ERROR'
  | 'NOT_UPLOADED'
  | 'OK'
  | 'BAD_QUALITY'
  | 'BLURRED'
  | 'BAD_QUALITY_IMAGE'
  | 'PART_OF_DOCUMENT_MISSING'
  | 'PART_OF_DOCUMENT_HIDDEN'
  | 'DAMAGED_DOCUMENT'
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
  decision: {
    type: 'NOT_EXECUTED' | 'PASSED' | 'REJECTED' | 'WARNING';
    risk: {
      score: number;
    };
  };
  capabilities: {
    liveness: [
      {
        decision: {
          type: 'NOT_EXECUTED' | 'PASSED' | 'REJECTED' | 'WARNING';
          details: {
            label: LivenessLabel;
          };
        };
      },
    ];
    similarity: [
      {
        decision: {
          type: 'NOT_EXECUTED' | 'PASSED' | 'REJECTED' | 'WARNING';
          details: {
            label: SimilarityLabel;
          };
        };
      },
    ];
    dataChecks: [
      {
        decision: {
          type: 'NOT_EXECUTED' | 'PASSED' | 'REJECTED';
          details: {
            label: DataChecksLabel;
          };
        };
      },
    ];
    extraction: [
      {
        decision: {
          type: 'NOT_EXECUTED' | 'PASSED';
          details: {
            label: ExtractionLabel;
          };
        };
        data: {
          type: string;
          subType: string;
          issuingCountry: string;
        };
      },
    ];
    usability: [
      {
        decision: {
          type: 'NOT_EXECUTED' | 'PASSED' | 'REJECTED' | 'WARNING';
          details: {
            label: UsabilityLabel;
          };
        };
      },
    ];
  };
}
