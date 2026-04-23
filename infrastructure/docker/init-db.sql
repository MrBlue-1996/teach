-- TopShelf Service LLC
-- PROPRIETARY AND CONFIDENTIAL
-- Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
--
-- Initial database setup for local development.
-- This file is executed once when the Postgres container first starts.
--
-- NOTE: POSTGRES_DB, POSTGRES_USER, and POSTGRES_PASSWORD env vars in
-- docker-compose.yml already create the database and user. This script
-- only handles grants that the env-var path does not apply automatically
-- (public schema access changed in PostgreSQL 15+).

\connect topshelf
GRANT ALL ON SCHEMA public TO topshelf;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO topshelf;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO topshelf;
