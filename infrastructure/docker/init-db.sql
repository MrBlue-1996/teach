-- TopShelf Service LLC
-- PROPRIETARY AND CONFIDENTIAL
-- Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
--
-- Initial database setup for local development.
-- This file is executed once when the Postgres container first starts.

CREATE DATABASE topshelf;
CREATE USER topshelf WITH PASSWORD 'topshelf_dev';
GRANT ALL PRIVILEGES ON DATABASE topshelf TO topshelf;

\connect topshelf
GRANT ALL ON SCHEMA public TO topshelf;
