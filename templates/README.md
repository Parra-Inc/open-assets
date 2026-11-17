# Open Assets template gallery

The source for the templates shown on [open-assets.dev/templates](https://open-assets.dev/templates).
Each collection in `assets.json` is a working Open Assets project you can copy into your own repo.

```bash
npx open-assets render templates            # render every collection to templates/exports
cd templates && npx open-assets dev       # or open the live viewer
```

| Collection | Templates | Sizes |
| --- | --- | --- |
| `play-feature-graphic` | centered, device, dark | 1024x500 |
| `ipad-screenshots` | hero, Split View, dark | iPad 13" and 12.9" |
| `og-image` | centered title, blog post, docs | 1200x630 |
| `mac-screenshots` | hero, keyboard, dark | 2880x1800 |
| `twitter-card` | launch, quote, milestone | 1200x675 |
| `favicon` | one SVG | 512, 192, 180, 32, 16 plus the SVG |

The sample app, "Lumen", is fictional. Swap the copy, the brand tokens at the top of
`assets/styles.css` and the fake UI for your own screenshots.
