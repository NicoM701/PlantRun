# PlantRun product discovery

## Status

Discovery is active. This document records evidence, settled product direction, and ideas that should survive the interview. It is not an implementation plan.

The acceptance cultivation cycle began on August 25, 2026. The earlier
Tangerine Dream Auto and Diesel Auto scenario below was prototype input, not a
confirmed description of the new live cycle. Capture the current plants and
events before replacing the installed integration.

## Why the current product failed

PlantRun has repeatedly changed its interface without settling the daily habit it must support. The current product is better at maintaining run metadata than recording or understanding what happened around the plants.

The existing Home Assistant integration work remains useful, especially sensor bindings, Recorder history, cultivar lookup, and storage conventions. The current frontend and stored test data do not need to survive the rebuild.

## Observed record history

The user's RemNote history contains dated cultivation entries across several years. Earlier entries contain much more operational detail than recent entries.

Observed entry types include:

- planting named varieties;
- watering multiple plants with a quantity and named product;
- spraying for pests and defoliating;
- changing the light schedule to begin flowering;
- recording temperature and humidity conditions;
- noting plant appearance, smell, growth, and water demand;
- comparing plants and their positions under different lights;
- inspecting trichomes and using the result to plan darkness and harvest;
- beginning a darkness period;
- harvesting and hanging plants to dry;
- removing dried plants and checking remaining moisture.

The records mix quick actions, observations, measurements, plans, and lifecycle changes. Some entries apply to the whole tent, some to several plants, and some to one named variety or plant.

## Settled direction

- The tent is the user's main mental starting point.
- A tent persists across an unlimited number of growing records. PlantRun must allow any combination of plant lifecycle stages inside it without imposing a synchronized tent stage.
- A tent contains individual plants whose variety, condition, care, appearance, and lifecycle may need separate tracking.
- One run always records exactly one plant. A tent may contain any number of overlapping runs at unrelated stages.
- Each run owns its stage history and estimated harvest window. The tent has no stage of its own.
- A run becomes a durable historical record when cultivation finishes. Finishing never deletes the run.
- Archiving changes where a run appears but preserves its stages, Journal Entries, sensor bindings, images, sourced Strain data, and harvest details.
- A user may permanently delete a run from a separate danger area. PlantRun must explain that the action cannot be undone, identify the PlantRun-owned data that will disappear, require the exact run name as confirmation, and use an explicit `Delete permanently` action. Home Assistant Recorder data remains owned by Home Assistant and is not deleted with the run.
- Harvest ends the cultivation sensor window. Later drying or curing entries may remain attached as post-harvest history without extending that window.
- Completed runs remain editable. PlantRun should not impose a read-only archive state.
- Journal entries start as free text and may carry optional structured details such as targets, quantities, products, measurements, or follow-up plans.
- Existing Home Assistant sensor values and Recorder history are the strongest reason for PlantRun to live in Home Assistant.
- The primary access point should work wherever the user's Home Assistant is available. Desktop is the current common capture device.
- The product should eventually be publishable through HACS, but the first success test is whether its owner uses it for a real cultivation cycle.
- The first version is cannabis-capable and may use cannabis-specific data providers. Its visual language should still look like a refined plant application rather than explicit cannabis branding.
- Existing PlantRun records may be overwritten. The rejected UI and its data model must not constrain the rebuild.
- Harvest estimates belong to individual plants. Plants in the same tent may have different estimates and finish at different times.
- The initial fast journal actions are Water, Change stage, Inspect, and Harvest. General free text remains equally prominent.
- Water entries must work without a measured amount. Quantity and product are optional details, and a qualitative entry such as lightly sprinkling a seed is complete on its own.
- PlantRun should show phase-specific target ranges beside sensor values and Recorder history. Every assessment must pair color with text, expose the target range, and remain editable rather than presenting a hidden universal rule.
- New runs start with Seedling, Vegetative, Flowering, and Harvested selected. PlantRun also presents other available stages and permits custom stages.
- The owner's established method for automatic plants is to sow each dry seed directly from the package into soil in its final container. PlantRun must support Germination as the initial Stage and must not require a separate germination workflow.
- The first usable version should provide a full sidebar application and a compact Lovelace companion card. Other entry points can follow later.
- The current real cultivation cycle is the acceptance run. The user intends to record it in the rebuilt PlantRun and refine the product from that use.

## Current Home Assistant setup

The existing manual tent dashboard already separates shared conditions from plant-specific readings.

Tent-level information includes:

