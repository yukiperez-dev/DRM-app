FROM node:22-bookworm-slim AS build

WORKDIR /app

ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY lib/api-client-react ./lib/api-client-react
COPY artifacts/home-app ./artifacts/home-app

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/home-app run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

COPY --from=build /app/artifacts/home-app/dist ./artifacts/home-app/dist
COPY --from=build /app/artifacts/home-app/server ./artifacts/home-app/server

EXPOSE 3000

CMD ["node", "artifacts/home-app/server/serve.js"]
