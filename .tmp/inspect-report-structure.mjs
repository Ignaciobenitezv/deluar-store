import fs from "fs";
const report = JSON.parse(fs.readFileSync("reports/tiendanube-import-write-20260810-111823.json", "utf8"));
console.log("summary keys", Object.keys(report.summary ?? {}));
console.dir(report.summary, { depth: 3 });
console.log("categories keys", Object.keys(report.categories ?? {}));
console.dir(report.categories, { depth: 3 });
console.log("products keys", Object.keys(report.products ?? {}));
console.dir({
  createCount: report.products?.create?.length,
  updateCount: report.products?.update?.length,
  blockedCount: report.products?.blocked?.length,
  skipCount: report.products?.skip?.length,
  firstCreate: report.products?.create?.[0],
  firstUpdate: report.products?.update?.[0],
}, { depth: 5 });
