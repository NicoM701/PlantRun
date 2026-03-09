"""Domain models for PlantRun."""
import uuid
from dataclasses import dataclass, field, asdict
from typing import Any

def default_id() -> str:
    return uuid.uuid4().hex

@dataclass
class Phase:
    name: str
    start_time: str
    id: str = field(default_factory=default_id)
    end_time: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Phase":
        return cls(**data)

@dataclass
class Note:
    text: str
    timestamp: str
    id: str = field(default_factory=default_id)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Note":
        return cls(**data)

@dataclass
class Binding:
    metric_type: str
    sensor_id: str
    id: str = field(default_factory=default_id)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any], *, run_id: str | None = None) -> "Binding":
        """Load binding from storage with v1 compatibility fallback.

        Legacy records may not have an explicit binding id.
        """
        binding_id = data.get("id")
        if not isinstance(binding_id, str) or not binding_id.strip():
            metric_type = str(data.get("metric_type", "unknown"))
            # Legacy IDs are deterministic by metric type so old entity IDs can be preserved.
            binding_id = f"legacy_{metric_type}"
        return cls(
            metric_type=data["metric_type"],
            sensor_id=data["sensor_id"],
            id=binding_id,
        )

@dataclass
class CultivarSnapshot:
    name: str | None = None
    breeder: str | None = None
    flower_window_days: int | None = None
    image_url: str | None = None
    detail_url: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "CultivarSnapshot":
        return cls(**data)

@dataclass
class RunData:
    friendly_name: str
    start_time: str
    planted_date: str | None = None
    id: str = field(default_factory=default_id)
    end_time: str | None = None
    status: str = "active"
    phases: list[Phase] = field(default_factory=list)
    notes: list[Note] = field(default_factory=list)
    bindings: list[Binding] = field(default_factory=list)
    sensor_history: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    cultivar: CultivarSnapshot | None = None
    dry_yield_grams: float | None = None
    notes_summary: str | None = None
    base_config: dict[str, Any] = field(default_factory=dict)
    image_url: str | None = None
    image_source: str | None = None

    def to_dict(self) -> dict[str, Any]:
        # To avoid issues with nested dataclasses and asdict, we handle nested manually.
        data = asdict(self)
        if self.cultivar:
            data["cultivar"] = self.cultivar.to_dict()
        data["phases"] = [p.to_dict() for p in self.phases]
        data["notes"] = [n.to_dict() for n in self.notes]
        data["bindings"] = [b.to_dict() for b in self.bindings]
        data["sensor_history"] = self.sensor_history
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "RunData":
        phases = [Phase.from_dict(p) for p in data.get("phases", [])]
        notes = [Note.from_dict(n) for n in data.get("notes", [])]
        run_id = data.get("id", default_id())
        bindings: list[Binding] = []
        seen_ids: dict[str, int] = {}
        for binding in data.get("bindings", []):
            loaded = Binding.from_dict(binding, run_id=run_id)
            # Ensure no duplicate IDs per run, while preserving first legacy mapping.
            base_id = loaded.id
            count = seen_ids.get(base_id, 0)
            if count:
                loaded.id = f"{base_id}_{count + 1}"
            seen_ids[base_id] = count + 1
            bindings.append(loaded)
        cultivar_data = data.get("cultivar")
        cultivar = CultivarSnapshot.from_dict(cultivar_data) if cultivar_data else None

        return cls(
            id=run_id,
            friendly_name=data.get("friendly_name", "Unknown Run"),
            start_time=data["start_time"],
            planted_date=data.get("planted_date"),
            end_time=data.get("end_time"),
            status=data.get("status", "active"),
            phases=phases,
            notes=notes,
            bindings=bindings,
            sensor_history=data.get("sensor_history", {}),
            cultivar=cultivar,
            dry_yield_grams=data.get("dry_yield_grams"),
            notes_summary=data.get("notes_summary"),
            base_config=data.get("base_config", {}),
            image_url=data.get("image_url"),
            image_source=data.get("image_source"),
        )
