/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  DataChecksLabel,
  ExtractionLabel,
  ImageChecksLabel,
  JumioTransactionRetrieveResponse,
  LivenessLabel,
  SimilarityLabel,
  UsabilityLabel,
  WatchlistScreeningLabels,
} from '../jumio-api/interfaces/jumio-transaction-retrieve';

// ADD APPROVED LABEL SETS HERE AND THEY WILL BE TREATED AS SUCCESS
// IF A TYPE LABEL IS NOT INCLUDED, IT IS ASSUMED THE VALUES MUST BE 'OK'
export const BENIGN_FAILURES: ApprovedLabelSet[] = [
  {
    maxRiskScore: 50,
    usabilityLabels: ['NOT_UPLOADED', 'OK'],
    livenessLabels: ['BAD_QUALITY', 'OK'],
  },
];

export type ApprovedLabelSet = {
  maxRiskScore: number;
  similarityLabels?: SimilarityLabel[];
  dataChecksLabels?: DataChecksLabel[];
  extractionLabels?: ExtractionLabel[];
  usabilityLabels?: UsabilityLabel[];
  imageChecksLabels?: ImageChecksLabel[];
  watchlistScreeningLabels?: WatchlistScreeningLabels[];
  livenessLabels?: LivenessLabel[];
};

export function matchApprovedLabels(
  status: JumioTransactionRetrieveResponse,
): string | null {
  const approvals = BENIGN_FAILURES.map((approvedLabelSet) =>
    matchApproveLabelSet(status, approvedLabelSet),
  ).filter((a) => a);

  if (approvals.length > 0) {
    return JSON.stringify(approvals[0]);
  } else {
    return null;
  }
}

function matchApproveLabelSet(
  status: JumioTransactionRetrieveResponse,
  approvedLabelSet: ApprovedLabelSet,
): ApprovedLabelSet | null {
  if (status.decision.risk.score > approvedLabelSet.maxRiskScore) {
    return null;
  }
  const dataChecksLabels = approvedLabelSet.dataChecksLabels ?? ['OK'];
  const extractionLabels = approvedLabelSet.extractionLabels ?? ['OK'];
  const imageChecksLabels = approvedLabelSet.imageChecksLabels ?? [
    'OK',
    'REPEATED_FACE',
  ];
  const livenessLabels = approvedLabelSet.livenessLabels ?? ['OK'];
  const similarityLabels = approvedLabelSet.similarityLabels ?? ['MATCH'];
  const usabilityLabels = approvedLabelSet.usabilityLabels ?? ['OK'];
  const watchlistScreeningLabels =
    approvedLabelSet.watchlistScreeningLabels ?? ['OK'];
  if (
    !status.capabilities.dataChecks?.every((c) =>
      dataChecksLabels.includes(c.decision.details.label),
    ) ||
    !status.capabilities.extraction?.every((c) =>
      extractionLabels.includes(c.decision.details.label),
    ) ||
    !status.capabilities.imageChecks?.every((c) =>
      imageChecksLabels.includes(c.decision.details.label),
    ) ||
    !status.capabilities.liveness?.every((c) =>
      livenessLabels.includes(c.decision.details.label),
    ) ||
    !status.capabilities.similarity?.every((c) =>
      similarityLabels.includes(c.decision.details.label),
    ) ||
    !status.capabilities.usability?.every((c) =>
      usabilityLabels.includes(c.decision.details.label),
    ) ||
    !status.capabilities.watchlistScreening?.every((c) =>
      watchlistScreeningLabels.includes(c.decision.details.label),
    )
  ) {
    return null;
  }
  return approvedLabelSet;
}
