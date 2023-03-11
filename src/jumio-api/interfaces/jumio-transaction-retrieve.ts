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

export type ImageChecksLabel =
  | 'DIGITAL_COPY'
  | 'WATERMARK'
  | 'MANIPULATED_DOCUMENT'
  | 'MANIPULATED_DOCUMENT_PHOTO1'
  | 'MANIPULATED_DOCUMENT_EXPIRY1'
  | 'MANIPULATED_DOCUMENT_NAME1'
  | 'MANIPULATED_DOCUMENT_ADDRESS1'
  | 'MANIPULATED_DOCUMENT_SECURITY_CHECKS1'
  | 'MANIPULATED_DOCUMENT_SIGNATURE1'
  | 'MANIPULATED_DOCUMENT_PERSONAL_NUMBER1'
  | 'MANIPULATED_DOCUMENT_PLACE_OF_BIRTH1'
  | 'MANIPULATED_DOCUMENT_GENDER1'
  | 'MANIPULATED_DOCUMENT_ISSUING_DATE1'
  | 'OTHER_REJECTION'
  | 'GHOST_IMAGE_DIFFERENT'
  | 'PUNCHED'
  | 'SAMPLE'
  | 'FAKE'
  | 'CHIP_MISSING'
  | 'DIGITAL_MANIPULATION'
  | 'MISMATCH_FRONT_BACK'
  | 'DIFFERENT_PERSON'
  | 'REPEATED_FACE'
  | 'OK'
  | 'PRECONDITION_NOT_FULFILLED'
  | 'TECHNICAL_ERROR';

export type WatchlistScreeningLabels =
  | 'NOT_ENOUGH_DATA'
  | 'VALIDATION_FAILED'
  | 'INVALID_MERCHANT_SETTINGS'
  | 'TECHNICAL_ERROR'
  | 'EXTRACTION_NOT_DONE'
  | 'NO_VALID_ID_CREDENTIAL'
  | 'PRECONDITION_NOT_FULFILLED'
  | 'OK'
  | 'ALERT';

export type ImageCheck = {
  id: string;
  credentials: {
    id: string;
    category: string;
  }[];
  decision: {
    type: string;
    details: {
      label: ImageChecksLabel;
    };
  };
  data: {
    faceSearchFindings: {
      status: string;
      findings?: string[];
    };
  };
};

export type WatchlistScreenCheck = {
  id: string;
  credentials: {
    id: string;
    category: string;
  }[];
  decision: {
    type: 'PASSED' | 'WARNING' | 'NOT_EXECUTED';
    details: {
      label: WatchlistScreeningLabels;
    };
  };
  data: {
    searchDate: string;
    searchResults: number;
    searchId: string;
    searchResultUrl: string;
    searchReference: string;
    searchStatus: 'DONE' | 'NOT_DONE' | 'ERROR' | 'SUCCESS';
  };
};

export interface JumioTransactionRetrieveResponse {
  account: {
    id: string;
  };
  createdAt: string;
  startedAt: string;
  completedAt: string;
  credentials: {
    id: string;
    category: string;
    parts: {
      classifier: string;
      href?: string;
    }[];
  }[];
  steps: {
    href: string;
  };
  workflow: {
    id: string;
    definitionKey: string;
    userReference: string;
    status: 'INITIATED' | 'PROCESSED' | 'SESSION_EXPIRED' | 'TOKEN_EXPIRED';
    customerInternalReference: string;
  };
  decision: {
    type: 'NOT_EXECUTED' | 'PASSED' | 'REJECTED' | 'WARNING';
    details: {
      label: string;
    };
    risk: {
      score: number;
    };
  };
  capabilities: {
    liveness: {
      id: string;
      validFaceMapForAuthentication: string;
      credentials: [
        {
          id: string;
          category: string;
        },
        {
          id: string;
          category: string;
        },
      ];
      decision: {
        type: 'NOT_EXECUTED' | 'PASSED' | 'REJECTED' | 'WARNING';
        details: {
          label: LivenessLabel;
        };
      };
      data: {
        type: string;
        predictedAge: number;
        ageConfidenceRange: string;
      };
    }[];
    similarity: {
      id: string;
      credentials: [
        {
          id: string;
          category: string;
        },
        {
          id: string;
          category: string;
        },
      ];
      decision: {
        type: string;
        details: {
          label: SimilarityLabel;
        };
      };
      data: {
        similarity: string;
      };
    }[];
    dataChecks: {
      id: string;
      credentials: [
        {
          id: string;
          category: 'ID';
        },
      ];
      decision: {
        type: 'NOT_EXECUTED' | 'PASSED' | 'REJECTED';
        details: {
          label: DataChecksLabel;
        };
      };
    }[];
    extraction: {
      id: string;
      decision: {
        type: 'NOT_EXECUTED' | 'PASSED';
        details: {
          label: ExtractionLabel;
        };
      };
      credentials: [
        {
          id: string;
          category: string;
        },
      ];
      data: {
        type: string;
        subType: string;
        issuingCountry: string; // http://en.wikipedia.org/wiki/ISO_3166-1_alpha-3
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        expiryDate: string;
        documentNumber: string;
        optionalMrzField1?: string;
        optionalMrzField2?: string;
        currentAge: string;
      };
    }[];
    usability: {
      id: string;
      credentials: [
        {
          id: string;
          category: string;
        },
      ];
      decision: {
        type: 'NOT_EXECUTED' | 'PASSED' | 'REJECTED' | 'WARNING';
        details: {
          label: UsabilityLabel;
        };
      };
    }[];
    imageChecks: ImageCheck[];
    watchlistScreening: WatchlistScreenCheck[];
  };
}

export type JumioTransactionStandaloneSanction = Omit<
  JumioTransactionRetrieveResponse,
  'capabilities'
> & { capabilities: { watchlistScreening: WatchlistScreenCheck[] } };
