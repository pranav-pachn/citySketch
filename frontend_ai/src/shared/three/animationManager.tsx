import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { easing } from 'maath'

type AnimState = {
  elevation: number
  targetY: number
  targetScale: number
}

const registry = new Map<RefObject<THREE.Group | null>, AnimState>()

export function registerAnimatedGroup(ref: RefObject<THREE.Group | null>, initial: Partial<AnimState> = {}) {
  registry.set(ref, {
    elevation: initial.elevation ?? 0,
    targetY: initial.targetY ?? 0,
    targetScale: initial.targetScale ?? 1,
  })
}

export function updateAnimatedGroup(ref: RefObject<THREE.Group | null>, patch: Partial<AnimState>) {
  const s = registry.get(ref)
  if (!s) return
  if (patch.elevation !== undefined) s.elevation = patch.elevation
  if (patch.targetY !== undefined) s.targetY = patch.targetY
  if (patch.targetScale !== undefined) s.targetScale = patch.targetScale
}

export function unregisterAnimatedGroup(ref: RefObject<THREE.Group | null>) {
  registry.delete(ref)
}

export function AnimationManager() {
  const last = useRef(0)
  useFrame((_, delta) => {
    // iterate registry and apply easing
    for (const [ref, state] of registry.entries()) {
      const g = ref.current
      if (!g) continue
      const targetY = state.targetY + state.elevation
      easing.damp(g.position, 'y', targetY, 0.15, delta)

      const ts = state.targetScale
      easing.damp3(g.scale, [ts, ts, ts], 0.2, delta)
    }
    last.current += delta
  })

  return null
}

export default AnimationManager
