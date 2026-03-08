export type PlantRunRow = {
  run_id: string;
  display_id: string;
  run_name: string;
  started_at: string;
  ended_at: string | null;
  phase: string;
  active: boolean;
};

export type PlantRunServiceResponse = {
  runs: PlantRunRow[];
};

export type PlantRunCardConfig = {
  type: string;
  title?: string;
  maxRows?: number;
};
