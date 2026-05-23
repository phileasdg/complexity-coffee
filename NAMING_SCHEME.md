# Complexity Coffee Website File Naming Conventions

This document outlines the naming scheme used across the Complexity Coffee website to keep files, IDs, and assets organized.

## Events

Each event receives a unique ID structured as `[type]-[series]-[number]`.

### Event Types:
- `gt` : Guest Talk
- `w`  : Workshop
- `ct` : Community Talks
- `nr` : Nascent Research

### Examples:
- `w-2-7` : The 7th event overall, which is the 2nd Workshop.
- `gt-3-5` : The 5th event overall, which is the 3rd Guest Talk.

## Images

### Event Images
Event thumbnail images should be placed in `img/events/[type]/` and must exactly match the event ID they correspond to, preserving the original extension (e.g., `.jpeg`, `.png`, `.jpg`).

- **Correct:** `img/events/workshops/w-2-7.jpeg`
- **Incorrect:** `img/events/workshops/ms4.jpeg`

### People Images
Speaker and team member profile images should be placed in `img/people/` or `img/team/` and be named using the person's first and last name, all lowercase, separated by underscores.

- **Correct:** `img/people/sara_arango_franco.JPG`
- **Incorrect:** `img/people/Sara.JPG`
