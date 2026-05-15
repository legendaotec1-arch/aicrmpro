FROM node:18-alpine

WORKDIR /app

RUN npm install -g vite

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]