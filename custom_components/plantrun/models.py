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

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Binding":
        return cls(**data)

@dataclass
class CultivarSnapshot:
    name: str | None = None
    breeder: str | None = None
    flower_window_days: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "CultivarSnapshot":
        return cls(**data)

@dataclass
class RunData:
    friendly_name: str
    start_time: str
    id: str = field(default_factory=default_id)
    end_time: str | None = None
    status: str = "active"
    phases: list[Phase] = field(default_factory=list)
    notes: list[Note] = field(default_factory=list)
    bindings: list[Binding] = field(default_factory=list)
    cultivar: CultivarSnapshot | None = None

    def to_dict(self) -> dict[str, Any]:
        # To avoid issues with nested dataclasses and asdict, we handle nested manually.
        data = asdict(self)
        if self.cultivar:
            data["cultivar"] = self.cultivar.to_dict()
        data["phases"] = [p.to_dict() for p in self.phases]
        data["notes"] = [n.to_dict() for n in self.notes]
        data["bindings"] = [b.to_dict() for b in self.bindings]
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "RunData":
        phases = [Phase.from_dict(p) for p in data.get("phases", [])]
        notes = [Note.from_dict(n) for n in data.get("notes", [])]
        bindings = [Binding.from_dict(b) for b in data.get("bindings", [])]
        cultivar_data = data.get("cultivar")
        cultivar = CultivarSnapshot.from_dict(cultivar_data) if cultivar_data else None

        return cls(
            id=data.get("id", default_id()),
            friendly_name=data.get("friendly_name", "Unknown Run"),
            start_time=data["start_time"],
            end_time=data.get("end_time"),
            status=data.get("status", "active"),
            phases=phases,
            notes=notes,
            bindings=bindings,
            cultivar=cultivar,
        )
