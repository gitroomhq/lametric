require("@dotenvx/dotenvx").config();
const express = require("express");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_KEY);
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

process.env.lastGitHubStars = 0;
process.env.lastMrr = 0;
process.env.lastSubs = 0;
process.env.lastTrials = 0;
process.env.lastUsers = 0;

const loadAllUsers = async (page = 1) => {
  const { data } = await (
    await fetch(
      `https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION}/subscriptions?limit=100&page=${page}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}`,
        },
      },
    )
  ).json();

  if (data.length !== 100) {
    return data.length;
  }

  return data.length + (await loadAllUsers(page + 1));
};

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

app.get("/users", async (req, res) => {
  const users = await loadAllUsers();
  res.status(200).json({
    frames: [
      {
        goalData: {
          start: 0,
          current: users,
          end: 10000,
          unit: process.env.lastUsers === 0 ? "" : process.env.lastUsers > users ? "-" : "+",
        },
        icon: 5337
      },
    ],
  });

  process.env.lastUsers = users;
});

app.get("/stripe", async (req, res) => {
  const loadAllSubscriptions = (await loadAllStripeSubscriptions()).filter(
    (f) => f.status === "active" || f.status === "trialing",
  );
  const active = loadAllSubscriptions.filter((f) => f.status === "active");
  const mrr = active.reduce((acc, item) => {
    const amount = item.plan.amount / 100; // Convert from cents to dollars
    const interval = item.plan.interval;
    return acc + (interval === "month" ? amount : amount / 12);
  }, 0);

  res.status(200).json({
    frames: [
      {
        goalData: {
          start: 0,
          current: mrr,
          end: 10000,
          unit: process.env.lastMrr === 0 ? "" : process.env.lastMrr > mrr ? "-" : "+",
        },
        icon: 4989,
        duration: 5000,
      }
    ],
  });

  process.env.lastMrr = mrr;
});

app.get("/trials", async (req, res) => {
  const loadAllSubscriptions = (await loadAllStripeSubscriptions()).filter(
    (f) => f.status === "active" || f.status === "trialing",
  );
  const trialing = loadAllSubscriptions.filter((f) => f.status === "trialing" && f.cancel_at_period_end === false);

  res.status(200).json({
    frames: [
      {
        goalData: {
          start: 0,
          current: trialing.length,
          end: 1200,
          unit: process.env.lastTrials === 0 ? "" : process.env.lastTrials > trialing.length ? "-" : "+",
        },
        icon: 49835,
        duration: 5000,
      },
    ],
  });

  process.env.lastTrials = trialing.length;
});

app.get("/subs", async (req, res) => {
  const loadAllSubscriptions = (await loadAllStripeSubscriptions()).filter(
    (f) => f.status === "active" || f.status === "trialing",
  );
  const active = loadAllSubscriptions.filter((f) => f.status === "active");

  res.status(200).json({
    frames: [
      {
        goalData: {
          start: 0,
          current: active.length,
          end: 350,
          unit: process.env.lastSubs === 0 ? "" : process.env.lastSubs > active.length ? "-" : "+",
        },
        icon: 52106,
        duration: 5000,
      },
    ],
  });

  process.env.lastSubs = active.length;
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
          start: 0,
          current: +stars,
          end: 10000,
          unit: process.env.lastGitHubStars === 0 ? "" : process.env.lastGitHubStars > +stars ? "-" : "+",
        },
        icon: 14925,
      },
    ],
  });

  process.env.lastGitHubStars = +stars;
});

app.listen(process.env.PORT || 3005, () => {
  console.log("App is running on port 3005");
});
