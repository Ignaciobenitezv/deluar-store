import fs from "fs";
const report = JSON.parse(fs.readFileSync("reports/tiendanube-import-write-20260810-111823.json", "utf8"));
console.log(Object.keys(report));
console.log("summary", {
  productsProcessed: report.productsProcessed,
  productsCreated: report.productsCreated,
  productsUpdated: report.productsUpdated,
  placeholderImagesPatched: report.placeholderImagesPatched,
  placeholderImageAssetRef: report.placeholderImageAssetRef,
  writesPerformed: report.writesPerformed,
});
console.log("first product result keys", Object.keys(report.productResults?.[0] ?? {}));
console.dir(report.productResults?.[0], { depth: 4 });
