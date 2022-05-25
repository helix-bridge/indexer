FROM node:14-alpine

COPY output /opt/apollo
COPY scripts/entrypoint.sh /opt/apollo

WORKDIR /opt/apollo

EXPOSE 4002

# CMD [ "node", "index.js" ]

ENTRYPOINT /opt/apollo/entrypoint.sh
