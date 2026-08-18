# KEFE Effect Typography — Locked

These typography assignments are the locked design specification for the current KEFE production lyric effects. Production effects use locally bundled WOFF2 fonts from the repository; no Google Fonts or other remote font dependency is required.

| Effect | Font | Treatment |
|---|---|---|
| Apple Music | Open Sans | Premium lyric typography with smooth focus/highlight movement |
| Brat | Archivo Narrow | Compact, edge-to-edge album-cover typography |
| Eternal Sunshine | Homemade Apple | Handwritten lyric reveal with organic writing motion |
| Aurora | Shantell Sans | Expressive handwritten/display typography with atmospheric colour flow |
| Typewriter | Courier Prime | Restrained character-by-character reveal |
| Instagram Lyrics | **Inter Tight ExtraBold** | Bold uppercase Story composition with dominant active lyric, restrained surrounding lines and smooth stacked handoff |
| Fade Up | Momo Trust Display | Word-by-word rise, pop and settle |

## Instagram Lyrics

Instagram Lyrics is the canonical replacement for the removed Stroke effect. Its typography is integrated with the shared KEFE typography contract and uses **Inter Tight ExtraBold** as the locked production face.

The treatment is tuned to the selected Instagram Stories Music lyric reference: compact bold sans-serif lettering, uppercase presentation, tight leading, a dominant active lyric, quieter neighbouring lyrics, controlled horizontal width, and smooth handoff between lyric states. It uses no outline, stroke, glow or typewriter animation.

Inter Tight is bundled locally as WOFF2 and loaded through KEFE's canonical `@font-face` definitions. The effect does not depend on an installed system font or a remote font CDN.

## Embedded font policy

The following font families are canonical and must remain locally bundled for production rendering:

- Open Sans — Apple Music and UI
- Archivo Narrow — Brat
- Homemade Apple — Eternal Sunshine
- Shantell Sans — Aurora
- Courier Prime — Typewriter
- Inter Tight — Instagram Lyrics
- Momo Trust Display — Fade Up

The corresponding licence files supplied with the fonts remain in the repository. Do not substitute a system font, remote web font, or differently licensed font without an explicit design/licensing decision.
