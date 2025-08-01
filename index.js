const express = require("express");
const bodyParser = require("body-parser");
const turf = require("@turf/turf");
const fs = require("fs");

const app = express();
const port = 3000;

// Load and clean the boundaries data
const rawGeojson = JSON.parse(fs.readFileSync("./full_park_boundaries.geojson", "utf-8"));
const parks = {};

// Prepare park boundaries with proper validation
for (const feature of rawGeojson.features) {
  const { geometry, properties } = feature;

  if (!geometry || !geometry.coordinates || !geometry.type) {
    console.warn(`⚠️ Skipping ${properties?.ParkName || "unknown"}: No valid geometry`);
    continue;
  }

  if (!["Polygon", "MultiPolygon"].includes(geometry.type)) {
    console.warn(`⚠️ Skipping ${properties?.ParkName || "unknown"}: Unsupported geometry type ${geometry.type}`);
    continue;
  }

  const code = (properties?.UnitCode || properties?.siteCode || "").toLowerCase();
  if (!code) {
    console.warn(`⚠️ Skipping a park with no UnitCode/siteCode`);
    continue;
  }

  parks[code] = {
    name: properties?.ParkName || "Unnamed Park",
    boundary: geometry,
  };
}

app.use(bodyParser.json());

app.post("/match-images", (req, res) => {
  const images = req.body; // [{ imageId, uri, lat, lon }]
  if (!Array.isArray(images)) {
    return res.status(400).json({ error: "Invalid input format. Expected an array of images." });
  }

  console.log(`📥 Received ${images.length} images for processing`);
  const result = {};

  for (const code in parks) {
    result[code] = [];
  }

  for (const image of images) {
    const { imageId, uri, lat, lon } = image;

    if (typeof lat !== "number" || typeof lon !== "number") {
      console.warn(`⚠️ Skipping image ${imageId}: Invalid lat/lon`);
      continue;
    }

    const point = turf.point([lon, lat]);
    let matched = false;

    for (const [code, { name, boundary }] of Object.entries(parks)) {
      let polygon;

      try {
        polygon = turf[boundary.type === "MultiPolygon" ? "multiPolygon" : "polygon"](boundary.coordinates);
      } catch (err) {
        console.warn(`⚠️ Failed to create polygon for ${name}: ${err.message}`);
        continue;
      }

      if (turf.booleanPointInPolygon(point, polygon)) {
        console.log(`✅ Image ${imageId} matches park ${code} (${name})`);
        result[code].push({ imageId, uri });
        matched = true;
        break;
      }
    }

    if (!matched) {
      console.log(`🚫 No match found for image ${imageId} at [${lat}, ${lon}]`);
    }
  }

  res.json(result);
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
