FROM node:14-alpine

COPY output /opt/apollo
COPY package.json /opt/apollo
COPY scripts/entrypoint.sh /opt/apollo

RUN cd /opt/apollo && npm i

WORKDIR /opt/apollo

EXPOSE 4002

# CMD [ "node", "index.js" ]

ENTRYPOINT /opt/apollo/entrypoint.sh
