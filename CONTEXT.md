# PlantRun

PlantRun records the condition, lifecycle, and care of plants inside a controlled growing space.

## Language

**Tent**:
A persistent physical enclosed growing space. A tent may contain any number of plants at any combination of lifecycle stages, and it continues to exist as plants enter and leave.

**Plant**:
An individual living plant inside a tent. Plants in the same tent may differ in variety, condition, care, and lifecycle timing.

**Run**:
A durable cultivation record of exactly one plant. A run belongs to a tent and follows that plant from planting through its individual lifecycle and later historical record.
_Avoid_: Batch, group run

**Completed Run**:
A run whose cultivation has finished. It remains a browsable, editable historical record unless the user explicitly chooses Permanent Deletion.

**Archive**:
The historical view for runs that no longer appear among active plants. Moving a run to the Archive changes its visibility but preserves every recorded detail.
_Avoid_: Trash, deleted runs

**Permanent Deletion**:
An explicit user action that irreversibly removes a run and every detail PlantRun owns for it. Completion and archival never trigger it.
_Avoid_: Archive, completion

**Stage**:
A named period in one run's lifecycle. A stage belongs to the run, never to the tent.
_Avoid_: Tent phase

**Strain**:
The named genetic variety of the plant in a run. `Strain` is the canonical product term in English and German UI.
_Avoid_: Variety, cultivar, Sorte

**Breeder**:
The organization associated with producing or distributing a strain.

**Journal Entry**:
A dated account of an action, observation, measurement, lifecycle change, or plan. It belongs to a tent and may link to one or more runs; free text is primary and structured details are optional.
_Avoid_: Note

**Sensor Binding**:
A dated association between a Home Assistant entity and either one run or its tent. Reassigning a sensor does not change which run owned earlier readings.

**Shared Tent Metric**:
A sensor value that describes the tent and may provide context to every run inside it, such as average temperature, average humidity, light, door state, or energy.
_Avoid_: Plant sensor

**Plant Sensor**:
A sensor assigned to one run because it measures that individual plant or its growing medium, such as soil moisture or conductivity.

**Harvest Window**:
An editable date range estimating when one run may reach harvest. It derives from the planting date and a sourced strain-duration range without replacing either value.
_Avoid_: Tent harvest date
