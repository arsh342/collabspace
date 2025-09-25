# 🚀 CollabSpace Build System

This document describes the complete build system for the CollabSpace project, including how to build, deploy, and manage the application in different environments.

## 📋 Build Scripts

### Available Commands

| Command              | Description                                        |
| -------------------- | -------------------------------------------------- |
| `npm run build`      | Build the complete project (CSS, JS, assets)       |
| `npm run build:css`  | Build only CSS files                               |
| `npm run build:prod` | Build project and install production dependencies  |
| `npm run clean`      | Clean all build artifacts                          |
| `npm run prod`       | Build and start production server (development)    |
| `npm run prod:dist`  | Build and start production server from dist folder |

## 🏗️ Build Process

The build system performs the following operations:

### 1. CSS Processing

- **Input**: `./src/public/css/style.css`, `./src/public/css/teams.css`
- **Output**: `./src/public/css/dist/` (minified CSS)
- **Features**:
  - CSS minification (removes comments, extra whitespace)
  - Tailwind CSS processing
  - Multiple CSS file support

### 2. JavaScript Processing

- **Input**: `./src/public/js/main.js`
- **Output**: `./src/public/js/dist/main.js` (minified JS)
- **Features**:
  - JavaScript minification
  - Comment removal
  - Whitespace optimization

### 3. Asset Copying

- **Source Directories**:

  - `./src/views` → `./dist/views`
  - `./src/routes` → `./dist/routes`
  - `./src/models` → `./dist/models`
  - `./src/middleware` → `./dist/middleware`
  - `./src/config` → `./dist/config`
  - `./src/utils` → `./dist/utils`
  - `./uploads` → `./dist/uploads`

- **Source Files**:
  - `./src/app.js` → `./dist/app.js`
  - `./package.json` → `./dist/package.json`
  - `./tailwind.config.js` → `./dist/tailwind.config.js`
  - `./postcss.config.js` → `./dist/postcss.config.js`

### 4. Production Optimization

- **Production package.json**: Removes devDependencies, updates scripts
- **Build info**: Generates `build-info.json` with build metadata
- **Clean build**: Removes previous build artifacts

## 📁 Build Output Structure

```
dist/
├── app.js                    # Main application file
├── package.json              # Production package.json
├── build-info.json           # Build metadata
├── tailwind.config.js        # Tailwind configuration
├── postcss.config.js         # PostCSS configuration
├── views/                    # EJS templates
├── routes/                   # Express routes
├── models/                   # Mongoose models
├── middleware/               # Express middleware
├── config/                   # Configuration files
├── utils/                    # Utility functions
└── uploads/                  # Uploaded files
```

## 🚀 Deployment Options

### Option 1: Development Production

```bash
npm run prod
```

- Builds the project
- Starts server from source directory
- Uses development dependencies

### Option 2: True Production

```bash
npm run build:prod
cd dist
npm start
```

- Builds complete production package
- Installs only production dependencies
- Runs from optimized dist directory

### Option 3: PM2 Production

```bash
npm run prod:dist
```

- Builds production package
- Starts with PM2 process manager
- Runs from dist directory

## 🔧 Build Configuration

The build system is configured in `build.js` with the following options:

```javascript
const config = {
  css: {
    input: "./src/public/css/style.css",
    output: "./src/public/css/dist/style.css",
    outputDir: "./src/public/css/dist",
  },
  js: {
    input: "./src/public/js/main.js",
    output: "./src/public/js/dist/main.js",
    outputDir: "./src/public/js/dist",
  },
  buildDir: "./dist",
  // ... more configuration
};
```

## 📊 Build Information

Each build generates a `build-info.json` file containing:

```json
{
  "buildTime": "2025-09-25T16:34:25.958Z",
  "version": "1.0.0",
  "nodeVersion": "v22.17.1",
  "platform": "darwin",
  "arch": "arm64"
}
```

## 🧹 Cleanup

To clean all build artifacts:

```bash
npm run clean
```

This removes:

- `./dist/` directory
- `./src/public/css/dist/` directory
- `./src/public/js/dist/` directory

## 🔍 Build Verification

After building, verify the output:

```bash
# Check build directory
ls -la dist/

# Check CSS output
ls -la src/public/css/dist/

# Check JS output
ls -la src/public/js/dist/

# View build info
cat dist/build-info.json
```

## 🚨 Troubleshooting

### Common Issues

1. **Build fails with "file not found"**

   - Ensure all source files exist
   - Check file paths in build configuration

2. **CSS not minifying properly**

   - Verify Tailwind directives are in source CSS
   - Check PostCSS configuration

3. **JavaScript minification issues**

   - Ensure JS syntax is valid
   - Check for unclosed comments or strings

4. **Permission errors**
   - Ensure write permissions for output directories
   - Check file ownership

### Build Logs

The build system provides detailed logging:

- ✅ Success indicators
- 📁 File operations
- 📊 Size information
- ⏱️ Build timing

## 🔄 Continuous Integration

For CI/CD pipelines, use:

```bash
# Install dependencies
npm ci

# Build project
npm run build:prod

# Test build
cd dist && npm test

# Deploy
# (Your deployment commands here)
```

## 📈 Performance

Typical build times:

- **CSS processing**: ~50ms
- **JavaScript processing**: ~30ms
- **Asset copying**: ~100ms
- **Total build time**: ~200ms

Build output sizes:

- **CSS**: ~8KB (minified)
- **JavaScript**: ~10KB (minified)
- **Total assets**: ~2MB (including uploads)

---

For more information, see the main [README.md](./README.md) file.
