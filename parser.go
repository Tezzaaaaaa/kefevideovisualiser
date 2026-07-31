package lyrics

import (
	"bufio"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Word struct {
	Text       string `json:"text"`
	StartMS    int64  `json:"start_ms"`
	DurationMS int64  `json:"duration_ms,omitempty"`
}

type Line struct {
	Text       string `json:"text"`
	StartMS    int64  `json:"start_ms"`
	DurationMS int64  `json:"duration_ms,omitempty"`
	Words      []Word `json:"words,omitempty"`
}

type Document struct {
	Format string `json:"format"`
	Lines  []Line `json:"lines"`
}

var (
	lineTimestampPattern = regexp.MustCompile(`\[(\d{1,3}):(\d{2})(?:[\.:](\d{1,3}))?\]`)
	wordTimestampPattern = regexp.MustCompile(`<(?:(\d{1,3}):)?(\d{2})(?:[\.:](\d{1,3}))?>`)
	srtRangePattern      = regexp.MustCompile(`(?m)^(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})`)
)

func Parse(filename, content string) (Document, error) {
	ext := strings.ToLower(filename)
	switch {
	case strings.HasSuffix(ext, ".lrc"):
		return ParseLRC(content)
	case strings.HasSuffix(ext, ".srt"):
		return ParseSRT(content)
	case strings.HasSuffix(ext, ".txt") || strings.HasSuffix(ext, ".text"):
		return ParseText(content), nil
	default:
		return Document{}, fmt.Errorf("unsupported lyric file: %s", filename)
	}
}

func ParseText(content string) Document {
	scanner := bufio.NewScanner(strings.NewReader(content))
	lines := make([]Line, 0)
	for scanner.Scan() {
		text := strings.TrimSpace(scanner.Text())
		if text != "" {
			lines = append(lines, Line{Text: text})
		}
	}
	return Document{Format: "txt", Lines: lines}
}

func ParseLRC(content string) (Document, error) {
	scanner := bufio.NewScanner(strings.NewReader(content))
	lines := make([]Line, 0)
	enhanced := false
	for scanner.Scan() {
		raw := scanner.Text()
		matches := lineTimestampPattern.FindAllStringSubmatchIndex(raw, -1)
		if len(matches) == 0 {
			continue
		}
		textStart := matches[len(matches)-1][1]
		payload := strings.TrimSpace(raw[textStart:])
		for _, m := range matches {
			lineStart, err := parseLineTimestamp(raw[m[0]:m[1]])
			if err != nil {
				return Document{}, err
			}
			text, words := parseEnhancedWords(payload, lineStart)
			if len(words) > 0 {
				enhanced = true
			}
			lines = append(lines, Line{Text: text, StartMS: lineStart, Words: words})
		}
	}
	if err := scanner.Err(); err != nil {
		return Document{}, err
	}
	if len(lines) == 0 {
		return Document{}, errors.New("no timed lyric lines found")
	}
	sort.SliceStable(lines, func(i, j int) bool { return lines[i].StartMS < lines[j].StartMS })
	setDurations(lines)
	format := "lrc"
	if enhanced {
		format = "enhanced_lrc"
	}
	return Document{Format: format, Lines: lines}, nil
}

func ParseSRT(content string) (Document, error) {
	content = strings.ReplaceAll(content, "\r\n", "\n")
	blocks := regexp.MustCompile(`\n{2,}`).Split(strings.TrimSpace(content), -1)
	lines := make([]Line, 0, len(blocks))
	for _, block := range blocks {
		parts := strings.Split(block, "\n")
		if len(parts) < 2 {
			continue
		}
		rangeIndex := 0
		if !strings.Contains(parts[0], "-->") {
			rangeIndex = 1
		}
		if rangeIndex >= len(parts) {
			continue
		}
		m := srtRangePattern.FindStringSubmatch(parts[rangeIndex])
		if m == nil {
			continue
		}
		start := srtMS(m[1], m[2], m[3], m[4])
		end := srtMS(m[5], m[6], m[7], m[8])
		text := strings.TrimSpace(strings.Join(parts[rangeIndex+1:], " "))
		text = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(text, "")
		if text != "" {
			lines = append(lines, Line{Text: text, StartMS: start, DurationMS: max64(0, end-start)})
		}
	}
	if len(lines) == 0 {
		return Document{}, errors.New("no SRT subtitle cues found")
	}
	sort.SliceStable(lines, func(i, j int) bool { return lines[i].StartMS < lines[j].StartMS })
	return Document{Format: "srt", Lines: lines}, nil
}

func parseEnhancedWords(payload string, lineStart int64) (string, []Word) {
	matches := wordTimestampPattern.FindAllStringSubmatchIndex(payload, -1)
	if len(matches) == 0 {
		return strings.TrimSpace(payload), nil
	}
	words := make([]Word, 0, len(matches))
	for i, m := range matches {
		stamp := payload[m[0]:m[1]]
		start, err := parseWordTimestamp(stamp)
		if err != nil {
			continue
		}
		textStart := m[1]
		textEnd := len(payload)
		if i+1 < len(matches) {
			textEnd = matches[i+1][0]
		}
		text := strings.TrimSpace(payload[textStart:textEnd])
		if text == "" {
			continue
		}
		if start < lineStart {
			start = lineStart
		}
		words = append(words, Word{Text: text, StartMS: start})
	}
	for i := range words {
		if i+1 < len(words) {
			words[i].DurationMS = max64(1, words[i+1].StartMS-words[i].StartMS)
		}
	}
	texts := make([]string, len(words))
	for i, w := range words {
		texts[i] = w.Text
	}
	return strings.Join(texts, " "), words
}

func setDurations(lines []Line) {
	for i := range lines {
		if i+1 < len(lines) {
			lines[i].DurationMS = max64(1, lines[i+1].StartMS-lines[i].StartMS)
		} else if lines[i].DurationMS == 0 {
			lines[i].DurationMS = 2600
		}
		if len(lines[i].Words) > 0 {
			last := len(lines[i].Words) - 1
			if lines[i].Words[last].DurationMS == 0 {
				lines[i].Words[last].DurationMS = max64(1, lines[i].StartMS+lines[i].DurationMS-lines[i].Words[last].StartMS)
			}
		}
	}
}

func parseLineTimestamp(value string) (int64, error) {
	m := lineTimestampPattern.FindStringSubmatch(value)
	if m == nil {
		return 0, fmt.Errorf("invalid timestamp %q", value)
	}
	return timestampMS(m[1], m[2], m[3]), nil
}

func parseWordTimestamp(value string) (int64, error) {
	m := wordTimestampPattern.FindStringSubmatch(value)
	if m == nil {
		return 0, fmt.Errorf("invalid word timestamp %q", value)
	}
	minutes := m[1]
	if minutes == "" {
		minutes = "0"
	}
	return timestampMS(minutes, m[2], m[3]), nil
}

func timestampMS(minutes, seconds, fraction string) int64 {
	min, _ := strconv.Atoi(minutes)
	sec, _ := strconv.Atoi(seconds)
	frac := 0
	if fraction != "" {
		frac, _ = strconv.Atoi(fraction)
		if len(fraction) == 1 {
			frac *= 100
		}
		if len(fraction) == 2 {
			frac *= 10
		}
	}
	return int64((time.Duration(min)*time.Minute + time.Duration(sec)*time.Second + time.Duration(frac)*time.Millisecond) / time.Millisecond)
}

func srtMS(h, m, s, ms string) int64 {
	hh, _ := strconv.Atoi(h)
	mm, _ := strconv.Atoi(m)
	ss, _ := strconv.Atoi(s)
	msec, _ := strconv.Atoi(ms)
	return int64((((hh*60+mm)*60 + ss) * 1000) + msec)
}

func max64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}
