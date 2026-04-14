import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment before running.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sqlFile = process.argv[2] || "supabase/migrations/002_seed.sql";
// Normalize line endings
const sql = readFileSync(sqlFile, "utf-8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

// Join multi-line statements (lines not starting with INSERT/--/SELECT/PERFORM that follow an INSERT)
const rawLines = sql.split("\n");
const joinedLines = [];
for (const line of rawLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("--")) {
    joinedLines.push(line);
    continue;
  }
  if (trimmed.startsWith("INSERT INTO") || trimmed.startsWith("SELECT") || trimmed.startsWith("PERFORM")) {
    joinedLines.push(line);
  } else if (joinedLines.length > 0) {
    // Continuation of previous line
    joinedLines[joinedLines.length - 1] += " " + trimmed;
  }
}

// Extract INSERT statements
const insertLines = joinedLines
  .map((l) => l.trim())
  .filter((l) => l.startsWith("INSERT INTO"));

console.log(`Found ${insertLines.length} INSERT statements`);

// Group by table
const tableGroups = {};
for (const line of insertLines) {
  const match = line.match(/INSERT INTO (\w+)/);
  if (match) {
    const table = match[1];
    if (!tableGroups[table]) tableGroups[table] = [];
    tableGroups[table].push(line);
  }
}

for (const [table, inserts] of Object.entries(tableGroups)) {
  console.log(`  ${table}: ${inserts.length} rows`);
}

// Parse a single INSERT into an object
function parseInsert(stmt) {
  // Extract column names
  const colMatch = stmt.match(/\(([^)]+)\)\s*VALUES/i);
  if (!colMatch) return null;
  const cols = colMatch[1].split(",").map((c) => c.trim());

  // Extract everything after VALUES (
  const valStart = stmt.indexOf("VALUES");
  if (valStart === -1) return null;
  let rest = stmt.slice(valStart + 6).trim();
  // Remove leading ( and trailing );
  if (rest.startsWith("(")) rest = rest.slice(1);
  if (rest.endsWith(";")) rest = rest.slice(0, -1);
  if (rest.endsWith(")")) rest = rest.slice(0, -1);

  // Parse values handling quoted strings
  const values = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i];
    if (ch === "'" && !inQuote) {
      inQuote = true;
      current += ch;
      continue;
    }
    if (ch === "'" && inQuote) {
      if (i + 1 < rest.length && rest[i + 1] === "'") {
        current += "''";
        i++;
        continue;
      }
      inQuote = false;
      current += ch;
      continue;
    }
    if (ch === "," && !inQuote) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) values.push(current.trim());

  if (values.length !== cols.length) {
    console.error(`  Column/value mismatch: ${cols.length} cols vs ${values.length} vals`);
    console.error(`  Cols: ${cols.join(", ")}`);
    console.error(`  First val: ${values[0]}, Last val: ${values[values.length - 1]}`);
    return null;
  }

  const obj = {};
  for (let i = 0; i < cols.length; i++) {
    let val = values[i];
    if (!val || val === "NULL") {
      obj[cols[i]] = null;
    } else if (val.startsWith("'") && val.endsWith("'")) {
      obj[cols[i]] = val.slice(1, -1).replace(/''/g, "'");
    } else if (val.match(/^-?\d+(\.\d+)?$/)) {
      obj[cols[i]] = Number(val);
    } else {
      obj[cols[i]] = val;
    }
  }
  return obj;
}

// Insert order (respecting FK constraints)
const order = [
  "exploitations",
  "suppliers",
  "products",
  "regions",
  "zones",
  "sites",
  "operators",
  "movements",
  "stock_levels",
  "treatments",
  "treatment_products",
  "alerts",
];

for (const table of order) {
  const inserts = tableGroups[table];
  if (!inserts) continue;

  const rows = inserts.map((stmt) => parseInsert(stmt)).filter(Boolean);
  console.log(`\nInserting ${rows.length} rows into ${table}...`);

  if (rows.length === 0) {
    console.log("  Skipped (no parseable rows)");
    continue;
  }

  const BATCH = 200;
  let total = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).insert(batch);

    if (error) {
      console.error(`\n  Batch error: ${error.message}`);
      // Try smaller batches
      for (const row of batch) {
        const { error: e2 } = await supabase.from(table).insert(row);
        if (e2) {
          errors++;
          if (errors <= 3) console.error(`  Row error: ${e2.message}`);
        } else {
          total++;
        }
      }
    } else {
      total += batch.length;
    }
    process.stdout.write(`\r  ${table}: ${total}/${rows.length} (${errors} errors)`);
  }
  console.log(`\r  ${table}: ${total}/${rows.length} ✓${errors ? ` (${errors} errors)` : ""}`);
}

// Recalculate stock levels
const recalcLines = joinedLines
  .map((l) => l.trim())
  .filter((l) => l.startsWith("PERFORM recalc_stock") || l.startsWith("SELECT recalc_stock"));

if (recalcLines.length > 0) {
  console.log(`\nRecalculating stock for ${recalcLines.length} products...`);
  let done = 0;
  for (const line of recalcLines) {
    const match = line.match(/'([^']+)'/);
    if (match) {
      const { error } = await supabase.rpc("recalc_stock", { p_product_id: match[1] });
      if (error && done === 0) console.error(`  recalc error: ${error.message}`);
      else done++;
    }
  }
  console.log(`  Recalculated ${done} products ✓`);
}

console.log("\n🎉 Seed complete!");
