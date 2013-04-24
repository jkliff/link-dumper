PSQL="psql -h pg_local_dev -p 5432"

cat <<EOF | $PSQL -U postgres
select pg_terminate_backend(procpid)
from pg_stat_activity 
where datname = 'linkdump_dev'
EOF

$PSQL -U postgres -f database/initdb.sql
$PSQL -U linkdump_dev linkdump_dev -f database/schema.sql
