# Content Packs

This directory contains pack manifests and templates used to package teaching content.

## Files

- `template_content_pack.json` is the starting template.
- `content_pack_linux_v1.json` is a Linux-focused content pack.
- `content_pack_networkplus_v1.json` is a Network+ focused content pack.
- `content_pack_uncle_julios_v1.json` is the repo-native Uncle Julio's
  service-ready line cook training pack converted from the structured demo pack.
- `resource-packs/linux.json` and `resource-packs/uncle-julios.json` drive the
  editable resource catalogs used by the app shell, tools, machines, and
  ingredients pages.

## Indexing Notes

- Start here when you need pack-level metadata rather than authored lesson content.
- Use `content/` for domain content and `content-packs/` for distribution definitions.
- Resource-pack JSON files use `schemaVersion: "resource-pack.v1"` and keep
  sidebar labels, page copy, tools, machines, and ingredients in the pack file
  instead of in frontend TypeScript.
- Linux, Network+, and generic kitchen packs remain authored and validated, but
  the app currently exposes Uncle Julio's only. Database seeding follows that
  default: Uncle Julio's kitchen challenges seed as published, and the converted
  Uncle Julio's content pack seeds as a draft demo for admin review. Set
  `INCLUDE_HIDDEN_CONTENT_PACKS=1` when you intentionally want to seed every
  built pack.
