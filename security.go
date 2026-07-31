package api

import (
	"crypto/subtle"
	"net/http"
	"strconv"
	"strings"
)

type SecurityConfig struct {
	Username       string
	Password       string
	MaxUploadBytes int64
	PublicBaseURL  string
}

func (h Handler) secure(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setSecurityHeaders(w, h.Security.PublicBaseURL)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if h.Security.Password != "" && !validBasicAuth(r, h.Security.Username, h.Security.Password) {
			w.Header().Set("WWW-Authenticate", `Basic realm="Story Lyrics", charset="UTF-8"`)
			writeError(w, http.StatusUnauthorized, "sign in required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func validBasicAuth(r *http.Request, expectedUser, expectedPassword string) bool {
	user, password, ok := r.BasicAuth()
	if !ok {
		return false
	}
	userOK := subtle.ConstantTimeCompare([]byte(user), []byte(expectedUser)) == 1
	passwordOK := subtle.ConstantTimeCompare([]byte(password), []byte(expectedPassword)) == 1
	return userOK && passwordOK
}

func setSecurityHeaders(w http.ResponseWriter, publicBaseURL string) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("Referrer-Policy", "no-referrer")
	w.Header().Set("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=()")
	w.Header().Set("Cross-Origin-Resource-Policy", "same-origin")
	w.Header().Set("Content-Security-Policy", "default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
	if strings.HasPrefix(publicBaseURL, "https://") {
		w.Header().Set("Strict-Transport-Security", "max-age="+strconv.Itoa(31536000)+"; includeSubDomains")
	}
}
