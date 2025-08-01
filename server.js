const express = require("express");
const bodyParser = require("body-parser");
const matchImagesRouter = require("./routes/matchImages");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use("/match-images", matchImagesRouter);

app.get("/", (req, res) => {
  res.send("🗺️ NPS GeoAPI is running");
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
