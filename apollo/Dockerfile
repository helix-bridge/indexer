FROM node:14-alpine

COPY . /opt/indexer

RUN cd /opt/indexer/apollo && \
  yarn install && \
  npx prisma generate

WORKDIR /opt/indexer/apollo

EXPOSE 4002

ENV VERSION_MODE prod

# CMD [ "node", "index.js" ]

ENTRYPOINT /opt/indexer/apollo/scripts/entrypoint.sh ${VERSION_MODE}
