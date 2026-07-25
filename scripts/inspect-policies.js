const url = process.argv[2];

if (!url) {
  console.error("Missing database URL argument.");
  process.exit(1);
}

const tables = [
  "lab_test_approvals",
  "pharmacy_approvals",
  "hospital_service_approvals",
  "ctmri_service_approvals",
  "rental_equipment_approvals",
  "support_tickets",
  "support_ticket_messages",
];

async function main() {
  const { Client } = await import("pg");
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const rls = await client.query(
    `
      select
        n.nspname as schema,
        c.relname as table_name,
        c.relrowsecurity,
        c.relforcerowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = any($1)
      order by c.relname
    `,
    [tables],
  );

  const policies = await client.query(
    `
      select
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      from pg_policies
      where schemaname = 'public'
        and tablename = any($1)
      order by tablename, policyname
    `,
    [tables],
  );

  console.log(JSON.stringify({ rls: rls.rows, policies: policies.rows }, null, 2));
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
