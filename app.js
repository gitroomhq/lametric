require("@dotenvx/dotenvx").config();
const express = require("express");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_KEY);
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

let lastGitHubStars = 0;

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

let lastMrr = 0;
let lastSubs = 0;
let lastTrials = 0;
let lastUsers = 0;

app.get("/users", async (req, res) => {
  const users = await loadAllUsers();
  res.status(200).json({
    frames: [
      {
        goalData: {
          start: lastUsers,
          current: users,
          end: 10000,
          unit: lastUsers === 0 || lastUsers === users ? "" : lastUsers > users ? "-" : "+",
        },
        icon: 5337
      },
    ],
  });

  lastUsers = users;
});

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
        goalData: {
          start: lastMrr,
          current: mrr,
          end: 10000,
          unit: lastMrr === 0 || lastMrr === mrr ? "" : lastMrr > mrr ? "-" : "+",
        },
        icon: 4989,
        duration: 5000,
      },
      {
        goalData: {
          start: lastSubs,
          current: active.length,
          end: 350,
          unit: lastSubs === 0 || lastSubs === active.length ? "" : lastSubs > active.length ? "-" : "+",
        },
        icon: 52106,
        duration: 5000,
      },
      {
        goalData: {
          start: lastTrials,
          current: trialing.length,
          end: 1200,
          unit: lastTrials === 0 || lastTrials === trialing.length ? "" : lastTrials > trialing.length ? "-" : "+",
        },
        icon: 49835,
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
          unit: lastGitHubStars === 0 || lastGitHubStars === +stars ? "" : lastGitHubStars > +stars ? "-" : "+",
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
