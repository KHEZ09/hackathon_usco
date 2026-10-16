FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_ORIVIA_API_URL
ARG NEXT_PUBLIC_ORIVIA_DEMO_MODE=false
ENV NEXT_PUBLIC_ORIVIA_API_URL=$NEXT_PUBLIC_ORIVIA_API_URL
ENV NEXT_PUBLIC_ORIVIA_DEMO_MODE=$NEXT_PUBLIC_ORIVIA_DEMO_MODE

RUN npm run build -- --webpack

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -S orivia && adduser -S orivia -G orivia
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

USER orivia
EXPOSE 3000
CMD ["npm", "run", "start"]
