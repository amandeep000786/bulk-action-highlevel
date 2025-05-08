FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Create uploads directory with proper permissions
RUN mkdir -p /usr/src/app/uploads && \
    chown -R node:node /usr/src/app && \
    chmod -R 755 /usr/src/app/uploads

# Copy rest of the code
COPY --chown=node:node . .

# Build TS (if needed in prod)
RUN npm run build

# Switch to non-root user
USER node

# Start app
CMD ["npm", "start"]

