// Simple puppeteer config - browser is launched in setup file
module.exports = {
  launch: {
    headless: process.env.HEADLESS !== "false",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
    ],
    slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO) : 0,
    devtools: process.env.HEADLESS === "false",
  },
};
