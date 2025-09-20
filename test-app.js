// Test script to identify the error
try {
  console.log("Loading app.js...");
  require('./src/app.js');
} catch (error) {
  console.error("Error details:", error);
  console.error("Stack trace:", error.stack);
}