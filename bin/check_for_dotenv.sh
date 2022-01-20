#!/bin/bash

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(dirname $SCRIPT_DIR)

if [[ $NODE_ENV != "staging" && $NODE_ENV != "production" && ! -e "$ROOT_DIR/.env" ]]; then
  echo "'.env' does not exist. Creating one using '.env.template'"
  cp -- "$ROOT_DIR/.env.template" "$ROOT_DIR/.env"
fi
