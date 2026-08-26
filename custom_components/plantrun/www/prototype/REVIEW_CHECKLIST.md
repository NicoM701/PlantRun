# PlantRun prototype review

Start at:

```text
http://127.0.0.1:8766/plantrun-review-prototype.html?view=map&variant=A&lang=de&theme=dark
```

Use the arrows at the bottom to switch A, B, and C. Feedback can mix parts from
different variants.

All PlantRun review screens now share the selected rounded shape system: 24 px
outer work areas, 18 px grouped content, and 12 px controls. Rows and tables stay
flat inside those containers. Flag any screen that still looks like a separate
square-box application.

## Already prepared

- Tent overview: Does Photo focus still work as the opening view?
- Plant workspace: Keep Clean development revision 13 or change anything?
- Creation flow: Guided A is selected. Each pass creates one plant and one run;
  breeder + Strain search leads, with a complete manual fallback.
- Journal: `Verlauf zuerst` C is selected. History opens first and `Neuer
  Eintrag` reveals the compact side editor.

## Remaining flows

1. Stages: Structure A is selected. Check the revised workflow: click any target
   phase, review the switch time, confirm it, and drag phase handles to reorder
   the display without limiting transitions.
2. Sensors: Which version best explains shared tent values and plant ownership?
3. Strain: Compare A `Treffer + Vorschau`, B `Inline-Vorschau`, and C
   `Suchfokus`. Does typing feel like a live web search, is the selected result
   preview clear, and is manual entry still easy to find?
4. Editing: Which image and base-data treatment feels least cumbersome?
5. Harvest: Should completion be guided, one page, or a focused milestone?
6. Archive: Image gallery, data table, or comparison-first selection?
7. Completed run: Which version makes old development worth revisiting?
8. Comparison: Side by side, overlaid development, or differences only?
9. Settings: Which structure stays understandable without becoming an admin page?
10. System states: Which failures need more or less explanation?
11. Lovelace: Tent glance, selected plant, or action-first card?
12. Later ideas: Which parts of the door prompt and follow-up flow should survive?

Also note anything that still looks generated, uses too many boxes, wastes space,
or puts the wrong information first.
