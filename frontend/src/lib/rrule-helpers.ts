
export const generateRRulePresets = {
  "FREQ=DAILY": "Tous les jours",

  "FREQ=WEEKLY;BYDAY=MO,WE,FR": "Lundi, Mercredi, Vendredi",
  "FREQ=WEEKLY;BYDAY=TU,TH": "Mardi, Jeudi",
  "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR": "Lundi à Vendredi",
  "FREQ=WEEKLY;BYDAY=SA,SU": "Samedi, Dimanche",
  "FREQ=WEEKLY": "Une fois par semaine",

  "FREQ=DAILY;INTERVAL=2": "Tous les 2 jours",

  "FREQ=WEEKLY;INTERVAL=2": "Toutes les 2 semaines",

  "FREQ=MONTHLY": "Une fois par mois",
};

export const RRulePresets = [
  {
    label: "Tous les jours",
    value: "FREQ=DAILY",
  },
  {
    label: "Tous les 2 jours",
    value: "FREQ=DAILY;INTERVAL=2",
  },
  {
    label: "Lundi, Mercredi, Vendredi",
    value: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
  },
  {
    label: "Mardi, Jeudi",
    value: "FREQ=WEEKLY;BYDAY=TU,TH",
  },
  {
    label: "Lundi à Vendredi",
    value: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  },
  {
    label: "Samedi, Dimanche",
    value: "FREQ=WEEKLY;BYDAY=SA,SU",
  },
  {
    label: "Une fois par semaine",
    value: "FREQ=WEEKLY",
  },
  {
    label: "Toutes les 2 semaines",
    value: "FREQ=WEEKLY;INTERVAL=2",
  },
  {
    label: "Une fois par mois",
    value: "FREQ=MONTHLY",
  },
];

export const generateCustomRRule = (
  frequency: "DAILY" | "WEEKLY" | "MONTHLY",
  interval: number = 1,
  byDay?: string[] 
): string => {
  let rule = `FREQ=${frequency}`;

  if (interval > 1) {
    rule += `;INTERVAL=${interval}`;
  }

  if (byDay && byDay.length > 0 && frequency === "WEEKLY") {
    rule += `;BYDAY=${byDay.join(",")}`;
  }

  return rule;
};

export const parseRRuleToDescription = (rrule: string): string => {
  if (!rrule) return "";

  for (const [key, label] of Object.entries(generateRRulePresets)) {
    if (key === rrule) {
      return label;
    }
  }

  const parts: string[] = [];

  if (rrule.includes("FREQ=DAILY")) {
    const interval = rrule.match(/INTERVAL=(\d+)/)?.[1];
    parts.push(
      interval === "2"
        ? "Tous les 2 jours"
        : "Tous les jours"
    );
  } else if (rrule.includes("FREQ=WEEKLY")) {
    const interval = rrule.match(/INTERVAL=(\d+)/)?.[1];
    const byDayMatch = rrule.match(/BYDAY=([A-Z,]+)/);

    if (byDayMatch) {
      const days = byDayMatch[1].split(",");
      const dayNames = {
        MO: "Lundi",
        TU: "Mardi",
        WE: "Mercredi",
        TH: "Jeudi",
        FR: "Vendredi",
        SA: "Samedi",
        SU: "Dimanche",
      };

      parts.push(
        days
          .map((d) => dayNames[d as keyof typeof dayNames])
          .join(", ")
      );
    } else {
      parts.push(
        interval === "2"
          ? "Toutes les 2 semaines"
          : "Une fois par semaine"
      );
    }
  } else if (rrule.includes("FREQ=MONTHLY")) {
    parts.push("Une fois par mois");
  }

  return parts.join(" - ") || rrule;
};
