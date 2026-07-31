package lyrics

import "testing"

func TestParseLRC(t *testing.T) {
	doc, err := ParseLRC("[00:01.20]Hello world\n[00:03.50]Second line")
	if err != nil {
		t.Fatal(err)
	}
	if len(doc.Lines) != 2 {
		t.Fatalf("got %d lines", len(doc.Lines))
	}
	if doc.Lines[0].StartMS != 1200 {
		t.Fatalf("got %d", doc.Lines[0].StartMS)
	}
	if doc.Lines[0].DurationMS != 2300 {
		t.Fatalf("duration %d", doc.Lines[0].DurationMS)
	}
}

func TestParseEnhancedLRC(t *testing.T) {
	doc, err := ParseLRC("[00:01.00]<00:01.00>Hello <00:01.60>world\n[00:03.00]Next")
	if err != nil {
		t.Fatal(err)
	}
	if doc.Format != "enhanced_lrc" {
		t.Fatalf("format %s", doc.Format)
	}
	if len(doc.Lines[0].Words) != 2 {
		t.Fatalf("words %d", len(doc.Lines[0].Words))
	}
	if doc.Lines[0].Words[1].StartMS != 1600 {
		t.Fatalf("start %d", doc.Lines[0].Words[1].StartMS)
	}
}

func TestParseSRT(t *testing.T) {
	doc, err := ParseSRT("1\n00:00:01,250 --> 00:00:03,000\nHello world\n\n2\n00:00:04,000 --> 00:00:05,500\nSecond line")
	if err != nil {
		t.Fatal(err)
	}
	if len(doc.Lines) != 2 {
		t.Fatalf("lines %d", len(doc.Lines))
	}
	if doc.Lines[0].StartMS != 1250 || doc.Lines[0].DurationMS != 1750 {
		t.Fatalf("timing %+v", doc.Lines[0])
	}
}

func TestParseText(t *testing.T) {
	doc := ParseText("Line one\n\nLine two")
	if len(doc.Lines) != 2 {
		t.Fatalf("got %d lines", len(doc.Lines))
	}
}
