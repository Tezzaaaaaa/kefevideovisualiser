package api

import (
	"lyricvisualiser/backend/internal/projects"
	"net/http/httptest"
	"path/filepath"
	"testing"
)

func TestHealth(t *testing.T) {
	s, err := projects.NewStore(filepath.Join(t.TempDir(), "projects.json"))
	if err != nil {
		t.Fatal(err)
	}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/health", nil)
	Handler{Projects: s, WebDir: "."}.Routes().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("got %d", rr.Code)
	}
}
