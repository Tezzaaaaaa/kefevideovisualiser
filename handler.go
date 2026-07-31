package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"lyricvisualiser/backend/internal/lyrics"
	"lyricvisualiser/backend/internal/projects"
)

type Handler struct {
	Projects *projects.Store
	WebDir   string
	Security SecurityConfig
}

func (h Handler) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]any{"status": "ok", "version": "1.1.0", "product": "Story Lyrics", "ffmpeg": ffmpegAvailable()})
	})
	mux.HandleFunc("GET /api/v1/templates", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, projects.DefaultTemplates()) })
	mux.HandleFunc("GET /api/v1/projects", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, h.Projects.List()) })
	mux.HandleFunc("POST /api/v1/projects", h.createProject)
	mux.HandleFunc("POST /api/v1/lyrics/parse", h.parseLyrics)
	mux.HandleFunc("POST /api/v1/export/transcode", h.transcodeExport)
	mux.Handle("/", http.FileServer(http.Dir(h.WebDir)))
	return h.secure(mux)
}
func (h Handler) createProject(w http.ResponseWriter, r *http.Request) {
	var p projects.Project
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&p); err != nil {
		writeError(w, 400, err.Error())
		return
	}
	if strings.TrimSpace(p.Name) == "" {
		writeError(w, 400, "project name required")
		return
	}
	if p.TemplateID == "" {
		p.TemplateID = "minimal"
	}
	if p.AspectRatio == "" {
		p.AspectRatio = projects.Landscape
	}
	if err := h.Projects.Save(p); err != nil {
		writeError(w, 400, err.Error())
		return
	}
	writeJSON(w, 201, p)
}
func (h Handler) parseLyrics(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		writeError(w, 400, "invalid multipart form")
		return
	}
	f, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, 400, "lyric file required")
		return
	}
	defer f.Close()
	b, err := io.ReadAll(io.LimitReader(f, 8<<20))
	if err != nil {
		writeError(w, 400, err.Error())
		return
	}
	doc, err := lyrics.Parse(filepath.Base(header.Filename), string(b))
	if err != nil {
		writeError(w, 400, err.Error())
		return
	}
	writeJSON(w, 200, doc)
}

func ffmpegAvailable() bool {
	_, err := exec.LookPath("ffmpeg")
	return err == nil
}

func (h Handler) transcodeExport(w http.ResponseWriter, r *http.Request) {
	if !ffmpegAvailable() {
		writeError(w, http.StatusServiceUnavailable, "FFmpeg is unavailable on the rendering server")
		return
	}
	maxUpload := h.Security.MaxUploadBytes
	if maxUpload <= 0 {
		maxUpload = 512 << 20
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxUpload)
	if err := r.ParseMultipartForm(maxUpload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid export upload")
		return
	}
	f, header, err := r.FormFile("video")
	if err != nil {
		writeError(w, http.StatusBadRequest, "recorded video is required")
		return
	}
	defer f.Close()
	tmpDir, err := os.MkdirTemp("", "story-lyrics-export-*")
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer os.RemoveAll(tmpDir)
	ext := strings.ToLower(filepath.Ext(filepath.Base(header.Filename)))
	if ext == "" || len(ext) > 8 {
		ext = ".webm"
	}
	input := filepath.Join(tmpDir, "input"+ext)
	output := filepath.Join(tmpDir, "story-lyrics.mp4")
	out, err := os.Create(input)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if _, err = io.Copy(out, io.LimitReader(f, maxUpload)); err != nil {
		out.Close()
		writeError(w, 400, err.Error())
		return
	}
	if err = out.Close(); err != nil {
		writeError(w, 500, err.Error())
		return
	}
	cmd := exec.Command("ffmpeg", "-y", "-fflags", "+genpts", "-i", input,
		"-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
		"-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-max_muxing_queue_size", "2048", output)
	if raw, runErr := cmd.CombinedOutput(); runErr != nil {
		writeError(w, 500, fmt.Sprintf("FFmpeg export failed: %s", strings.TrimSpace(string(raw))))
		return
	}
	data, err := os.ReadFile(output)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	name := strings.TrimSpace(r.FormValue("name"))
	if name == "" {
		name = "Story-Lyrics"
	}
	name = strings.Map(func(r rune) rune {
		if r == ' ' || r == '-' || r == '_' || r >= '0' && r <= '9' || r >= 'A' && r <= 'Z' || r >= 'a' && r <= 'z' {
			return r
		}
		return -1
	}, name)
	if name == "" {
		name = "Story-Lyrics"
	}
	w.Header().Set("Content-Type", "video/mp4")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s-%s.mp4\"", name, time.Now().Format("20060102-150405")))
	w.Header().Set("Content-Length", fmt.Sprint(len(data)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
