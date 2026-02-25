# PlantRun

A Home Assistant custom integration to track complete plant cultivation runs from start to finish.

## Features
- Full run lifecycle management
- Record multiple phases (Seedling, Vegetative, Flower, etc.)
- Keep notes/events timestamped inside a run log
- Fetch and stash cultivar profiles from SeedFinder
- Bind sensors or cameras to follow the active run context

## Installation
Add this repository to HACS as a Custom Repository (Integration type) and download it, then restart Home Assistant.

## Usage
Add "PlantRun" via the Home Assistant Integrations page. Multiple summary sensors will appear. Control runs via the `plantrun.*` services under Developer Tools.
