import fs from "node:fs";
import path from "node:path";

const sqlPath = path.join(process.cwd(), "scripts", "schema.sql");
process.stdout.write(fs.readFileSync(sqlPath, "utf8"));

