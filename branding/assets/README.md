# Branding Assets

Place your branding assets in this directory:

## Directory Structure

```
assets/
├── logos/
│   ├── logo.svg              # Main logo (SVG)
│   ├── logo.png              # Main logo (PNG, 1024x1024)
│   ├── logo-white.svg        # Logo for dark backgrounds
│   └── logo-icon.svg         # Icon only (square)
├── favicons/
│   ├── favicon.ico           # 16x16, 32x32, 48x48
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png  # 180x180
│   └── android-chrome-*.png  # Various sizes
├── images/
│   ├── hero-*.jpg            # Hero images (1920x1080)
│   ├── og-image.jpg          # Open Graph image (1200x630)
│   └── twitter-image.jpg     # Twitter card image (1200x600)
├── fonts/
│   └── *.woff2               # Custom fonts (if any)
└── colors/
    └── palette.json          # Color palette definition
```

## Asset Requirements

### Logos
- **Format**: SVG (preferred) or PNG with transparency
- **Sizes**: Scalable SVG or multiple PNG sizes
- **Variants**: Light background, dark background, icon only

### Favicons
- Generate using: https://realfavicongenerator.net/
- Include all sizes for cross-platform support

### Images
- **Format**: JPG for photos, PNG for graphics
- **Optimization**: Compress before uploading
- **Naming**: Descriptive, lowercase, hyphenated

### Fonts
- **Format**: WOFF2 (best compression)
- **License**: Ensure you have rights to use
- **Fallbacks**: Always specify fallback fonts

## Color Palette

Create `colors/palette.json`:

```json
{
  "primary": {
    "50": "#eff6ff",
    "100": "#dbeafe",
    "500": "#3b82f6",
    "600": "#2563eb",
    "700": "#1d4ed8",
    "900": "#1e3a8a"
  },
  "secondary": {
    "50": "#f8fafc",
    "500": "#64748b",
    "900": "#0f172a"
  },
  "accent": {
    "500": "#8b5cf6",
    "600": "#7c3aed"
  }
}
```

## Usage

After adding assets here:

1. Copy logos to `client/public/`
2. Copy favicons to `client/public/`
3. Copy images to `client/public/images/`
4. Update color scheme in `client/src/index.css`
5. Add fonts to `client/public/fonts/` and update CSS

## Tools

- **Logo Creation**: Canva, Figma, Adobe Illustrator
- **Favicon Generator**: https://realfavicongenerator.net/
- **Image Optimization**: TinyPNG, Squoosh, ImageOptim
- **Color Palette**: Coolors.co, Adobe Color
