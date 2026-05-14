FROM node:lts-alpine

WORKDIR /app
COPY package*.json ./

RUN npm install --legacy-peer-deps
COPY . .

# Esponiamo la stessa porta esterna di quella del localhost interno
EXPOSE 4173

CMD ["sh", "-c", "npm run build && npm run preview -- --host 0.0.0.0"]