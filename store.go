package projects

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

type Store struct {
	mu    sync.RWMutex
	path  string
	items map[string]Project
}

func NewStore(path string) (*Store, error) {
	s := &Store{path: path, items: map[string]Project{}}
	if err := s.load(); err != nil {
		return nil, err
	}
	return s, nil
}
func (s *Store) List() []Project {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Project, 0, len(s.items))
	for _, p := range s.items {
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].UpdatedAt.After(out[j].UpdatedAt) })
	return out
}
func (s *Store) Save(p Project) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if p.ID == "" {
		return errors.New("project id required")
	}
	now := time.Now().UTC()
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}
	p.UpdatedAt = now
	s.items[p.ID] = p
	return s.persist()
}
func (s *Store) load() error {
	b, err := os.ReadFile(s.path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	return json.Unmarshal(b, &s.items)
}
func (s *Store) persist() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(s.items, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, b, 0644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}
