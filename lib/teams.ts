export const TEAM_ALIAS: Record<string, string> = {
  usa: 'unitedstates',
  unitedstates: 'unitedstates',
  irian: 'iran',
  iran: 'iran',
  korearep: 'southkorea',
  republicofkorea: 'southkorea',
  southkorea: 'southkorea',
  dprkorea: 'northkorea',
  northkorea: 'northkorea',
  chinapr: 'china',
  china: 'china',
  trinidadandtobago: 'trinidadtobago',
  trinidadtobago: 'trinidadtobago',
  nz: 'newzealand',
  newzealand: 'newzealand',
}

export function normalizeTeam(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '')
}

export function canonicalTeam(s: string): string {
  const n = normalizeTeam(s)
  return TEAM_ALIAS[n] ?? n
}
