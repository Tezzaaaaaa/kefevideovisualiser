FROM golang:1.24-bookworm AS build
WORKDIR /src/backend
COPY backend/go.mod ./
COPY backend/ ./
RUN CGO_ENABLED=0 go build -o /out/story-lyrics ./cmd/server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out/story-lyrics /app/story-lyrics
COPY web /app/web
RUN useradd -r -u 10001 story && mkdir -p /app/data && chown -R story:story /app/data
USER story
ENV LYRIC_VIS_ADDR=:8090 LYRIC_VIS_WEB=/app/web LYRIC_VIS_DATA=/app/data LYRIC_VIS_MAX_UPLOAD_MB=512
EXPOSE 8090
CMD ["/app/story-lyrics"]
