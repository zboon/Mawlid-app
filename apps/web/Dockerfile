# Nur für die Entwicklung. Ein Produktions-Image würde `npm run build` machen
# und die Dateien aus dist/ statisch ausliefern — dazu gibt es erst etwas zu
# sagen, wenn entschieden ist, wo die App hinsoll (ADR-006: vorerst lokal).
FROM node:22-alpine

WORKDIR /app/apps/web

# Erst die Manifeste, dann installieren: so bleibt die Installationsschicht im
# Cache, solange sich die Abhängigkeiten nicht ändern.
COPY apps/web/package*.json ./
RUN npm ci || npm install

COPY apps/web ./

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
