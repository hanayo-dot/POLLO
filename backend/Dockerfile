# ==============================================================================
# POLLO Backend Dockerfile - Multi-stage Go Build
# ==============================================================================

# Stage 1: Build binary
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install git and build essentials
RUN apk add --no-cache git ca-certificates tzdata

# Cache Go modules
COPY go.mod ./
RUN go mod download || true

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /app/bin/server main.go

# Stage 2: Minimal runtime image
FROM alpine:3.19 AS runner

WORKDIR /app

# Install CA certificates for secure NASA Earthdata / GIBS HTTPS connections,
# create the non-root user, and prepare the cache directory
RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S pollo && \
    adduser -S pollo -G pollo && \
    mkdir -p /app/data/cache && \
    chown -R pollo:pollo /app

# Copy compiled binary from builder
COPY --from=builder /app/bin/server /app/server

USER pollo

EXPOSE 8080

ENV PORT=8080 \
    ENV=production \
    API_PREFIX=/api/v1 \
    ENABLE_LOCAL_BENCHMARK=true

ENTRYPOINT ["/app/server"]
