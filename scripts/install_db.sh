PSQL="psql -h pg_local_dev -p 5432"

cat <<EOF | $PSQL -U postgres
select pg_terminate_backend(procpid)
from pg_stat_activity
where datname = 'linkdump_dev'
EOF


FILES="database/20_api.sql"
if [[ $1 == '--data' ]] ; then
    FILES="database/10_data.sql $FILES";
    $PSQL -U postgres -f database/initdb.sql
fi

cat $FILES | $PSQL -U linkdump_dev linkdump_dev
