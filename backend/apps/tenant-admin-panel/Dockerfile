ARG NODE_IMAGE=node:22.22-alpine3.23
FROM ${NODE_IMAGE} AS build
# Optional sandbox MITM CA (glob keeps COPY valid when absent; no-op in CI).
COPY package.json build-ca.cr[t] /tmp/build-ca/
RUN if [ -f /tmp/build-ca/build-ca.crt ]; then \
      cat /tmp/build-ca/build-ca.crt >> /etc/ssl/certs/ca-certificates.crt; \
    fi && rm -rf /tmp/build-ca
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --maxsockets 8 \
 || (sleep 5 && npm ci --no-audit --no-fund --maxsockets 4)
COPY . .
ARG VITE_API_URL=http://localhost:3005
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
