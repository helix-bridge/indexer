#!/bin/sh
#

set -xe

BIN_PATH=$(cd "$(dirname "$0")"; pwd -P)

ENV_MODE=$1
ENV_MODE=${ENV_MODE:-prod}

npx prisma migrate dev --name init

npm run build:${ENV_MODE}
# node ${BIN_PATH}/index.js
npm run start:${ENV_MODE}

