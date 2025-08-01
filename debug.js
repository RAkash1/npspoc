const turf = require("@turf/turf");
// Sample point inside Acadia National Park
const testPoint = turf.point([-68.1725, 44.3385]);

// Loop through loaded parks
for (const code in parks) {
  const { name, boundary } = parks[code];
  const poly = turf[boundary.type === "MultiPolygon" ? "multiPolygon" : "polygon"](boundary.coordinates);
  if (turf.booleanPointInPolygon(testPoint, poly)) {
    console.log(`✅ Match: ${name}`);
  }
}
