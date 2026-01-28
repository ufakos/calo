# Development image - will use npm run dev
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Source code will be mounted as volume
# The CMD will be overridden by docker-compose

EXPOSE 3000

CMD ["npm", "run", "dev"]
