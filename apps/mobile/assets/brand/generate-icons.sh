#!/usr/bin/env bash
# Regenerates app icons and splash from the SVG sources. Requires rsvg-convert + ImageMagick.
set -euo pipefail
cd "$(dirname "$0")"
OUT=../images
rsvg-convert -w 1024 -h 1024 glyph.svg -o "$OUT/android-icon-foreground.png"
rsvg-convert -w 1024 -h 1024 background.svg -o "$OUT/android-icon-background.png"
# Monochrome (themed icons, Android 13+): glyph as a solid-black alpha mask, midrib omitted.
MONO=$(mktemp -t purebite-mono).svg
sed -e 's/#FFFFFF/#000000/g' -e 's/stroke="#0B7A55"/stroke="#000000" opacity="0"/' glyph.svg > "$MONO"
rsvg-convert -w 1024 -h 1024 "$MONO" -o "$OUT/android-icon-monochrome.png"
# Legacy / iOS square icon: background + glyph composited.
magick "$OUT/android-icon-background.png" "$OUT/android-icon-foreground.png" -composite "$OUT/icon.png"
# Splash: glyph cropped to the artwork, shown on the brand colour.
rsvg-convert -w 1024 -h 1024 glyph.svg | magick - -crop 470x470+277+277 +repage "$OUT/splash-icon.png"
# Google Play store graphics: 512x512 icon and a 1024x500 feature graphic (no alpha channel).
magick "$OUT/icon.png" -resize 512x512 ../../store/icon-512.png
rsvg-convert -w 1024 -h 500 feature-graphic.svg | magick - -background "#05603F" -alpha remove -alpha off ../../store/feature-graphic.png
echo "icons regenerated"
