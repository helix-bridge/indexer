FROM node:21-alpine

COPY . /app

RUN cd /app && \
  yarn install && \
  npx prisma generate

WORKDIR /app

EXPOSE 4002

ENV VERSION_MODE prod

# CMD [ "node", "index.js" ]

ENTRYPOINT /app/scripts/entrypoint.sh ${VERSION_MODE}
