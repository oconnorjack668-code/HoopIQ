// src/lib/regions.ts
// Countries (ISO 3166-1 alpha-2, names shown in the player's language) and Irish counties.

const CODES =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW';

export const COUNTRY_CODES = CODES.split(' ');

/** Shown first in the country list */
export const POPULAR_COUNTRIES = ['IE', 'GB', 'US', 'CA', 'AU', 'ES', 'FR', 'DE', 'IT', 'LT', 'PH'];

export function countryName(code: string | null | undefined, locale = 'en-IE'): string {
  if (!code) return '';
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}

export function countryOptions(locale = 'en-IE'): Array<{ code: string; name: string }> {
  const all = COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) => a.name.localeCompare(b.name));
  const popular = POPULAR_COUNTRIES.map((code) => ({ code, name: countryName(code, locale) }));
  return [...popular, ...all.filter((c) => !POPULAR_COUNTRIES.includes(c.code))];
}

/** All 32 counties of Ireland (basketball in Ireland is organised all-island) */
export const IRISH_COUNTIES = [
  'Antrim', 'Armagh', 'Carlow', 'Cavan', 'Clare', 'Cork', 'Derry', 'Donegal', 'Down', 'Dublin', 'Fermanagh', 'Galway',
  'Kerry', 'Kildare', 'Kilkenny', 'Laois', 'Leitrim', 'Limerick', 'Longford', 'Louth', 'Mayo', 'Meath', 'Monaghan',
  'Offaly', 'Roscommon', 'Sligo', 'Tipperary', 'Tyrone', 'Waterford', 'Westmeath', 'Wexford', 'Wicklow',
];

/** Label for the region field in each country */
export function regionLabel(country: string | null | undefined): string {
  if (country === 'IE') return 'County';
  if (country === 'GB') return 'County / region';
  if (country === 'US' || country === 'AU') return 'State';
  if (country === 'CA') return 'Province';
  return 'Region';
}

/** A tidy region name: trimmed, single spaces, max 60 characters */
export function cleanRegion(value: string): string | null {
  const v = value.replace(/\s+/g, ' ').trim().slice(0, 60);
  return v || null;
}
