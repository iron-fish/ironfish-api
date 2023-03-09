/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export interface JumioAccountCreateResponse {
  account: {
    id: string;
  };
  web: {
    href: string;
  };
  workflowExecution: {
    id: string;
    credentials: {
      id: string;
      api: {
        token: string;
        parts: {
          prepared_data: string; // parts upload url
        };
        workflowExecution: string;
      };
    }[];
  };
}
