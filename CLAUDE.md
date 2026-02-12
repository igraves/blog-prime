# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hugo static site (blog) using the [Congo](https://github.com/jpanther/congo) theme, installed as a git submodule at `themes/congo`.

## Commands

- **Dev server:** `hugo server -D` (includes drafts)
- **Build:** `hugo` (outputs to `public/`)
- **New post:** `hugo new content posts/<slug>.md`

## Architecture

- `hugo.toml` — Site configuration (theme, baseURL, language, title)
- `content/posts/` — Blog posts in Markdown with TOML front matter (`+++`)
- `archetypes/default.md` — Template for `hugo new content`; new posts are created as drafts by default
- `themes/congo/` — Git submodule; do not edit directly. Override theme files by placing files with matching paths in the project root's `layouts/`, `assets/`, or `static/` directories.
- `public/` — Generated output (gitignored by convention; do not edit)

## Congo Theme

Configuration can be extended beyond `hugo.toml` by creating `config/_default/` with files like `params.toml`, `menus.toml`, and `languages.en.toml`. See Congo docs for available parameters (color schemes, layout modes, author info, etc.).
