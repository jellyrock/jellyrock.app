FROM node:lts@sha256:934240a162082fd8b8a2f90cd5114446443f1eba1c5378f6687167ca405e6584 AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm install

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:stable-alpine@sha256:0985e772fb9f729e6fa0980da05fca5d9c468e870eed43071545afa9d2e27d94 AS deploy
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080