- average temperature derived from multiple temperature sensors;
- average relative humidity derived from multiple humidity sensors;
- illuminance in lux;
- grow-light state;
- tent-door contact state;
- accumulated energy use.

Plant-level information currently comes from two soil sensors:

- soil moisture for each plant;
- temperature readings;
- conductivity for one plant sensor;
- another humidity reading.

PlantRun should use the Home Assistant aggregate entities the user already created for the primary tent temperature and humidity. Individual source entities may remain available for diagnosis without competing with the aggregate on the opening view.

## First real test scenario

The next cultivation starts on August 21, 2026, with two independent runs in the same tent:

- Tangerine Dream Auto, breeder Zamnesia;
- Diesel Auto, breeder Royal Queen Seeds.

Both runs use an 18/6 light schedule throughout. Soil-sensor assignment is not decided yet.

Official breeder timing for the prototype:

- Tangerine Dream Autoflower: 70 to 77 days from seed to harvest, described by Zamnesia as about 11 weeks after germination;
- Diesel Auto: 90 to 95 days after germination, with a separate flowering duration of 55 to 65 days.

PlantRun must preserve a duration's range, meaning, start event, source, and original wording. It must not treat every provider number as flowering time or reduce a range to one midpoint.

The user will use PlantRun as the only cultivation journal during this test and refine the product from real use.

## Prototype decision

Before rebuilding the HACS integration, create a disposable read-only HTML prototype to answer the UI design question. It should contain three structurally different variants that use the first real test scenario and can be switched in place.

The three revised prototype directions are Photo focus, Garden workspace, and Daily garden. The prototype is German-first and includes English from the start through a separate translation catalog rather than embedded labels.

The interface includes a visible DE/EN flag switch. Language support is part of the prototype rather than a later retrofit.

Desktop controls the first design. The same prototype must remain usable at phone width without reducing the mobile experience to one long stack.

The prototype should feel organized and clean while retaining substantial cultivation detail. Original plant photography may be generated where real images are unavailable.

### First visual review

The first three variants were rejected on August 20, 2026 because they looked AI-generated. The problem was the overall visual grammar, not one color or component. It combined oversized rounded panels, pill controls, marketing-style headlines, soft decorative charts, excessive empty space, and generated plant photography presented as if it were current run evidence.

The next pass must be practical and specific to PlantRun:

- prefer flat lists, tables, definition rows, and explicit timestamps;
- use ordinary interface typography instead of large editorial headlines;
- show the hierarchy through borders, alignment, and spacing rather than nested cards;
- avoid decorative charts and invented status copy;
- do not show a mature generated plant as the photo of a run that starts today;
- reserve photography for real photos the user adds, with an honest empty state beforehand;
- keep controls rectangular and compact where that suits the Home Assistant context.

The generated prototype images remain disposable assets and are not approved product art.

### Approved visual contract

The user approved the following contract on August 20, 2026:

- the full PlantRun dashboard has its own design and does not imitate Home Assistant;
- the future compact Lovelace card follows Home Assistant's native visual language;
- plants dominate the opening view;
- dark mode is the default, with an in-app light switch and comfortable green-black surfaces;
- desktop uses a narrow navigation rail or a transferred desktop equivalent;
- mobile uses the visual language of the supplied plant-care references, including photo-led cards and bottom navigation;
- a fetched breeder image represents the cultivar until the user adds a real photo;
- once a user photo exists, it becomes the displayed plant image while the breeder image remains stored and deletable;
- the opening view shows only status, attention, and the next estimate; detailed sensor and journal data belongs in the plant view;
- every plant opens into its own full workspace;
- the direct card action defaults to creating a journal entry.

The disposable prototype tests three structures rather than three color skins:

- Photo focus gives both runs equal, image-led cards;
- Garden workspace makes one selected run dominant and keeps the other close for switching;
- Daily garden pairs a plant gallery with today's work feed.

The locally cached Zamnesia and Royal Queen Seeds product images are prototype references. They are not approved distributable HACS assets.

### Photo focus review

The user accepted the information order of Photo focus but rejected its first visual treatment. Large enclosed cards, bright app-green, dark elevated surfaces, and dashboard-style sensor pills still looked AI-generated and did not match the supplied references.

Photo focus therefore uses the reference's open composition more literally. Plant columns sit directly on the page, sensor values share one restrained strip, details use rules instead of nested tiles, and the light design is the source for the darker adaptation. The default dark theme uses muted botanical green rather than neon lime.

### Plant workspace review

The user selected the `Clean development` plant workspace as the working direction on August 20, 2026. The accepted revision is `detail=B`, revision 13 in the disposable prototype.

