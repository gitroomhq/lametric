require("@dotenvx/dotenvx").config();
const express = require("express");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_KEY);
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

let lastGitHubStars = 0;

const loadAllStripeSubscriptions = async (cursor) => {
  const subscriptions = await stripe.subscriptions.list({
    status: "all",
    limit: 100,
    starting_after: cursor,
  });

  if (subscriptions.data.length === 100) {
    return [
      ...subscriptions.data,
      ...(await loadAllStripeSubscriptions(
        subscriptions.data[subscriptions.data.length - 1].id,
      )),
    ];
  }
  return subscriptions.data;
};

let lastMrr = 0;
let lastSubs = 0;
let lastTrials = 0;

app.get("/stripe", async (req, res) => {
  const loadAllSubscriptions = (await loadAllStripeSubscriptions()).filter(
    (f) => f.status === "active" || f.status === "trialing",
  );
  const active = loadAllSubscriptions.filter((f) => f.status === "active");
  const trialing = loadAllSubscriptions.filter((f) => f.status === "trialing");
  const mrr = active.reduce((acc, item) => {
    const amount = item.plan.amount / 100; // Convert from cents to dollars
    const interval = item.plan.interval;
    return acc + (interval === "month" ? amount : amount / 12);
  }, 0);

  res.status(200).json({
    frames: [
      {
        text: "MRR",
        duration: 500,
        icon: 9177,
      },
      {
        goalData: {
          start: lastMrr,
          current: mrr,
          end: mrr,
          unit: "",
        },
        icon: 9177,
        duration: 5000,
      },
      {
        text: "SUBS",
        duration: 500,
        icon: 23776,
      },
      {
        goalData: {
          start: lastSubs,
          current: active.length,
          end: active.length,
          unit: "",
        },
        icon: 23776,
        duration: 5000,
      },
      {
        text: "TRAILS",
        duration: 500,
        icon: 45197,
      },
      {
        goalData: {
          start: lastTrials,
          current: trialing.length,
          end: trialing.length,
          unit: "",
        },
        icon: 45197,
        duration: 5000,
      },
    ],
  });

  lastMrr = mrr;
  lastSubs = active.length;
  lastTrials = trialing.length;
});

app.get("/github", async (req, res) => {
  const data = await (
    await fetch("https://github.com/gitroomhq/postiz-app")
  ).text();

  const dom = new JSDOM(data);
  const stars = dom.window.document
    .querySelector("#repo-stars-counter-star")
    .getAttribute("title")
    .replace(/,/g, "");

  res.status(200).json({
    frames: [
      {
        goalData: {
          start: lastGitHubStars,
          current: +stars,
          end: +stars,
          unit: "",
        },
        icon: 14925,
      },
    ],
  });

  lastGitHubStars = +stars;
});

app.listen(process.env.PORT || 3005, () => {
  console.log("App is running on port 3005");
});
