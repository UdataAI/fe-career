# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_HR_EMAIL
ARG VITE_USE_MAILTO_FOR_APPLY
ENV VITE_HR_EMAIL=$VITE_HR_EMAIL
ENV VITE_USE_MAILTO_FOR_APPLY=$VITE_USE_MAILTO_FOR_APPLY
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
