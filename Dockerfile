FROM node:14-slim

EXPOSE 3000

RUN mkdir -p /app
WORKDIR /app

COPY package.json .
COPY yarn.lock .
COPY app.js .
COPY pipeline.js .
COPY .env.prod .env

RUN yarn install --production

CMD yarn start
