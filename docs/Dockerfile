FROM peaceiris/mdbook:latest AS builder
WORKDIR /docs
COPY . .
RUN mdbook build

FROM caddy:latest
COPY --from=builder /docs/book /usr/share/caddy
EXPOSE 80
