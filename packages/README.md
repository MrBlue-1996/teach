# Packages

This directory contains reusable platform packages grouped by responsibility.

## Runtime Packages

- [api-server](api-server) for the platform API service.
- [auth](auth) for authentication logic.
- [billing](billing) for billing logic.
- [content-authoring](content-authoring) for content creation pipelines.
- [shared](shared) for shared types, schemas, constants, and utilities.
- [ui](ui) for reusable interface components.

## Tooling And Support Packages

- [cli](cli) for command-line tooling.
- [config](config) for shared configuration.
- [testkit](testkit) and [tests](tests) for shared testing support.
- [observability](observability), [governance](governance), and [retrieval](retrieval) for supporting platform capabilities.

## Reserved Or Incubating Areas

- [\_future](_future) is reserved for work not yet promoted into the active package set.

## Indexing Notes

- Start in `src/index.ts` for each package's public API.
- Prefer packages over implementations for code intended to be reused across the platform.
