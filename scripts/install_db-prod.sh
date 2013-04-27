#usage: ./install_db-prod.sh hostname port_nr

PSQL="psql -h $1 -p $2"

#must have user linkdump and db linkdump on host

$PSQL -U linkdump linkdump_prod -f database/20_api.sql
