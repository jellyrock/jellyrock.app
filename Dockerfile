FROM node:lts@sha256:934240a162082fd8b8a2f90cd5114446443f1eba1c5378f6687167ca405e6584 AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm install

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:stable-alpine@sha256:985220252f3863977e468f611ef118ebd01421289dd86ee1ae99cb068c3bce2b AS deploy
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080
