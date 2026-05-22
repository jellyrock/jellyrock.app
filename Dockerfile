FROM node:lts@sha256:8530f76a96d88820d288761f022e318970dda93d01536919fbc16076b7983e63 AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm install

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:stable-alpine@sha256:ca19b13430b7e5f22033669fca004b2e4b02e53851207ee6f076f00f8cd3fb94 AS deploy
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080
