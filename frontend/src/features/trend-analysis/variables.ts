import type { DatasetVariable } from "../../types";

export type ClimateVariable = "temperature" | "rainfall" | "vegetation" | "soil-moisture";

export function variableKind(variable: DatasetVariable): ClimateVariable | undefined {
  if (variable.id === "SMAP_SOIL" || /soil.*moisture/i.test(variable.name)) return "soil-moisture";
  if (variable.category === "vegetation" || /NDVI|EVI|vegetation/i.test(variable.name)) return "vegetation";
  if (variable.category === "precipitation") return "rainfall";
  if (/temperature/i.test(variable.name)) return "temperature";
}

export const climateVariables: { kind: ClimateVariable; label: string }[] = [
  { kind: "temperature", label: "Temperature" },
  { kind: "rainfall", label: "Rainfall" },
  { kind: "vegetation", label: "Vegetation" },
  { kind: "soil-moisture", label: "Soil moisture" },
];

export function variableOptions(datasets: DatasetVariable[], regionId: string) {
  return climateVariables.map(choice => {
    const supported = datasets.filter(d => d.supported_regions.includes(regionId) && variableKind(d) === choice.kind);
    const dataset = supported.find(d => d.id === "MERRA2_T2M") || supported[0];
    return { ...choice, dataset, id: dataset?.id || choice.kind };
  });
}

export function variableLabel(variable: DatasetVariable) {
  return climateVariables.find(choice => choice.kind === variableKind(variable))?.label || variable.name;
}
