export function ordinal(num: number, language: string = "en"): string {
  const suffixes: { [key: string]: string[] } = {
    en: ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"],
    fr: ["ème", "er", "ème", "ème", "ème", "ème", "ème", "ème", "ème", "ème"],
  };

  const suffix = suffixes[language];
  if (!suffix) {
    throw new Error("Unsupported language.");
  }

  if (10 <= num % 100 && num % 100 <= 20) {
    return num + suffix[0];
  } else {
    return num + suffix[num % 10];
  }
}

export function seasonFormat(season: number, yearDelta: number): string {
  // 20232024 + (1*10001) = 20242025
  const updatedSeason = season + yearDelta * 10001;

  return `${updatedSeason.toString().slice(0, 4)}-${updatedSeason.toString().slice(6)}`;
}

export function seasonWithYearFormat(year: number): string {
  // 2023 -> 2023-24
  return `${year.toString()}-${(year + 1).toString().slice(2)}`;
}

export function salaryFormat(salaryDollars: number): string {
  // Convert to formated millions of dollars.
  const millions = salaryDollars / 1000000;

  return (
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(millions) + "M"
  );
}

export function heightFormat(heightInInches: number): string {
  return `${Math.floor(heightInInches / 12)}'${heightInInches % 12}''`
}

export function ageFormat(birthDateString: string): number{
  return new Date().getFullYear() -
  new Date(birthDateString).getFullYear() -
  (new Date() <
  new Date(new Date(birthDateString).setFullYear(new Date().getFullYear()))
    ? 1
    : 0);
}