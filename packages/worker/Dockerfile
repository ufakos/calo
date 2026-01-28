FROM node:20-alpine

WORKDIR /app

# Install security tools and dependencies
RUN apk add --no-cache \
    openssl \
    curl \
    bind-tools \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy prisma schema
COPY ./prisma ./prisma

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build
RUN npm run build

CMD ["npm", "run", "start"]
