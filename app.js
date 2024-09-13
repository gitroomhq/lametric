const express = require("express");
const app = express();

app.get("/", async (req, res) => {
  const data = await (
    await fetch("https://api.github.com/repos/gitroomhq/postiz-app")
  ).json();
  return res.status(200).json({
    // priority: "critical",
    // icon_type: "alert",
    // lifeTime: 5000,
    // model: {
      frames: [
        {
          icon: "306",
          text: data.stargazers_count,
        },
      ],
    //   sound: {
    //     category: "notifications",
    //     id: "cat",
    //     repeat: 1,
    //   },
    //   cycles: 1,
    // },
  });
});

app.listen(process.env.PORT || 3005, () => {
  console.log("App is running on port 3005");
});
