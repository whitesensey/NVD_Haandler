#!/bin/bash
set -o errexit
sudo -u postgres bash -c "psql -v ON_ERROR_STOP=1 <<-EOSQL
    CREATE ROLE alex LOGIN PASSWORD '1111';
    CREATE DATABASE nvd;
    GRANT ALL PRIVILEGES ON DATABASE nvd TO alex;
EOSQL"
