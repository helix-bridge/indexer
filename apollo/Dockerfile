FROM node:14-alpine

COPY . /opt/app

RUN cd /opt/app && \
  yarn install && \
  npx prisma generate

WORKDIR /opt/app

EXPOSE 4002

ENV VERSION_MODE prod

# CMD [ "node", "index.js" ]

ENTRYPOINT /opt/app/scripts/entrypoint.sh ${VERSION_MODE}
