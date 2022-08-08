# syntax=docker/dockerfile:1

FROM node:18.0.0-alpine3.15
ENV NODE_ENV=production
ENV PORT=6001

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY ["app.js", "./"]

COPY ["pmlconf/", "./pmlconf/"]

EXPOSE 6001

CMD [ "node", "app.js" ]