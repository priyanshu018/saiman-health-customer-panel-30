const dbUrl = process.argv[2];

async function main() {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { Client } = await import("pg");

  const sqlPath = process.argv[3] || path.join(__dirname, "..", "sql", "public-browse-policies.sql");

  if (!dbUrl) {
    console.error("Missing database URL argument.");
    process.exit(1);
  }

  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  const sql = fs.readFileSync(sqlPath, "utf8");

  await client.connect();
  await client.query(sql);
  await client.end();

  console.log(
    JSON.stringify(
      {
        ok: true,
        sqlPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
