FROM node:22

RUN npm config set registry https://registry.npmmirror.com \
  && npm install -g pnpm@8.15.6


WORKDIR /app

COPY pnpm-lock.yaml ./
COPY package.json ./

RUN pnpm install --frozen-lockfile

# ARG NEXT_PUBLIC_API_URL
# ARG NEXT_PUBLIC_BASE_URL
# ARG NEXT_PUBLIC_APP_NAME

# ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
# ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

COPY . .

# Build Prisma dan aplikasi Nextjs
RUN pnpm run build

# Jalankan aplikasi
CMD ["pnpm", "run", "start"]