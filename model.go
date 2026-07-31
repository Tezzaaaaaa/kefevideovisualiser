package projects

import "time"

type AspectRatio string

const (
	Landscape AspectRatio = "16:9"
	Vertical  AspectRatio = "9:16"
	Square    AspectRatio = "1:1"
)

type Project struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Artist      string      `json:"artist,omitempty"`
	SongTitle   string      `json:"song_title,omitempty"`
	AudioFile   string      `json:"audio_file,omitempty"`
	LyricsFile  string      `json:"lyrics_file,omitempty"`
	ArtworkFile string      `json:"artwork_file,omitempty"`
	TemplateID  string      `json:"template_id"`
	AspectRatio AspectRatio `json:"aspect_ratio"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type Template struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Features    []string `json:"features"`
}

func DefaultTemplates() []Template {
	return []Template{
		{ID: "stack", Name: "Stack", Description: "Current line centred with neighbouring lyrics drifting vertically.", Features: []string{"line stack", "active line", "vertical motion"}},
		{ID: "karaoke", Name: "Karaoke", Description: "Words progressively fill with the selected accent colour.", Features: []string{"word sync", "progress fill", "line focus"}},
		{ID: "type", Name: "Type", Description: "Lyrics appear character by character with a subtle cursor.", Features: []string{"typewriter", "character reveal", "cursor"}},
		{ID: "poster", Name: "Poster", Description: "Oversized phrase cards that pop and scale into place.", Features: []string{"large type", "scale transition", "auto fit"}},
		{ID: "words", Name: "Words", Description: "Individual words enter rhythmically and assemble into a phrase.", Features: []string{"word reveal", "stagger", "dynamic layout"}},
		{ID: "classic", Name: "Classic", Description: "Simple one- or two-line lyrics with soft fades.", Features: []string{"line sync", "fade", "minimal"}},
	}
}
