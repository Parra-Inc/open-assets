# Backlog

## Reusable Components
- Component registry allowing HTML/SVG components to be shared across templates
- Import system so templates can reference common elements (logos, badges, frames)

## Asset Templates
- `open-assets new <template>` command to scaffold new assets from predefined templates
- Built-in templates for common asset types (App Store screenshot, icon, feature graphic)

## Configurable Export Locations
- Define export destinations per collection so rendered assets are automatically copied to target paths
- Support mapping a single source to multiple output locations (e.g., app icon → Xcode, Android, web favicon)

## Automations / Publishing
- Render and publish to App Store Connect directly from the CLI
- Render and publish to Google Play Console
- Support for additional platforms: Product Hunt, Slack app directory, etc.

## Android Asset Catalog
- Android project output handler (analogous to the existing Xcode `.appiconset` integration)
- Generates appropriate drawable/mipmap resources

## Videos / Video Templates
- Video asset support (e.g., App Store preview videos)
- Video templates with configurable duration, transitions, and content
