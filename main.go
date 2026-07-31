package main

import (
	"log"
	"lyricvisualiser/backend/internal/api"
	"lyricvisualiser/backend/internal/projects"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

func main() {
	addr := getenv("LYRIC_VIS_ADDR", "")
	if addr == "" {
		if port := os.Getenv("PORT"); port != "" {
			addr = ":" + port
		} else {
			addr = ":8090"
		}
	}
	data := getenv("LYRIC_VIS_DATA", "data")
	web := getenv("LYRIC_VIS_WEB", "../web")
	maxUploadMB := getenvInt64("LYRIC_VIS_MAX_UPLOAD_MB", 512)
	store, err := projects.NewStore(filepath.Join(data, "projects.json"))
	if err != nil {
		log.Fatal(err)
	}
	handler := api.Handler{
		Projects: store,
		WebDir:   web,
		Security: api.SecurityConfig{
			Username:       getenv("LYRIC_VIS_USERNAME", "story"),
			Password:       os.Getenv("LYRIC_VIS_PASSWORD"),
			MaxUploadBytes: maxUploadMB << 20,
			PublicBaseURL:  os.Getenv("LYRIC_VIS_PUBLIC_URL"),
		},
	}
	server := &http.Server{
		Addr:              addr,
		Handler:           handler.Routes(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       20 * time.Minute,
		WriteTimeout:      20 * time.Minute,
		IdleTimeout:       90 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	log.Printf("Story Lyrics Cloud 1.1.0 listening on %s", addr)
	if handler.Security.Password == "" {
		log.Printf("Warning: authentication is disabled")
	}
	log.Fatal(server.ListenAndServe())
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
func getenvInt64(k string, d int64) int64 {
	v, err := strconv.ParseInt(os.Getenv(k), 10, 64)
	if err != nil || v <= 0 {
		return d
	}
	return v
}