The workspace puts recorded facts and sensor development ahead of prose notes:

- the breeder image and plant identity anchor the top of the page;
- one lifecycle line shows the current day, current stage, future stages, and estimated harvest window;
- one large Recorder chart explains the selected metric with its current value, change, target range, latest related event, minimum, average, and maximum;
- the environment panel switches the chart between soil moisture, temperature, humidity, and light;
- segmented indicators use green or amber together with status text, never color alone;
- permanent facts form one aligned strip beneath the chart rather than a shorter unmatched side column;
- the latest journal entry stays below the visual development data.

The chart must earn its space. A line without a target band, event context, summary values, or comparison controls was rejected as too empty and uninformative.

### Cross-screen shape language

The review on August 21, 2026 exposed a mismatch between the selected tent,
plant, and creation directions and the remaining review deck. The selected
screens use rounded outer working surfaces, while the deck still used joined,
square table boxes.

The disposable prototypes now share one shape system:

- major panels and visual work areas use a 24 px radius;
- grouped cards and image containers use an 18 px radius;
- buttons, fields, compact controls, and small images use a 12 px radius;
- rows, timelines, tables, and metric divisions stay flat inside those rounded
  containers instead of becoming separate floating cards.

Variants may disagree about layout and information order. They must not look as
if they belong to different applications. The Lovelace preview remains an
exception and follows Home Assistant card styling.

### New-run flow review

On August 21, 2026, the guided `create=A` flow was selected. The one-page and
two-run alternatives are retired. Opening the flow always creates exactly one
plant and one independent run. A second plant is created by starting the same
flow again; there is no batch creation path.

The selected flow has three steps:

1. search for a breeder and Strain, or enter both manually; set the optional
   nickname and planting date;
2. review or change the default phases and optionally assign plant and shared
   tent sensors;
3. review and create the single run.

The production build must reuse the authenticated Home Assistant websocket
contract `plantrun/search_cultivar` and its existing SeedFinder matching rather
than shipping a fixed strain list. The disposable HTML contains a broader sample
catalog only so the search, selection, empty-result, and manual-fallback
interactions can be reviewed without Home Assistant. Those entries are not a
production strain database.

The selected result may provide a breeder image and sourced duration range. The
image remains the visual fallback until the user adds a plant photo. Duration
and the derived harvest window remain editable. Missing results, missing timing
data, or provider failure never block creation.

### Strain-finder review

The card-style Strain finder was rejected on August 21, 2026. The desired
interaction is closer to a web search: one prominent query, live results while
typing, an optional Breeder filter, and a detailed preview of the highlighted
result. Selecting a result only changes the preview. PlantRun imports the data
only after explicit confirmation.

The replacement prototype compares three search-led structures:

- variant A keeps a Google-like result list beside a persistent detail preview;
- variant B expands the selected preview inside the result stream;
- variant C leaves the result list unobstructed and opens the preview in a side
  drawer.

The result list is not a fixed production catalog. It is disposable sample data
used to test typing, filtering, selection, no-result handling, and manual
fallback. The current authenticated `plantrun/search_cultivar` websocket already
returns up to five scored SeedFinder matches, but it requires a Breeder before
searching. Supporting the desired search across all Breeders therefore needs a
backend/provider extension or index. The production preview must distinguish
fields returned by the search from detail-page enrichment and must never invent
an image or duration meaning.

### Journal review

The first journal alternatives were rejected on August 21, 2026. Their main
problems were not missing decoration but weak task flow: the capture control was
too small, the table text was difficult to scan, filters mixed plant and event
type into one strip, panel padding left large dead areas, and the relationship
between the entry, its timestamp, and sensor context was unclear.

The following form-heavy revision was also rejected. It exposed plant cards,
five action chips, a large textarea, separate date and time fields, and all
attached sensor values at once. The result felt elementary, badly spaced, and
overloaded. This establishes a stronger rule: quick capture must not resemble a
setup form. Plant, event type, and occurrence time are compact metadata controls
around the text entry. Sensor context is attached by default but collapsed until
the user asks to inspect it.

The replacement prototypes share one capture contract:

1. choose exactly one plant;
2. choose an event type or leave the entry as free text;
3. write what happened;
4. review the editable occurrence date and time;
5. save with the current Home Assistant sensor context visibly attached.

History is chronological and readable rather than a compressed data table.
Plant and event-type filters are separate compact controls. The current revision
tests three quieter structures:

- variant A gives the history most of the width and keeps a compact editor in a
  fixed right column;
- variant B puts a compact inline editor above a day-grouped log;
- variant C opens on the history alone and moves capture into an on-demand side
  drawer.

