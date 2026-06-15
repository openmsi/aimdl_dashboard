FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY ./ ./
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
USER root
RUN rm -rf /usr/share/nginx/html/*
COPY --from=frontend-build /app/dist/ /usr/share/nginx/html/
USER nginx
