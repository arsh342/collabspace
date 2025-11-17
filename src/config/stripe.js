const { logger } = require("../middleware/logger");

let stripeClient = null;
let stripeLoadAttempted = false;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  if (stripeClient) {
    return stripeClient;
  }

  if (!stripeLoadAttempted) {
    stripeLoadAttempted = true;
    try {
      // Lazily require Stripe to avoid crashes when the SDK is not installed in dev/test
      // eslint-disable-next-line global-require, import/no-extraneous-dependencies
      const Stripe = require("stripe");
      stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2023-10-16",
      });
    } catch (error) {
      logger.error("Stripe SDK not available:", {
        message: error.message,
      });
      stripeClient = null;
    }
  }

  return stripeClient;
}

function isStripeConfigured() {
  return Boolean(getStripe());
}

module.exports = {
  getStripe,
  isStripeConfigured,
};

