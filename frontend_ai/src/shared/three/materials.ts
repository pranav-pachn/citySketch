import * as THREE from 'three'
import { getZonePalette } from '@/shared/theme/zonePalette'

const materialCache = new Map<string, THREE.Material>()

export function getStandardMaterial(
  zoneKey: string,
  isNightMode: boolean,
  opts: { roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number; color?: string; opacity?: number; transparent?: boolean; depthWrite?: boolean } = {}
) {
  const colorKey = opts.color ? opts.color : 'default'
  const key = `${zoneKey}:${isNightMode}:${colorKey}:${opts.roughness ?? 0.6}:${opts.metalness ?? 0}:${opts.opacity ?? 1}:${opts.transparent ? 1 : 0}:${opts.depthWrite ? 1 : 0}`
  if (materialCache.has(key)) return materialCache.get(key) as THREE.Material

  const pal = getZonePalette(isNightMode)
  const color = opts.color ?? pal[zoneKey as keyof typeof pal]?.base ?? '#ffffff'

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.6,
    metalness: opts.metalness ?? 0,
    emissive: opts.emissive ?? undefined,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  })

  // Transparency helpers
  mat.transparent = !!opts.transparent
  mat.opacity = opts.opacity ?? 1
  mat.depthWrite = opts.depthWrite !== undefined ? !!opts.depthWrite : true

  materialCache.set(key, mat)
  return mat
}

export function disposeAllMaterials() {
  materialCache.forEach((m) => {
    try { m.dispose() } catch (e) { /* ignore */ }
  })
  materialCache.clear()
}
