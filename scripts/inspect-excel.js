const XLSX = require("xlsx");
const workbook = XLSX.readFile("./data/KLeague_Keepers_2025.xlsx");

// Check 2025_Draft_team for historical info
const draft2025Sheet = workbook.Sheets["2025_Draft_team"];
const draft2025Data = XLSX.utils.sheet_to_json(draft2025Sheet);

console.log("=== 2025 Draft Sheet ===");
console.log("Total rows:", draft2025Data.length);
console.log("Columns:", Object.keys(draft2025Data[0] || {}));

// See non-empty rows
const nonEmpty = draft2025Data.filter(r => r.PlayerMatch && r.PlayerMatch !== "#N/A");
console.log("Non-empty PlayerMatch rows:", nonEmpty.length);

if (nonEmpty.length > 0) {
  console.log("\nSample row:");
  console.log(nonEmpty[0]);
}

// Check transactions for trade info
const txSheet = workbook.Sheets["2024_Transactions"];
const txData = XLSX.utils.sheet_to_json(txSheet);

console.log("\n=== Transactions Analysis ===");
console.log("Total transactions:", txData.length);

// Group by type
const byType = {};
txData.forEach(t => {
  const type = t.Type || "unknown";
  byType[type] = (byType[type] || 0) + 1;
});
console.log("By type:", byType);

// Sample signed transactions (FA pickups)
const signed = txData.filter(t => t.Type === "Signed");
console.log("\n=== FA Signings (first 5) ===");
signed.slice(0, 5).forEach(t => {
  console.log(`${t.First} ${t.Last} | Team: ${t.Team} | Date: ${t.Date}`);
});
