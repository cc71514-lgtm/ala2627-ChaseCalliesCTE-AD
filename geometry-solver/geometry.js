function formatNumber(value) {
  return Number(value.toFixed(2)).toString();
}

function extractNumbers(text) {
  return [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
}

function getLengthUnit(text) {
  return text.match(/\b(mm|cm|m|inches|inch|feet|foot|ft)\b/i)?.[0] || "";
}

function solveGeometryProblem(input) {
  const text = input.toLowerCase().replace(/[−–]/g, "-");
  const numbers = extractNumbers(text);
  const unit = getLengthUnit(text);
  const squaredUnit = unit ? `${unit}²` : "square units";
  const linearUnit = unit || "units";
  const degreeValues = [...text.matchAll(/(-?\d+(?:\.\d+)?)\s*(?:°|\bdegrees?\b)/g)]
    .map((match) => Number(match[1]));

  if (/\b(triangle|triangular)\b/.test(text) && /\bangle\b/.test(text)) {
    const angles = degreeValues.length === 2 ? degreeValues : numbers.length === 2 ? numbers : [];
    if (angles.length === 2) {
      const missing = 180 - angles[0] - angles[1];
      if (missing < 0) throw new Error("Those two angles add to more than 180°. Check the values.");
      return `Answer: ${formatNumber(missing)}°\nRule: A triangle's interior angles add to 180°.\nCalculation: 180° - ${formatNumber(angles[0])}° - ${formatNumber(angles[1])}° = ${formatNumber(missing)}°.`;
    }
  }

  if (/\bsupplementary\b|\bstraight line\b/.test(text) && degreeValues.length === 1) {
    const missing = 180 - degreeValues[0];
    return `Answer: ${formatNumber(missing)}°\nRule: Supplementary angles add to 180°.\nCalculation: 180° - ${formatNumber(degreeValues[0])}° = ${formatNumber(missing)}°.`;
  }

  if (/\bcomplementary\b/.test(text) && degreeValues.length === 1) {
    const missing = 90 - degreeValues[0];
    return `Answer: ${formatNumber(missing)}°\nRule: Complementary angles add to 90°.\nCalculation: 90° - ${formatNumber(degreeValues[0])}° = ${formatNumber(missing)}°.`;
  }

  if (/\b(right triangle|pythagorean)\b/.test(text)) {
    const hypotenuse = text.match(/hypotenuse\D{0,12}(\d+(?:\.\d+)?)/);
    const leg = text.match(/\bleg\D{0,12}(\d+(?:\.\d+)?)/);
    if (/\b(other|missing|unknown)\s+leg\b/.test(text) && hypotenuse && leg) {
      const hyp = Number(hypotenuse[1]);
      const knownLeg = Number(leg[1]);
      if (knownLeg >= hyp) throw new Error("A right-triangle leg must be shorter than the hypotenuse. Check the values.");
      const missing = Math.sqrt(hyp ** 2 - knownLeg ** 2);
      return `Answer: ${formatNumber(missing)} ${linearUnit}\nRule: Pythagorean theorem, a² + b² = c².\nCalculation: √(${formatNumber(hyp)}² - ${formatNumber(knownLeg)}²) = ${formatNumber(missing)} ${linearUnit}.`;
    }
    if (/\bhypotenuse\b/.test(text) && numbers.length === 2) {
      const hyp = Math.hypot(numbers[0], numbers[1]);
      return `Answer: ${formatNumber(hyp)} ${linearUnit}\nRule: Pythagorean theorem, a² + b² = c².\nCalculation: √(${formatNumber(numbers[0])}² + ${formatNumber(numbers[1])}²) = ${formatNumber(hyp)} ${linearUnit}.`;
    }
  }

  if (/\btriangle\b/.test(text) && /\barea\b/.test(text) && numbers.length === 2) {
    const area = numbers[0] * numbers[1] / 2;
    return `Answer: ${formatNumber(area)} ${squaredUnit}\nRule: Triangle area = base × height ÷ 2.\nCalculation: ${formatNumber(numbers[0])} × ${formatNumber(numbers[1])} ÷ 2 = ${formatNumber(area)} ${squaredUnit}.`;
  }

  if (/\bcircle\b/.test(text) && /\b(area|circumference)\b/.test(text)) {
    const radiusMatch = text.match(/radius\D{0,12}(\d+(?:\.\d+)?)/);
    const diameterMatch = text.match(/diameter\D{0,12}(\d+(?:\.\d+)?)/);
    const radius = radiusMatch ? Number(radiusMatch[1]) : diameterMatch ? Number(diameterMatch[1]) / 2 : numbers.length === 1 ? numbers[0] : null;
    if (radius !== null) {
      if (/\barea\b/.test(text)) {
        const area = Math.PI * radius ** 2;
        return `Answer: ${formatNumber(area)} ${squaredUnit}\nRule: Circle area = πr².\nCalculation: π × ${formatNumber(radius)}² ≈ ${formatNumber(area)} ${squaredUnit}.`;
      }
      const circumference = 2 * Math.PI * radius;
      return `Answer: ${formatNumber(circumference)} ${linearUnit}\nRule: Circumference = 2πr.\nCalculation: 2 × π × ${formatNumber(radius)} ≈ ${formatNumber(circumference)} ${linearUnit}.`;
    }
  }

  if (/\bpolygon\b/.test(text)) {
    const sideCountMatch = text.match(/(\d+)\s*[- ]?sided\b|\bwith\s+(\d+)\s+sides\b|\b(\d+)\s+sides\b/);
    const sides = sideCountMatch && Number(sideCountMatch[1] || sideCountMatch[2] || sideCountMatch[3]);
    if (sides >= 3 && /\b(regular|each|one interior)\b/.test(text)) {
      const angle = (sides - 2) * 180 / sides;
      return `Answer: ${formatNumber(angle)}°\nRule: Each interior angle of a regular polygon = (n - 2) × 180° ÷ n.\nCalculation: (${sides} - 2) × 180° ÷ ${sides} = ${formatNumber(angle)}°.`;
    }
    if (sides >= 3 && /\b(sum|total)\b/.test(text)) {
      const sum = (sides - 2) * 180;
      return `Answer: ${formatNumber(sum)}°\nRule: Interior angle sum = (n - 2) × 180°.\nCalculation: (${sides} - 2) × 180° = ${formatNumber(sum)}°.`;
    }
  }

  if (/\brectangle\b/.test(text) && /\b(area|perimeter)\b/.test(text) && numbers.length === 2) {
    const [length, width] = numbers;
    if (/\barea\b/.test(text)) {
      const area = length * width;
      return `Answer: ${formatNumber(area)} ${squaredUnit}\nRule: Rectangle area = length × width.\nCalculation: ${formatNumber(length)} × ${formatNumber(width)} = ${formatNumber(area)} ${squaredUnit}.`;
    }
    const perimeter = 2 * (length + width);
    return `Answer: ${formatNumber(perimeter)} ${linearUnit}\nRule: Rectangle perimeter = 2 × (length + width).\nCalculation: 2 × (${formatNumber(length)} + ${formatNumber(width)}) = ${formatNumber(perimeter)} ${linearUnit}.`;
  }

  if (/\bsquare\b/.test(text) && /\b(area|perimeter)\b/.test(text) && numbers.length === 1) {
    const side = numbers[0];
    if (/\barea\b/.test(text)) {
      const area = side ** 2;
      return `Answer: ${formatNumber(area)} ${squaredUnit}\nRule: Square area = side².\nCalculation: ${formatNumber(side)}² = ${formatNumber(area)} ${squaredUnit}.`;
    }
    const perimeter = 4 * side;
    return `Answer: ${formatNumber(perimeter)} ${linearUnit}\nRule: Square perimeter = 4 × side.\nCalculation: 4 × ${formatNumber(side)} = ${formatNumber(perimeter)} ${linearUnit}.`;
  }

  throw new Error("I couldn't match that to a supported calculation. Try a triangle angle sum, complementary/supplementary angles, a right-triangle side, shape area/perimeter, circle area/circumference, or polygon angle sum.");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = solveGeometryProblem;
}
