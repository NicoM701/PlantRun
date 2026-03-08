import { PlantRunRunsCard } from "./plantrun-runs-card";

if (!customElements.get("plantrun-runs-card")) {
  customElements.define("plantrun-runs-card", PlantRunRunsCard);
}

(window as Window & { customCards?: unknown[] }).customCards = (
  (window as Window & { customCards?: unknown[] }).customCards || []
).concat({
  type: "plantrun-runs-card",
  name: "PlantRun Runs Card",
  description: "Starter card for PlantRun run tables + chart views"
});
