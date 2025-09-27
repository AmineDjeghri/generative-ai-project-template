FROM node:18-alpine
WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./
RUN npm install

# Copy the rest of the app (including source code)
COPY . .

# Build the React app (this is where .env is used)
RUN npm run build

RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
