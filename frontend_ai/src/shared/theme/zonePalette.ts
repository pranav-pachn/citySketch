import { ZONE_COLORS } from '@/shared/utils/colors'

const ZONE_PALETTE = {
  road:        { base: ZONE_COLORS.road.base, highlight: ZONE_COLORS.road.darkHex },
  residential: { base: ZONE_COLORS.residential.base, roof: ZONE_COLORS.residential.darkHex },
  commercial:  { base: ZONE_COLORS.commercial.base, trim: ZONE_COLORS.commercial.darkHex },
  hospital:    { base: ZONE_COLORS.hospital.base, cross: ZONE_COLORS.hospital.border || '#ffffff' },
  park:        { base: ZONE_COLORS.park.base, trunk: '#7b341e', foliage: ZONE_COLORS.park.darkHex },
  industrial:  { base: ZONE_COLORS.industrial.base, smokestack: '#718096' },
  water:       { base: ZONE_COLORS.water.base, wave: '#63b3ed' },
  school:      { base: ZONE_COLORS.school.base, roof: ZONE_COLORS.school.darkHex, flag: '#f44336' },
  empty:       { base: ZONE_COLORS.empty.base },
}

const NIGHT_PALETTE = {
  road:        { base: '#cbd5e1', highlight: '#94a3b8' },
  residential: { base: '#bfdbfe', roof: '#93c5fd' },
  commercial:  { base: '#fca5a5', trim: '#f87171' },
  hospital:    { base: '#fecaca', cross: '#ffffff' },
  park:        { base: '#bbf7d0', trunk: '#a3e635', foliage: '#86efac' },
  industrial:  { base: '#e2e8f0', smokestack: '#cbd5e1' },
  water:       { base: '#7dd3fc', wave: '#bae6fd' },
  school:      { base: '#e9d5ff', roof: '#d8b4fe', flag: '#fca5a5' },
  empty:       { base: '#1e293b' },
}

export function getZonePalette(isNightMode: boolean) {
  return isNightMode ? NIGHT_PALETTE : ZONE_PALETTE
}

export type ZonePalette = ReturnType<typeof getZonePalette>
