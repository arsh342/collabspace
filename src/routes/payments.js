const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { catchAsync } = require("../middleware/errorHandler");
const { getStripe } = require("../config/stripe");
const { logger } = require("../middleware/logger");

const router = express.Router();

const PLAN_CONFIG = {
  pro: {
    name: "CollabSpace Pro",
    description: "Unlimited teams, automation workflows, and priority support.",
    currency: process.env.STRIPE_CURRENCY || "usd",
    unitAmount: Number.parseInt(process.env.STRIPE_PRO_UNIT_AMOUNT || "5900", 10),
    interval: "month",
    defaultSeats: Number.parseInt(process.env.STRIPE_PRO_DEFAULT_SEATS || "5", 10),
    maxSeats: Number.parseInt(process.env.STRIPE_PRO_MAX_SEATS || "500", 10),
    features: ["unlimited-teams", "automation", "priority-support"],
  },
};

function normalisePlan(plan) {
  return (plan || "pro").toLowerCase();
}

function coerceSeatCount(requestedSeats, planSettings) {
  const fallback = planSettings.defaultSeats || 1;
  const parsed = Number.parseInt(requestedSeats, 10);
  const seatCount = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  const max = Math.max(planSettings.maxSeats || 1, 1);
  return Math.min(seatCount, max);
}

router.post(
  "/checkout-session",
  requireAuth,
  catchAsync(async (req, res) => {
    const stripe = getStripe();

    if (!stripe) {
      return res.status(503).json({
        success: false,
        message:
          "Payments are temporarily unavailable. Please try again later or contact support.",
      });
    }

    const requestedPlan = normalisePlan(req.body?.plan);
    const planSettings = PLAN_CONFIG[requestedPlan];

    if (!planSettings) {
      return res.status(400).json({
        success: false,
        message: "Unsupported plan selected.",
      });
    }

    if (!Number.isFinite(planSettings.unitAmount) || planSettings.unitAmount <= 0) {
      logger.warn("Stripe plan misconfigured", { requestedPlan });
      return res.status(500).json({
        success: false,
        message: "Plan configuration missing billing amount. Please contact support.",
      });
    }

    const seatCount = coerceSeatCount(req.body?.seats, planSettings);

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const successUrl = `${appUrl}/payment?status=success`;
    const cancelUrl = `${appUrl}/payment?status=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      billing_address_collection: "auto",
      payment_method_types: ["card"],
      customer_email: req.user.email,
      client_reference_id: req.user._id?.toString(),
      metadata: {
        plan: requestedPlan,
        seats: String(seatCount),
        userId: req.user._id?.toString(),
      },
      line_items: [
        {
          quantity: seatCount,
          price_data: {
            currency: planSettings.currency,
            unit_amount: planSettings.unitAmount,
            recurring: {
              interval: planSettings.interval,
            },
            product_data: {
              name: planSettings.name,
              description: planSettings.description,
              metadata: {
                features: planSettings.features.join(","),
              },
            },
          },
        },
      ],
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    logger.info("Created Stripe checkout session", {
      plan: requestedPlan,
      seats: seatCount,
      userId: req.user._id?.toString(),
      sessionId: session.id,
    });

    return res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  }),
);

module.exports = router;

