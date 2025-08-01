const express = require("express");
const turf = require("@turf/turf");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const geojsonPath = path.join(__dirname, "../data/full_park_boundaries.geojson");
const rawGeojson = JSON.parse(fs.readFileSync(geojsonPath, "utf-8"));

const parks = {};
for (const feature of rawGeojson.features) {
  const { geometry, properties } = feature;

  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) continue;

  const code = (properties?.UnitCode || properties?.siteCode || "").toLowerCase();
  if (!code) continue;

  parks[code] = {
    name: properties?.ParkName || "Unnamed Park",
    boundary: geometry,
  };
}

router.post("/", (req, res) => {
  const images = req.body;
  if (!Array.isArray(images)) {
    return res.status(400).json({ error: "Expected an array of image objects" });
  }

  const result = {};
  for (const code in parks) result[code] = [];

  for (const image of images) {
    const { imageId, uri, lat, lon } = image;
    if (typeof lat !== "number" || typeof lon !== "number") continue;

    const pt = turf.point([lon, lat]);
    for (const [code, { name, boundary }] of Object.entries(parks)) {
      const poly = boundary.type === "MultiPolygon"
        ? turf.multiPolygon(boundary.coordinates)
        : turf.polygon(boundary.coordinates);

      if (turf.booleanPointInPolygon(pt, poly)) {
        result[code].push({ imageId, uri });
        break;
      }
    }
  }

  res.status(200).json(result);
});

module.exports = router;
