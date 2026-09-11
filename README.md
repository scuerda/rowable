# Rowable

A single-page conditions check for **sculling on the Seekonk River** in Providence —
the reach from Narragansett Boat Club (Gano St) north toward Pawtucket.

It answers two questions: *can I row right now*, and *when is the best window in
the next three days*.

Everything lives in `index.html`. No build step, no dependencies, no API keys, no
backend.

## Running it

```sh
python3 -m http.server 8000    # then open http://localhost:8000
```

Opening `index.html` directly from the filesystem also works — every API it uses
sends `Access-Control-Allow-Origin: *` — but a local server is the reliable path,
since some browsers restrict `fetch` from `file://`.

Wind speeds show in **mph** by default; the `mph`/`kn` toggle in the header
switches them, and the choice is remembered. Knots are worth keeping around for
cross-referencing NOAA and marine forecasts, which speak knots.

Times display in your browser's timezone, which is correct as long as you are on
Eastern time. Tide heights are feet above MLLW.

## Why not just read a wind forecast

Because wind speed alone is a poor predictor on this river. The score adjusts it
for two things specific to the Seekonk.

**Fetch alignment.** The reach runs almost due north (≈010°/190°) for about 4 km,
but it is only ~330 m wide. A northerly or southerly blows the whole length and
builds real waves; an easterly or westerly crosses in seconds and gets broken up
by the banks. Along-axis wind is treated as up to 35% stronger than the same
speed across. A 10-knot southerly and a 10-knot westerly are not the same day.

**Wind against tide.** With a ~5.5 ft range the current here is substantial. When
wind and current oppose each other, waves steepen and stand up. There is no
current-prediction station on the Seekonk, so flood and ebb are inferred from the
slope of the predicted height at Rumford: rising water sets upriver, falling water
sets down, and the steepest slope is the strongest current. This is the
combination that catches people out, and it is exactly what a wind-only forecast
hides.

Gustiness is charged separately — 40% of the gust-over-average spread — because a
gusty 12 mph is harder to sit than a steady 12.

## Bands

Scores run 0–100 over *effective* wind (real wind after the fetch, gust and tide
adjustments), tuned for a **single or double**:

| Effective wind    | Score  | Verdict                     |
|-------------------|--------|-----------------------------|
| under 8 mph       | 85–100 | Excellent — flat water      |
| 8–13 mph          | 70–84  | Good — comfortable          |
| 13–18 mph         | 50–69  | Fair — manageable chop      |
| 18–24 mph         | 30–49  | Marginal — experienced only |
| 24–28 mph         | 15–29  | Rough — not in a small boat |
| over 28 mph       | 0–14   | Don't go                    |

For calibration: a real 12 mph straight down the reach works out around 16 mph
effective (Fair — choppy, unpleasant, entirely rowable). The same 12 mph across the
river stays near 13.

**Hard stops** regardless of score: thunderstorms, gusts over 29 mph, and air-plus-water
temperature below 90°F. **Cautions**: unstable air, fog under 1 mile, low water under
1.0 ft, darkness, and air-plus-water under 100°F (the usual club rule of thumb).

## Retuning it

Every threshold is in the `CONFIG` object at the top of the `<script>` in
`index.html` — river axis, fetch boost, gust weight, wind-against-tide ceiling, the
score curve, and all the hard limits. Nothing else in the code has tunable numbers
baked in.

**`CONFIG` is in knots**, and so is the whole model: the score curve, `effWind`, and
the wind-against-tide penalty. The display unit is applied at render time only, which
is why the toggle needs no refetch and why the score never changes when you flip it.
Retune in knots, read in whatever you like.

If the score disagrees with water you actually rowed on, change `CONFIG`. In an
eight rather than a single, add roughly 7–9 mph (6–8 kn) to every band.

## Data sources

| | |
|---|---|
| Wind, temperature, sun times | [Open-Meteo](https://open-meteo.com) — requested in knots, the model's native unit |
| Tide predictions | NOAA CO-OPS station **8453433** (*Rumford, Seekonk River*), which sits on the rowing reach |
| Live wind and water temperature | NOAA CO-OPS station **8454000** (*Providence*) |

8453433 is a subordinate station: predictions only, no sensors. Live observations
therefore come from Providence, ~4 km downriver in more open water, which is why
the gauge usually reads a little stronger than the sheltered reach. The app shows
the observed and forecast wind side by side so you can spot a forecast that has
gone wrong.

Only the wind forecast is load-bearing. If a NOAA feed is down the page still
renders and marks those fields unavailable.

## Installing it on your phone

It is a PWA, so it installs to the home screen and opens without browser chrome.

**iOS (Safari):** open the page, tap Share, then **Add to Home Screen**. It must be
Safari — Chrome on iOS cannot install PWAs. It appears as "Rowable".

**Android (Chrome):** open the page and take the **Install app** prompt, or use the
⋮ menu → *Add to Home screen*.

### What works without a connection

The service worker caches the app shell, so the icon opens instantly and still
opens with no signal. It deliberately **does not** cache the weather or tide APIs —
a service worker quietly serving a three-hour-old forecast as though it were live
is exactly the wrong behaviour for something you use to decide whether to go out
on the water.

Instead the page saves the last payload it successfully fetched. If you open it
with no signal it scores that data against the real current time — the forecast
spans about four days, so the present hour is still in there — and shows a loud
banner saying how old it is. Past 24 hours the saved copy is discarded and you get
a plain error rather than a stale guess. The gauge readings keep their own
"reading taken" timestamp, so those never masquerade as current either.

In short: offline gets you a real answer with its age attached, never a confident
wrong one.

## Publishing it for your phone

Any static host works. With GitHub Pages:

```sh
git add -A && git commit -m "Rowable" && git push
gh api -X POST repos/:owner/rowable/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

Live at `https://<you>.github.io/rowable/`. HTTPS is required for the service
worker, which GitHub Pages provides. Pushing to `main` rebuilds in under a minute,
and because the shell is cached network-first the next launch picks up the change.

**After editing `sw.js`, bump its `VERSION` constant** — that is what evicts the
old cache. Editing `index.html` alone needs no bump.

## Caveat

This is an aid to judgement, not a substitute for it. Forecast wind is not measured
wind, the current model is inferred rather than observed, and no model knows about
the log you are about to hit. Look at the water.
