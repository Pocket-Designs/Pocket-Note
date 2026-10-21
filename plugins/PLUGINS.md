# Pocket-Note plugins (JSON)

Import via **⚙️ Settings → Import plugin (.json)**. A plugin is one JSON file; every key except `name` is optional.

```json
{
  "name": "My plugin",
  "commands":  [ { "label": "Today", "insert": "{{date}}" },
                 { "label": "Bold",  "wrap": ["**", "**"] } ],
  "shapes":    [ { "id": "chevron", "label": "Chevron", "w": 170, "h": 70,
                   "d": "M1 1H70L99 50L70 99H1L30 50Z" } ],
  "templates": [ { "name": "My diagram",
                   "items": [ { "k": "a", "t": "s", "sh": "diamond", "x": 0, "y": 0, "v": "Decision", "c": "#fef3c7" },
                              { "k": "b", "t": "n", "x": 220, "y": 0, "v": "A note" } ],
                   "links": [ { "a": "a", "b": "b", "ty": "e", "ah": 1, "tx": "yes" } ] } ]
}
```

## commands (text pages)
`insert` inserts text, `wrap` wraps the selection. `{{date}}` / `{{time}}` are replaced.

## shapes (canvas pages → ◇ Shapes menu)
* `d` – SVG path (or array of paths) drawn in a **100 × 100** box and stretched to the shape's size. The first path is filled; extra paths are outline only. Allowed commands: `M L H V C S Q T A Z` (numbers only).
* `w`,`h` – default size (30-600). `id` – letters, digits, `-` or `_`.

## templates (canvas pages → 📋 Templates menu)
* **items**: `k` (your key, used by links), `t` type: `s` shape, `n` note, `t` text, `d` to-do, `k` board, `f` storyboard frame, `l` link card.
  Optional: `x y w h v` (text), `sh` (shape id – built-in, or `plugin-name/shape-id`), `c` fill, `sc` outline, `tc` text colour (hex only), `fs` font size, `b` bold, `mm` mind-map branch, `l` to-do items `[{"t":"..","d":0}]`.
* **links**: `a`,`b` item keys; `ty` `s` straight / `e` elbow / `c` curve; `ah` arrow at end (0/1); `at` arrow at start; `ds` 0 solid / 1 dashed / 2 dotted; `c` colour; `w` width; `tx` label; `sa`,`sb` sides `t r b l`.

Tip: build a diagram on a canvas, then **⬇ Export → Save as template (.json plugin)** and import the file to reuse it.

Built-in shape ids: rect, rounded, pill, ellipse, circle, diamond, para, hexa, cyl, doc, tri, star, cloud, arrow, bubble.
