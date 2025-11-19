# Cron Job Setup for Mark Platform Expiration Engine

To ensure the economic health of the platform, we need to run the expiration logic periodically (e.g., annually or daily).

## 1. Locate the SQL Script
The logic is defined in:
`src/governance/expiration/expire_marks.sql`

## 2. Create a Shell Script
Create a file named `run_expiration.sh`:

```bash
#!/bin/bash
# Load env vars
source .env

# Run the SQL script
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f src/governance/expiration/expire_marks.sql
```

Make it executable:
`chmod +x run_expiration.sh`

## 3. Configure Crontab
Open crontab:
`crontab -e`

Add the following line to run it annually on Dec 31st at 23:59:
`59 23 31 12 * /path/to/mark-backend/run_expiration.sh >> /var/log/mark_expiration.log 2>&1`

Or daily check:
`0 0 * * * /path/to/mark-backend/run_expiration.sh >> /var/log/mark_expiration.log 2>&1`
