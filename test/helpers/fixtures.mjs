export const minimalManifest = {
  version: 1,
  name: "Test Project",
  tags: [],
  collections: [
    {
      id: "icon",
      label: "App Icon",
      tags: [],
      sourceSize: { width: 1024, height: 1024 },
      templates: [
        { src: "src/icon.html", name: "icon", label: "App Icon" },
      ],
      export: [
        { name: "512", label: "512px", size: { width: 512, height: 512 } },
      ],
    },
  ],
};

export const validManifest = {
  version: 1,
  name: "My App Assets",
  publicDir: "public",
  tags: [
    { id: "icon", label: "Icon" },
    { id: "marketing", label: "Marketing" },
  ],
  collections: [
    {
      id: "icon",
      label: "App Icon",
      tags: ["icon"],
      sourceSize: { width: 1024, height: 1024 },
      borderRadius: 224,
      templates: [
        { src: "src/icon.html", name: "icon", label: "App Icon" },
        { src: "src/icon-alt.html", name: "icon-alt", label: "Alt Icon" },
      ],
      export: [
        { name: "1024", label: "App Store", size: { width: 1024, height: 1024 } },
        { name: "180", label: "iPhone @3x", size: { width: 180, height: 180 } },
        { name: "512", label: "512px", size: { width: 512, height: 512 } },
        { name: "192", label: "192px", size: { width: 192, height: 192 } },
      ],
      outputs: [
        { type: "xcode", path: "App/Assets.xcassets/AppIcon.appiconset" },
      ],
    },
    {
      id: "screenshots",
      label: "App Screenshots",
      tags: ["marketing"],
      sourceSize: { width: 440, height: 956 },
      templates: [
        { src: "src/screenshot-hero.html", name: "hero", label: "Hero Shot" },
        { src: "src/screenshot-features.html", name: "features", label: "Features" },
      ],
      export: [
        { name: "1320x2868", label: "6.9\" Display", size: { width: 1320, height: 2868 } },
        { name: "1290x2796", label: "6.7\" Display", size: { width: 1290, height: 2796 } },
        { name: "1080x1920", label: "Phone", size: { width: 1080, height: 1920 } },
      ],
    },
  ],
};

export const multiPlatformManifest = {
  version: 1,
  name: "Multi Platform",
  tags: [
    { id: "icon", label: "Icon" },
    { id: "logo", label: "Logo" },
  ],
  collections: [
    {
      id: "icon",
      label: "App Icon",
      tags: ["icon"],
      sourceSize: { width: 1024, height: 1024 },
      templates: [
        { src: "src/icon.html", name: "icon", label: "App Icon" },
      ],
      export: [
        { name: "1024", label: "App Store", size: { width: 1024, height: 1024 } },
        { name: "512", label: "Play Store", size: { width: 512, height: 512 } },
        { name: "192", label: "PWA", size: { width: 192, height: 192 } },
      ],
    },
    {
      id: "logo",
      label: "Logo",
      tags: ["logo"],
      sourceSize: { width: 800, height: 800 },
      templates: [
        { src: "src/logo.svg", name: "logo", label: "Logo" },
      ],
      export: [
        { name: "400", label: "400px", size: { width: 400, height: 400 } },
      ],
      outputs: [
        { type: "copy-source", format: "svg" },
      ],
    },
  ],
};

export const templateHtml = `<!DOCTYPE html>
<html><head><style>body{margin:0;background:linear-gradient(135deg,#667eea,#764ba2);}</style></head>
<body><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:48px;">Test</div></body></html>`;

export const templateSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
<rect width="800" height="800" fill="#667eea"/><text x="400" y="400" text-anchor="middle" fill="white" font-size="48">Logo</text></svg>`;
