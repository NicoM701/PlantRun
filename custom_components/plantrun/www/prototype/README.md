# PlantRun UI prototype

This folder contains throwaway UI work. It is not production PlantRun code and does not connect to Home Assistant or persist data.

From the repository root, run:

```powershell
python -m http.server 8766 --bind 127.0.0.1 --directory custom_components/plantrun/www/prototype
```

For the complete review, open:

```text
http://127.0.0.1:8766/plantrun-review-prototype.html?view=map&variant=A&lang=de&theme=dark
```

The review map links back to the existing tent, plant, and creation prototypes.
It also covers every remaining product surface:

- journal and quick capture;
- stage management;
- sensor assignment;
- strain lookup and manual fallback;
- plant editing and image ownership;
- harvest and run completion;
- archive, completed-run reading, and comparison;
- settings;
- empty, loading, partial, and error states;
- the Home Assistant-style Lovelace companion;
- later door-contact and follow-up ideas.

Every review page has structural variants `A`, `B`, and `C`. Use the floating
arrows or change `variant=` in the URL. Start with
[REVIEW_CHECKLIST.md](./REVIEW_CHECKLIST.md) when recording feedback.

The first journal set and its form-heavy replacement were rejected. The current
journal revision removes plant cards, action-chip rows, the oversized editor,
and the permanent sensor grid. It compares `A` Verlauf + Editor, `B`
Direkteingabe, and `C` Verlauf zuerst. `C` opens its compact editor in a side
drawer only when requested and is the selected journal direction. `A` and `B`
are retired. Stage management A is selected. Its lifecycle rail
and plan rows now select any target stage directly; the separate next-stage
dropdown is gone, and the drag handles reorder the displayed plan.

The Strain finder was rebuilt as live search rather than a fixed card picker.
Its current variants are `A` Treffer + Vorschau, `B` Inline-Vorschau, and `C`
Suchfokus. They use a broader disposable catalog to test live filtering and
manual fallback. Production must extend the authenticated SeedFinder adapter for
search across all Breeders instead of shipping that catalog.

Then open the tent overview:

```text
http://127.0.0.1:8766/plantrun-ui-prototype.html?variant=A&view=overview&lang=de&theme=dark
```

The floating bottom control switches among the three overview structures:

- `A`: Photo focus
- `B`: Garden workspace
- `C`: Daily garden

Open the selected plant-workspace direction:

```text
http://127.0.0.1:8766/plantrun-ui-prototype.html?variant=A&detail=B&view=plant&plant=tangerine&metric=moisture&lang=de&theme=dark&rev=13
```

The plant workspace also has three comparison states. `detail=B`, Clean
development, revision 13 is the current working direction. Use the environment
rows to switch the main Recorder chart between soil moisture, temperature,
humidity, and light.

Open the selected new-run flow:

```text
http://127.0.0.1:8766/plantrun-ui-prototype.html?variant=A&detail=B&view=create&create=A&step=1&lang=de&theme=dark&rev=15
```

`create=A` is selected. It creates one plant and one run in three guided steps.
To add the next plant, start the flow again. The retired one-page and two-run
variants are no longer selectable.

The first step tests breeder and Strain search, result selection, no-result
handling, and manual fallback. Because this file is standalone, its broader
catalog is clearly marked as sample data. The HACS implementation must call the
existing authenticated `plantrun/search_cultivar` websocket instead of shipping
that catalog. Plant sensors may remain unassigned, and every imported or manual
value remains editable.

Dark mode is the default. Add `&theme=light` to the URL or use the sun button to inspect the light version. The two cultivar images are temporary breeder references. A real user photo would replace the displayed breeder image once one exists.

The left and right arrow keys switch variants on comparison pages unless an
input is focused. The selected creation flow has no variant switcher. The DE/EN
control changes language. Entries, creation results, sensor choices, and other
changes exist only in memory and disappear after a reload.
