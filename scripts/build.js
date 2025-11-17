#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Build configuration
const config = {
  // CSS files
  css: {
    input: "./src/public/css/style.css",
    output: "./src/public/css/dist/style.css",
    outputDir: "./src/public/css/dist",
  },
  // JavaScript files
  js: {
    input: "./src/public/js/main.js",
    output: "./src/public/js/dist/main.js",
    outputDir: "./src/public/js/dist",
  },
  // Additional CSS files
  additionalCSS: [
    {
      input: "./src/public/css/teams.css",
      output: "./src/public/css/dist/teams.css",
    },
  ],
  // Build output directory
  buildDir: "./dist",
  // Source directories to copy
  copyDirs: [
    { src: "./src/views", dest: "./dist/views" },
    { src: "./src/routes", dest: "./dist/routes" },
    { src: "./src/models", dest: "./dist/models" },
    { src: "./src/middleware", dest: "./dist/middleware" },
    { src: "./src/config", dest: "./dist/config" },
    { src: "./src/utils", dest: "./dist/utils" },
    { src: "./uploads", dest: "./dist/uploads" },
  ],
  // Files to copy
  copyFiles: [
    { src: "./src/app.js", dest: "./dist/app.js" },
    { src: "./package.json", dest: "./dist/package.json" },
    { src: "./tailwind.config.js", dest: "./dist/tailwind.config.js" },
    { src: "./postcss.config.js", dest: "./dist/postcss.config.js" },
  ],
};

// Utility functions
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  ensureDir(dest);
  const items = fs.readdirSync(src);

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function minifyCSS(css) {
  // Simple CSS minification - remove comments, extra whitespace
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove comments
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/;\s*}/g, "}") // Remove semicolon before closing brace
    .replace(/{\s+/g, "{") // Remove space after opening brace
    .replace(/;\s+/g, ";") // Remove space after semicolon
    .trim();
}

function minifyJS(js) {
  // Simple JS minification - remove comments and extra whitespace
  return js
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove block comments
    .replace(/\/\/.*$/gm, "") // Remove line comments
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/;\s+/g, ";") // Remove space after semicolon
    .trim();
}

// Build functions
function buildCSS() {
  console.log("🎨 Building CSS...");

  // Ensure CSS output directory exists
  ensureDir(config.css.outputDir);

  // Read and process main CSS file
  const inputCSS = fs.readFileSync(config.css.input, "utf8");
  const minifiedCSS = minifyCSS(inputCSS);
  fs.writeFileSync(config.css.output, minifiedCSS);

  // Process additional CSS files
  for (const cssFile of config.additionalCSS) {
    if (fs.existsSync(cssFile.input)) {
      const css = fs.readFileSync(cssFile.input, "utf8");
      const minified = minifyCSS(css);
      fs.writeFileSync(cssFile.output, minified);
    }
  }

  const size = (fs.statSync(config.css.output).size / 1024).toFixed(2);
  console.log(`✅ CSS built: ${config.css.output} (${size} KB)`);
}

function buildJS() {
  console.log("⚡ Building JavaScript...");

  // Ensure JS output directory exists
  ensureDir(config.js.outputDir);

  // Read and process main JS file
  const inputJS = fs.readFileSync(config.js.input, "utf8");
  const minifiedJS = minifyJS(inputJS);
  fs.writeFileSync(config.js.output, minifiedJS);

  const size = (fs.statSync(config.js.output).size / 1024).toFixed(2);
  console.log(`✅ JavaScript built: ${config.js.output} (${size} KB)`);
}

function copyAssets() {
  console.log("📁 Copying assets...");

  // Ensure build directory exists
  ensureDir(config.buildDir);

  // Copy directories
  for (const dir of config.copyDirs) {
    if (fs.existsSync(dir.src)) {
      copyDir(dir.src, dir.dest);
      console.log(`📂 Copied: ${dir.src} → ${dir.dest}`);
    }
  }

  // Copy files
  for (const file of config.copyFiles) {
    if (fs.existsSync(file.src)) {
      copyFile(file.src, file.dest);
      console.log(`📄 Copied: ${file.src} → ${file.dest}`);
    }
  }
}

function createProductionPackageJson() {
  console.log("📦 Creating production package.json...");

  const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));

  // Remove devDependencies for production
  delete packageJson.devDependencies;

  // Update scripts for production
  packageJson.scripts = {
    start: "node app.js",
    prod: "pm2 start app.js --name collabspace",
    stop: "pm2 stop collabspace",
    restart: "pm2 restart collabspace",
  };

  // Write production package.json
  fs.writeFileSync("./dist/package.json", JSON.stringify(packageJson, null, 2));

  console.log("✅ Production package.json created");
}

function generateBuildInfo() {
  console.log("📊 Generating build info...");

  const buildInfo = {
    buildTime: new Date().toISOString(),
    version: JSON.parse(fs.readFileSync("./package.json", "utf8")).version,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };

  fs.writeFileSync(
    "./dist/build-info.json",
    JSON.stringify(buildInfo, null, 2)
  );

  console.log("✅ Build info generated");
}

// Main build function
function build() {
  console.log("🚀 Starting complete project build...\n");

  const startTime = Date.now();

  try {
    // Clean previous build
    if (fs.existsSync(config.buildDir)) {
      fs.rmSync(config.buildDir, { recursive: true, force: true });
      console.log("🧹 Cleaned previous build\n");
    }

    // Build CSS
    buildCSS();
    console.log();

    // Build JavaScript
    buildJS();
    console.log();

    // Copy assets
    copyAssets();
    console.log();

    // Create production package.json
    createProductionPackageJson();
    console.log();

    // Generate build info
    generateBuildInfo();
    console.log();

    const endTime = Date.now();
    const buildTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log("🎉 Build completed successfully!");
    console.log(`⏱️  Build time: ${buildTime}s`);
    console.log(`📁 Output directory: ${config.buildDir}`);
    console.log("\n📋 Build summary:");
    console.log("   ✅ CSS minified and optimized");
    console.log("   ✅ JavaScript minified");
    console.log("   ✅ Assets copied");
    console.log("   ✅ Production package.json created");
    console.log("   ✅ Build info generated");
  } catch (error) {
    console.error("❌ Build failed:", error.message);
    process.exit(1);
  }
}

// Run build if this script is executed directly
if (require.main === module) {
  build();
}

module.exports = { build, config };
