PSQL="psql -h pg_local_dev -p 5432"

$PSQL -U postgres -f database/initdb.sql
$PSQL -U linkdump_dev linkdump_dev -f database/schema.sql
