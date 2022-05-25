#!/bin/sh
#

set -xe

BIN_PATH=$(cd "$(dirname "$0")"; pwd -P)

npx prisma migrate dev --name init

node ${BIN_PATH}/index.js