All three support keyboard saving and show attached Home Assistant values without
turning them into a permanent metric grid. Variant C, `Verlauf zuerst`, was
selected on August 21, 2026. The journal opens on the chronological history and
shows the compact side editor only after `Neuer Eintrag` is requested. Variants
A and B are retired.

### Phase workflow review

Variant A was selected as the phase-management direction on August 21, 2026,
but its first interaction model was rejected. Drag handles were decorative, and
the page showed a phase rail while requiring the same target to be chosen again
from a separate "next phase" dropdown.

The revised contract is direct:

- every phase in the lifecycle rail and phase plan is an explicit target;
- selecting a phase updates one clearly labeled target in the confirmation
  panel;
- the user reviews the editable change timestamp and confirms the switch;
- any phase may be selected, including an earlier or custom phase;
- drag-and-drop changes only the displayed order and imposes no transition
  rules.

Every confirmed switch remains a timestamped event in the permanent run
history. Reordering the plan never rewrites that history.

### Remaining-flow review deck

On August 20, 2026, the disposable review deck was expanded to cover the
remaining product surfaces before the next feedback session. The entry point is
`plantrun-review-prototype.html?view=map`.

The deck links to the existing tent, plant, and creation prototypes and adds
three structural alternatives for journal capture, phases, sensor ownership,
strain lookup and manual fallback, editing, completion, archive, completed-run
reading, comparison, settings, failure states, and the Lovelace companion card.
It also keeps door-contact prompts and scheduled follow-ups in a visibly separate
later-ideas section.

The creation flow and phase-management structure A are selected. The revised
journal alternatives and the other remaining surfaces are still review
material and must not be treated as approved implementation requirements.

## Visual-reference findings

The supplied inspiration set contains several recurring ideas worth testing:

- compact icon-and-value rows for dense cultivation facts;
- a prominent lifecycle rail that distinguishes completed, current, and future stages;
- small, restrained navigation rather than a large administrative sidebar;
- plant imagery used for identity and recognition;
- focused charts that explain one metric with a current value and trend;
- light surfaces, generous spacing, restrained green accents, and occasional stage colors;
- desktop information density paired with purpose-built mobile plant browsing.

The prototype must not reproduce the screenshots. Each structural variant should interpret these ideas differently. Avoid returning to repeated generic metric cards, oversized decorative plant art, or an enterprise batch-management layout.

## Historical sensor policy

PlantRun uses Home Assistant Recorder as the source of sensor data:

- recent detail comes from raw Recorder history while it remains available;
- permanent run development uses hourly long-term statistics, including minimum, average, and maximum;
- bindings must warn when an entity cannot produce long-term statistics;
- PlantRun does not duplicate raw time-series samples;
- binary door and lamp history is not promised permanently;
- plant-level sensor assignments have start and end timestamps so reassigning a sensor does not rewrite earlier ownership.

Completed-run edits overwrite the corrected fields in the first version. A visible correction history remains a later feature idea.

## Discovery outcome

Shared product understanding was confirmed on August 19, 2026, visual review
continued on August 20, and the guided single-plant creation flow plus the phase
management A structure were selected on August 21. The disposable prototype under
`custom_components/plantrun/www/prototype/` now covers the tent overview, the
selected plant workspace direction, the selected creation flow, and the
remaining review states. Production HACS implementation remains a separate
decision until those remaining states are reviewed.

The prototype is evidence, not production code. After the user approves a direction, rewrite the chosen design as a maintained Home Assistant integration rather than promoting prototype code directly.

## Idea to preserve

### Tent-door capture prompt

When a Home Assistant contact sensor detects that the tent was opened, an automation could wait until the work session is likely finished and send a phone notification. Opening the notification would start a context-aware PlantRun entry or offer common changes for that tent.

This is a later workflow, not a prototype requirement. The product and event model should leave room for it.

### Scheduled follow-up from a journal entry

A journal entry may contain a future action, such as ending a darkness period and harvesting after three days. PlantRun could turn that part into a scheduled action and later record its completion. This remains a feature candidate until the first-version scope is settled.

## Current product priority signal

The user rated the desired Home Assistant capabilities as follows:

- existing sensor values and Recorder history: 10/10;
- dashboard access: 8/10;
- reminders and notifications: 6/10;
- recording events triggered by automations: 5/10;
- automations reacting to cultivation events: 4/10;
- camera snapshots: 4/10, currently unavailable for testing;
- voice or Assist capture: 2/10 for now;
- NFC tags or physical buttons: 2/10 for now.
