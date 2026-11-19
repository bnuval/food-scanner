export type AdditiveRisk = "high" | "moderate" | "limited" | "none";

export type FlaggedIngredientForScoring = {
  name: string;
  category: "additive" | "other";
  riskLevel: AdditiveRisk;
};

const RISK_DEDUCTIONS: Record<AdditiveRisk, number> = {
  high: 10,
  moderate: 5,
  limited: 2,
  none: 0,
};

const HIGH_ATTENTION_COLOURS: ReadonlyArray<readonly [string, string]> = [
  ["102", "tartrazine"],
  ["110", "sunset yellow"],
  ["124", "ponceau 4R"],
];

function recognizedColours(name: string, isAdditive: boolean): string[] {
  const codes = Array.from(
    name.matchAll(/\b(?:e|ins)\s*[- ]?\s*0*(102|110|124)\b/gi),
    (match) => match[1]
  );
  if (codes.length > 0) return codes;
  if (isAdditive) {
    const listedCodes = Array.from(name.matchAll(/\b0*(102|110|124)\b/g), (match) => match[1]);
    if (listedCodes.length > 0) return listedCodes;
  }

  const normalized = name.toLowerCase();
  const match = HIGH_ATTENTION_COLOURS.find(([, commonName]) => normalized.includes(commonName));
  return match ? [match[0]] : [];
}

export function calculateAdditiveScore(ingredients: FlaggedIngredientForScoring[]): number {
  const uniqueAdditives = new Map<string, number>();

  for (const ingredient of ingredients) {
    const colourCodes = recognizedColours(ingredient.name, ingredient.category === "additive");
    if (ingredient.category !== "additive" && colourCodes.length === 0) continue;

    if (colourCodes.length > 0) {
      for (const colourCode of colourCodes) {
        const key = `colour-${colourCode}`;
        uniqueAdditives.set(key, Math.max(uniqueAdditives.get(key) ?? 0, 10));
      }
    } else {
      const key = ingredient.name.trim().toLowerCase();
      uniqueAdditives.set(key, Math.max(uniqueAdditives.get(key) ?? 0, RISK_DEDUCTIONS[ingredient.riskLevel]));
    }
  }

  const totalDeduction = Array.from(uniqueAdditives.values()).reduce((total, value) => total + value, 0);
  return Math.max(0, 30 - totalDeduction);
}
