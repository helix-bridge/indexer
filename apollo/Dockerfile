FROM node:14-alpine

COPY . /opt/indexer

RUN cd /opt/indexer && \
  yarn install && \
  npx prisma generate

WORKDIR /opt/indexer

EXPOSE 4002

ENV VERSION_MODE prod

# CMD [ "node", "index.js" ]

ENTRYPOINT /opt/indexer/scripts/entrypoint.sh ${VERSION_MODE}
