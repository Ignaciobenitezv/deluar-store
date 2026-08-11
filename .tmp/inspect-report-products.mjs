import fs from "fs";
const report = JSON.parse(fs.readFileSync("reports/tiendanube-import-write-20260810-111823.json", "utf8"));
console.log("first product keys", Object.keys(report.products?.[0] ?? {}));
console.dir(report.products?.slice(0,5), { depth: 5 });
