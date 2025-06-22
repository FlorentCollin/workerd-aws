FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock .
RUN bun install
COPY hello.js my-config.capnp .
RUN bunx workerd compile my-config.capnp > worker 

FROM debian:bookworm AS final
WORKDIR /app
COPY --from=builder /app/worker .
RUN chmod +x worker
EXPOSE 80
ENTRYPOINT ["./worker"]

