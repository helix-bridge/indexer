FROM node:14-alpine

COPY . /opt/apollo

RUN cd /opt/apollo && \
  npm i && \
  npm run build

WORKDIR /opt/apollo

EXPOSE 4002

# CMD [ "node", "index.js" ]

ENTRYPOINT /opt/apollo/entrypoint.sh
