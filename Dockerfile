FROM node:6

COPY / /usr/src/

WORKDIR /usr/src

RUN npm install --no-progress --silent
