FROM node:24-alpine

RUN npm install -g pnpm@11.5.2

WORKDIR /app

COPY pnpm-lock.yaml package.json ./
RUN pnpm install --prod

COPY . .

EXPOSE 3000

CMD ["pnpm", "start"]
