FROM node:14-alpine

COPY . /opt/indexer

RUN cd /opt/indexer/apollo && \
  npm i && \
  npx prisma generate && \
  npm run build

WORKDIR /opt/indexer/apollo

EXPOSE 4002

# CMD [ "node", "index.js" ]

ENTRYPOINT /opt/indexer/apollo/scripts/entrypoint.sh
