FROM node:21-alpine

COPY . /app

ENV VERSION_MODE testnet

RUN cd /app && \
    cp ponder.config.ts.$VERSION_MODE ponder.config.ts && \
    yarn install && \
    yarn codegen

WORKDIR /app

CMD ["yarn", "start"]
