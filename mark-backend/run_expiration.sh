#!/bin/bash
# Load env vars
source .env

# Run the SQL script
# Note: This assumes psql is available in the environment or run within the postgres container
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f src/governance/expiration/expire_marks.sql
