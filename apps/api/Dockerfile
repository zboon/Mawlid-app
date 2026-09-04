# Lokaler Betrieb (ADR-006). Kein Übersetzungsschritt: der Server läuft mit
# `tsx`, das TypeScript beim Laden übersetzt.
#
# Warum nicht `tsc` nach dist/? Weil `packages/shared` als Quelle eingebunden
# ist und ein Pfad-Alias im erzeugten JavaScript nicht mehr aufgelöst würde.
# Man müsste bündeln, um ein Problem zu lösen, das es hier nicht gibt: dieser
# Server bedient einen Haushalt, und eine Sekunde Startzeit fällt nicht auf.
FROM node:22-alpine

WORKDIR /app

COPY apps/api/package*.json apps/api/
COPY package*.json ./
RUN npm install --prefix apps/api --omit=dev=false && npm install

COPY packages ./packages
COPY apps/api ./apps/api

RUN npm --prefix apps/api run db:generate

ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 3000

CMD ["npm", "--prefix", "apps/api", "run", "start"]
