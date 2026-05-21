import { useRef, useState, useEffect, useMemo, memo } from 'react'
import { Canvas as R3FCanvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Grid, ContactShadows, Html } from '@react-three/drei'
import { useStore } from '@/entities/store/useStore'
import type { GridCell } from '@/entities/types'
import { calculateCellHighlights } from '@/shared/utils/scoring'
import * as THREE from 'three'
import { easing } from 'maath'
import { ZONE_COLORS } from '@/shared/utils/colors'
import { getZonePalette } from '@/shared/theme/zonePalette'
import { getStandardMaterial } from '@/shared/three/materials'
import TreesInstancer, { HousesInstancer, CarsInstancer } from '@/shared/three/instancers'
import AnimationManager, { registerAnimatedGroup, updateAnimatedGroup, unregisterAnimatedGroup } from '@/shared/three/animationManager'
import TelemetryOverlay from '@/shared/ui/TelemetryOverlay'
import ExportControls from '@/shared/ui/ExportControls'

const CELL_SIZE = 1.2

/* Palette is now centralized in shared/theme/zonePalette.ts */

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/* ═══════ Procedural Builders ═══════ */

const ParkTree = ({ x, z, scale, seed }: { x: number, z: number, scale: number, seed: number }) => {
  const isPond = seededRandom(seed * 4) > 0.8
  const isNightMode = useStore(s => s.isNightMode)
  const pal = getZonePalette(isNightMode)
  if (isPond) {
    return (
      <mesh position={[x, 0.03, z]} receiveShadow rotation={[-Math.PI/2, 0, 0]} material={getStandardMaterial('water', isNightMode, { roughness: 0.1, metalness: 0.9 })}>
        <circleGeometry args={[0.2 * scale, 12]} />
      </mesh>
    )
  }

  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 0.1, 0]} material={getStandardMaterial('park', isNightMode, { color: pal.park.trunk, roughness: 0.9 })}>
        <cylinderGeometry args={[0.03, 0.04, 0.2, 5]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} material={getStandardMaterial('park', isNightMode, { color: pal.park.foliage, roughness: 0.8 })}>
        <dodecahedronGeometry args={[0.15, 0]} />
      </mesh>
    </group>
  )
}

const ResidentialHouse = ({ x, z, scale, seed }: { x: number, z: number, scale: number, seed: number }) => {
  const height = 0.2 + seededRandom(seed) * 0.15
  const isNightMode = useStore(s => s.isNightMode)
  const isLightOn = seededRandom(seed * 5) > 0.5
  const pal = getZonePalette(isNightMode)

  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow material={getStandardMaterial('residential', isNightMode, { roughness: 0.8 })}>
        <boxGeometry args={[0.4, height, 0.4]} />
      </mesh>
      {/* Night window glow */}
      {isNightMode && isLightOn && (
        <mesh position={[0, height / 2, 0.21]}>
          <planeGeometry args={[0.1, 0.1]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      )}
      <mesh position={[0, height + 0.1, 0]} rotation={[0, Math.PI / 4, 0]} castShadow material={getStandardMaterial('residential', isNightMode, { color: pal.residential.roof, roughness: 0.9 })}>
        <coneGeometry args={[0.35, 0.2, 4]} />
      </mesh>
    </group>
  )
}

const CommercialSkyscraper = ({ x, z, seed }: { x: number, z: number, seed: number }) => {
  const tier1Height = 0.8 + seededRandom(seed) * 1.0 // Varied sizes!
  const tier2Height = 0.4 + seededRandom(seed * 2) * 0.5
  const tier3Height = 0.2 + seededRandom(seed * 3) * 0.4
  const hasTier3 = seededRandom(seed * 4) > 0.4
  const hasAntenna = seededRandom(seed * 5) > 0.3

  const isNightMode = useStore(s => s.isNightMode)
  const pal = getZonePalette(isNightMode)

  // Use shared material pool instead of allocating per-instance
  const material = getStandardMaterial('commercial', isNightMode, { roughness: 0.1, metalness: 0.8, emissive: isNightMode ? '#fef08a' : undefined, emissiveIntensity: isNightMode ? 0.15 : 0 })

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, tier1Height / 2, 0]} castShadow receiveShadow material={material}>
        <boxGeometry args={[0.7, tier1Height, 0.7]} />
      </mesh>
      <mesh position={[0, tier1Height + tier2Height / 2, 0]} castShadow receiveShadow material={material}>
        <boxGeometry args={[0.5, tier2Height, 0.5]} />
      </mesh>
      {hasTier3 && (
        <mesh position={[0, tier1Height + tier2Height + tier3Height / 2, 0]} castShadow material={material}>
          <cylinderGeometry args={[0.1, 0.15, tier3Height, 4]} />
        </mesh>
      )}
      {hasAntenna && (
         <mesh position={[0, tier1Height + tier2Height + (hasTier3 ? tier3Height : 0) + 0.25, 0]}>
           <cylinderGeometry args={[0.01, 0.01, 0.5, 4]} />
           <primitive object={getStandardMaterial('commercial', isNightMode, { color: '#ffffff', emissive: isNightMode ? '#ef4444' : undefined, emissiveIntensity: isNightMode ? 0.5 : 0 })} attach="material" />
         </mesh>
      )}
    </group>
  )
}

const IndustrialFactory = ({ x, z }: { x: number, z: number }) => {
  const isNightMode = useStore(s => s.isNightMode)
  const pal = getZonePalette(isNightMode)
  return (
    <group position={[x, 0, z]}>
      <mesh position={[-0.1, 0.2, 0]} castShadow receiveShadow material={getStandardMaterial('industrial', isNightMode, { roughness: 0.7 })}>
        <boxGeometry args={[0.5, 0.4, 0.7]} />
      </mesh>
      <mesh position={[0.3, 0.5, -0.15]} castShadow material={getStandardMaterial('industrial', isNightMode, { color: pal.industrial.smokestack, roughness: 0.6 })}>
        <cylinderGeometry args={[0.12, 0.12, 1.0, 12]} />
      </mesh>
      <mesh position={[0.3, 0.4, 0.2]} castShadow material={getStandardMaterial('industrial', isNightMode, { color: pal.industrial.smokestack, roughness: 0.6 })}>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 12]} />
      </mesh>
      {isNightMode && (
         <pointLight position={[0, 0.8, 0]} intensity={2} distance={2} color="#f97316" />
      )}
    </group>
  )
}

const HospitalClinic = ({ x, z, seed }: { x: number, z: number, seed: number }) => {
  const roofHeight = 0.5 + seededRandom(seed) * 0.2
  const isNightMode = useStore(s => s.isNightMode)
  const pal = getZonePalette(isNightMode)

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, roofHeight / 2, 0]} castShadow receiveShadow material={getStandardMaterial('hospital', isNightMode, { roughness: 0.5 })}>
        <boxGeometry args={[0.72, roofHeight, 0.72]} />
      </mesh>
      <mesh position={[0, roofHeight + 0.08, 0]} castShadow material={getStandardMaterial('hospital', isNightMode, { color: pal.hospital.cross })}>
        <boxGeometry args={[0.18, 0.42, 0.08]} />
      </mesh>
      <mesh position={[0, roofHeight + 0.08, 0]} castShadow material={getStandardMaterial('hospital', isNightMode, { color: pal.hospital.cross })}>
        <boxGeometry args={[0.08, 0.18, 0.08]} />
      </mesh>
    </group>
  )
}

/* Guide Section 8 — School building: height 1.8, multi-floor with flag pole */
const SchoolBuilding = ({ x, z, seed }: { x: number, z: number, seed: number }) => {
  const height = 0.6 + seededRandom(seed) * 0.3
  const isNightMode = useStore(s => s.isNightMode)
  const pal = getZonePalette(isNightMode)

  return (
    <group position={[x, 0, z]}>
      {/* Main building */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow material={getStandardMaterial('school', isNightMode, { roughness: 0.6 })}>
        <boxGeometry args={[0.7, height, 0.5]} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, height + 0.05, 0]} castShadow material={getStandardMaterial('school', isNightMode, { color: pal.school.roof, roughness: 0.7 })}>
        <boxGeometry args={[0.74, 0.06, 0.54]} />
      </mesh>
      {/* Flag pole */}
      <mesh position={[0.3, height + 0.35, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.6, 6]} />
        <primitive object={getStandardMaterial('school', isNightMode, { color: '#e0e0e0' })} attach="material" />
      </mesh>
      {/* Flag */}
      <mesh position={[0.3, height + 0.55, 0.06]}>
        <boxGeometry args={[0.01, 0.12, 0.12]} />
        <primitive object={getStandardMaterial('school', isNightMode, { color: pal.school.flag })} attach="material" />
      </mesh>
    </group>
  )
}

const RoamingCar = ({ seed }: { seed: number }) => {
  const ref = useRef<THREE.Group>(null)
  const isNightMode = useStore(s => s.isNightMode)
  
  // Random speed and starting offset
  const speed = 0.5 + seededRandom(seed) * 1.5
  const offset = seededRandom(seed * 2) * Math.PI * 2
  const isXAxis = seededRandom(seed * 3) > 0.5

  useFrame(({ clock }) => {
    if (ref.current) {
      // Loop smoothly back and forth on one block tile
      const t = clock.elapsedTime * speed + offset
      const pos = Math.sin(t) * 0.4
      if (isXAxis) {
        ref.current.position.x = pos
        ref.current.rotation.y = Math.cos(t) > 0 ? Math.PI / 2 : -Math.PI / 2
      } else {
        ref.current.position.z = pos
        ref.current.rotation.y = Math.cos(t) > 0 ? 0 : Math.PI
      }
    }
  })

  return (
    <group position={[0, 0.05, 0]} ref={ref}>
      <mesh material={getStandardMaterial('road', isNightMode, { color: seededRandom(seed*4) > 0.5 ? '#eab308' : '#ffffff', roughness: 0.3 })}>
        <boxGeometry args={[0.08, 0.06, 0.16]} />
      </mesh>
      {/* Headlights */}
      {isNightMode && (
        <>
          <mesh position={[0.02, 0, 0.08]}>
            <boxGeometry args={[0.02, 0.02, 0.02]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.02, 0, 0.08]}>
            <boxGeometry args={[0.02, 0.02, 0.02]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Taillights */}
          <mesh position={[0.02, 0, -0.08]}>
            <boxGeometry args={[0.02, 0.02, 0.02]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          <mesh position={[-0.02, 0, -0.08]}>
            <boxGeometry args={[0.02, 0.02, 0.02]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </>
      )}
    </group>
  )
}

const RoadTile = ({ seed, elevation = 0 }: { seed: number, elevation?: number }) => {
  const isNightMode = useStore(s => s.isNightMode)
  const pal = getZonePalette(isNightMode)
  return (
    <group>
      <mesh position={[0, -elevation / 2 + 0.01, 0]} receiveShadow castShadow material={getStandardMaterial('road', isNightMode, { roughness: 0.9 })}>
        <boxGeometry args={[CELL_SIZE - 0.05, 0.02 + elevation, CELL_SIZE - 0.05]} />
      </mesh>
    </group>
  )
}

const WaterTile = ({ elevation = 0 }: { elevation?: number }) => {
  const isNightMode = useStore(s => s.isNightMode)
  return (
    <mesh position={[0, -elevation / 2 + 0.015, 0]} receiveShadow castShadow material={getStandardMaterial('water', isNightMode, { roughness: 0.1, metalness: 0.8 })}>
      <boxGeometry args={[CELL_SIZE - 0.05, 0.03 + elevation, CELL_SIZE - 0.05]} />
    </mesh>
  )
}


/* ═══════ Single Cell Group ═══════ */

const CityCell = memo(function CityCell({ cell, offsetX, offsetZ, revealOrder, generationId, highlightInfo }: { cell: GridCell, offsetX: number, offsetZ: number, revealOrder: number, generationId: number, highlightInfo?: { color: string, type: string, reason?: string } }) {
  const isSelected = useStore((s) => s.selectedCell?.x === cell.x && s.selectedCell?.y === cell.y)
  const setSelectedCell = useStore((s) => s.setSelectedCell)
  const isHovered = useStore((s) => s.hoveredCell?.x === cell.x && s.hoveredCell?.y === cell.y)
  const setHoveredCell = useStore((s) => s.setHoveredCell)
  const isNightMode = useStore((s) => s.isNightMode)
  const pal = getZonePalette(isNightMode)
  const seed = cell.x * 100 + cell.y * 10
  const elevation = cell.elevation || 0

  const groupRef = useRef<THREE.Group>(null)
  const [isVisible, setIsVisible] = useState(generationId === 0)
  const displayZoneName = cell.type === 'hospital' ? 'Hospital' : cell.type

  useEffect(() => {
    if (generationId === 0) {
      setIsVisible(true)
      return
    }

    setIsVisible(false)
    const revealDelay = Math.min(revealOrder * 28, 1400)
    const timeout = window.setTimeout(() => setIsVisible(true), revealDelay)
    return () => window.clearTimeout(timeout)
  }, [generationId, revealOrder])

  // Register group with centralized AnimationManager
  useEffect(() => {
    registerAnimatedGroup(groupRef, { elevation, targetY: isHovered ? 0.2 : 0, targetScale: isVisible ? 1 : 0.01 })
    return () => unregisterAnimatedGroup(groupRef)
    // intentionally only on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update animation targets when hover/visibility/elevation change
  useEffect(() => {
    updateAnimatedGroup(groupRef, { elevation, targetY: isHovered ? 0.2 : 0, targetScale: isVisible ? 1 : 0.01 })
  }, [isHovered, isVisible, elevation])

  // Render logic based on type
  const renderGeometry = () => {
    switch (cell.type) {
      case 'residential':
        // residential content rendered via HousesInstancer
        return null
      case 'commercial':
        return <CommercialSkyscraper x={0} z={0} seed={seed} />
      case 'hospital':
        return <HospitalClinic x={0} z={0} seed={seed} />
      case 'industrial':
        return <IndustrialFactory x={0} z={0} />
      case 'park':
        // Park content rendered via instanced TreesInstancer to reduce draw calls
        return null
      case 'road':
        return <RoadTile seed={seed} elevation={elevation} />
      case 'water':
        return <WaterTile elevation={elevation} />
      case 'school':
        return <SchoolBuilding x={0} z={0} seed={seed} />
      default:
        return null
    }
  }

  const getBaseColor = () => {
    if (isSelected) return '#ffffff'
    if (cell.type === 'park' || cell.type === 'road' || cell.type === 'water') return pal.empty.base
    if (cell.type === 'residential') return pal.residential.base
    if (cell.type === 'commercial') return pal.commercial.base
    if (cell.type === 'hospital') return pal.hospital.base
    return '#2d3748'
  }

  // Determine tooltip color map
  const tailwindColorMap: Record<string, string> = {
    commercial: 'bg-red-500',
    residential: 'bg-blue-500',
    hospital: 'bg-red-600',
    industrial: 'bg-slate-500',
    park: 'bg-green-500',
    water: 'bg-blue-400',
    road: 'bg-gray-400',
    school: 'bg-purple-500'
  }

  return (
    <group
      position={[offsetX, 0, offsetZ]}
      onClick={(e) => {
        e.stopPropagation()
        setSelectedCell(isSelected ? null : cell)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHoveredCell(cell)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHoveredCell(null)
        document.body.style.cursor = 'default'
      }}
    >
      <group ref={groupRef}>
        {renderGeometry()}

        {cell.type !== 'road' && cell.type !== 'water' && cell.type !== 'park' ? (
          <mesh position={[0, -elevation / 2 + 0.05, 0]} receiveShadow castShadow material={getStandardMaterial('empty', isNightMode, { color: getBaseColor(), roughness: 0.9 })}>
            <boxGeometry args={[CELL_SIZE - 0.05, 0.1 + elevation, CELL_SIZE - 0.05]} />
          </mesh>
        ) : cell.type === 'park' ? (
          <mesh position={[0, -elevation / 2 + 0.03, 0]} receiveShadow castShadow material={getStandardMaterial('park', isNightMode, { color: pal.park.base, roughness: 1 })}>
            <boxGeometry args={[CELL_SIZE - 0.05, 0.06 + elevation, CELL_SIZE - 0.05]} />
          </mesh>
        ) : null}

        {/* Highlight Overlay */}
        {highlightInfo && (
          <mesh position={[0, elevation + 0.2, 0]} material={getStandardMaterial('overlay', isNightMode, { color: highlightInfo.type === 'bad' ? '#ef4444' : '#22c55e', opacity: 0.3, transparent: true, depthWrite: false })}>
            <boxGeometry args={[CELL_SIZE, 0.1, CELL_SIZE]} />
          </mesh>
        )}

        {/* 3D Tooltip when Hovered */}
        {isHovered && cell.type !== 'empty' && (
          <Html position={[0, cell.type === 'commercial' || cell.type === 'hospital' ? 2.5 : 1, 0]} center style={{ pointerEvents: 'none' }}>
            <div className={`backdrop-blur-md px-3 py-2 rounded-lg shadow-2xl border text-xs min-w-[130px] transform transition-all duration-200 pointer-events-none ${
              isNightMode
                ? 'bg-zinc-900/95 border-zinc-700/50'
                : 'bg-white/95 border-zinc-300/60'
            } ${highlightInfo ? (highlightInfo.type === 'bad' ? 'border-red-500/50 shadow-red-500/20' : 'border-green-500/50 shadow-green-500/20') : ''}`}>
              <div className={`font-bold mb-1 uppercase tracking-widest text-[10px] ${isNightMode ? 'text-zinc-300' : 'text-zinc-600'}`}>Sector {cell.x}-{cell.y}</div>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${tailwindColorMap[cell.type] || 'bg-zinc-500'}`} />
                <span className={`capitalize font-semibold text-sm ${isNightMode ? 'text-blue-300' : 'text-blue-700'}`}>{displayZoneName} Zone</span>
              </div>
              {highlightInfo && highlightInfo.reason && (
                <div className={`mt-2 pt-1.5 border-t ${highlightInfo.type === 'bad' ? 'border-red-500/30 text-red-500' : 'border-green-500/30 text-green-600'} text-[10px] leading-tight font-medium`}>
                  {highlightInfo.reason}
                </div>
              )}
            </div>
          </Html>
        )}
      </group>
    </group>
  )
})

/* ═══════ Auto-rotate ═══════ */
function AutoRotate() {
  const [active, setActive] = useState(true)
  const controlsRef = useRef<any>(null)

  useFrame(() => {
    if (active && controlsRef.current) {
      controlsRef.current.autoRotate = true
      controlsRef.current.autoRotateSpeed = 0.5
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={40}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.1}
      autoRotate={active}
      onStart={() => setActive(false)}
    />
  )
}

function TelemetryToggle({ visible, onToggle }: { visible: boolean, onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title="Toggle telemetry (T)"
      className="px-3 py-1 text-xs font-medium rounded-md bg-zinc-900/80 border border-zinc-800/50 text-zinc-200 hover:bg-zinc-800/80"
    >
      Telemetry {visible ? 'On' : 'Off'}
    </button>
  )
}

/* ═══════ Main Scene Assembly ═══════ */
function CityScene() {
  const layoutData = useStore((s) => s.layoutData)
  const isNightMode = useStore((s) => s.isNightMode)
  const generationId = useStore((s) => s.generationId)
  const highlightMode = useStore((s) => s.highlightMode)

  // MUST be before any conditional returns (Rules of Hooks)
  const highlights = useMemo(() => {
    if (!layoutData || !highlightMode) return {}
    return calculateCellHighlights(layoutData)
  }, [layoutData, highlightMode])

  if (!layoutData) return null

  const rows = layoutData.length
  const cols = layoutData[0]?.length || 0
  const width = cols * CELL_SIZE
  const depth = rows * CELL_SIZE
  const centerX = (width - CELL_SIZE) / 2
  const centerZ = (depth - CELL_SIZE) / 2

  // Collect park tree instances to render with InstancedMesh
  const treeInstances = useMemo(() => {
    const out: Array<{ x: number; z: number; scale: number; seed: number; isPond?: boolean }> = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = layoutData[y][x]
        if (cell.type === 'park') {
          const seed = cell.x * 100 + cell.y * 10
          const baseX = cell.x * CELL_SIZE
          const baseZ = cell.y * CELL_SIZE
          out.push({ x: baseX - 0.3, z: baseZ - 0.3, scale: 1, seed })
          out.push({ x: baseX + 0.25, z: baseZ - 0.2, scale: 1.5, seed: seed + 1 })
          out.push({ x: baseX - 0.1, z: baseZ + 0.4, scale: 1.2, seed: seed + 2 })
          out.push({ x: baseX + 0.3, z: baseZ + 0.3, scale: 0.8, seed: seed + 3 })
        }
      }
    }
    return out
  }, [layoutData, rows, cols])

  // Collect house instances for residential cells
  const houseInstances = useMemo(() => {
    const out: Array<{ x: number; z: number; scale: number; seed: number }> = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = layoutData[y][x]
        if (cell.type === 'residential') {
          const seed = cell.x * 100 + cell.y * 10
          const baseX = cell.x * CELL_SIZE
          const baseZ = cell.y * CELL_SIZE
          out.push({ x: baseX - 0.2, z: baseZ - 0.2, scale: 1, seed })
          out.push({ x: baseX + 0.25, z: baseZ - 0.2, scale: 0.8, seed: seed + 1 })
          out.push({ x: baseX - 0.1, z: baseZ + 0.3, scale: 0.9, seed: seed + 2 })
          out.push({ x: baseX + 0.3, z: baseZ + 0.3, scale: 1.1, seed: seed + 3 })
        }
      }
    }
    return out
  }, [layoutData, rows, cols])

  // Collect car instances on road tiles
  const carInstances = useMemo(() => {
    const out: Array<{ x: number; z: number; speed: number; offset: number; isXAxis: boolean; color?: string }> = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = layoutData[y][x]
        if (cell.type === 'road') {
          const seed = cell.x * 100 + cell.y * 10
          if (seededRandom(seed) > 0.6) {
            const isXAxis = seededRandom(seed * 3) > 0.5
            const speed = 0.5 + seededRandom(seed) * 1.5
            const offset = seededRandom(seed * 2) * Math.PI * 2
            const baseX = cell.x * CELL_SIZE
            const baseZ = cell.y * CELL_SIZE
            out.push({ x: baseX, z: baseZ, speed, offset, isXAxis, color: seededRandom(seed*4) > 0.5 ? '#eab308' : '#ffffff' })
          }
        }
      }
    }
    return out
  }, [layoutData, rows, cols])

  return (
    <group position={[-centerX, 0, -centerZ]}>
      {/* Scale Model Cutting Mat / Base */}
      <mesh position={[centerX, -0.25, centerZ]} receiveShadow material={getStandardMaterial('empty', isNightMode, { color: isNightMode ? '#1e293b' : '#ffffff', roughness: 1 })}>
        <boxGeometry args={[width + 2, 0.5, depth + 2]} />
      </mesh>

      {/* Grid Lines over the base */}
      <Grid 
        position={[centerX, 0.01, centerZ]}
        args={[width + 2, depth + 2]} 
        cellSize={CELL_SIZE}
        cellThickness={0.5}
        cellColor={isNightMode ? "#334155" : "#e2e8f0"}
        sectionSize={CELL_SIZE * 4}
        sectionThickness={1}
        sectionColor={isNightMode ? "#475569" : "#cbd5e1"}
        fadeDistance={40}
        fadeStrength={1}
      />

      <ContactShadows 
        position={[centerX, 0.02, centerZ]} 
        scale={width * 1.5} 
        resolution={256} 
        far={5} 
        blur={1.5} 
        opacity={isNightMode ? 0.3 : 0.8} 
        color="#000000"
      />

      {layoutData.map((row) => 
        row.map((cell) => (
          <CityCell
            key={`${cell.x}-${cell.y}-${generationId}`}
            cell={cell}
            offsetX={cell.x * CELL_SIZE}
            offsetZ={cell.y * CELL_SIZE}
            revealOrder={cell.y * cols + cell.x}
            generationId={generationId}
            highlightInfo={highlights[`${cell.x},${cell.y}`]}
          />
        ))
      )}

      {/* Instanced trees for all park cells */}
      <TreesInstancer instances={treeInstances} />
      {/* Instanced houses */}
      <HousesInstancer instances={houseInstances} />
      {/* Instanced roaming cars with single animation loop */}
      <CarsInstancer instances={carInstances} />
    </group>
  )
}

export function Scene3D() {
  const layoutData = useStore((s) => s.layoutData)
  const isNightMode = useStore((s) => s.isNightMode)
  const [telemetryVisible, setTelemetryVisible] = useState(true)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 't') setTelemetryVisible(v => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!layoutData) return null

  const maxDim = Math.max(layoutData.length, layoutData[0]?.length || 0)
  const camDist = maxDim * 1.3

  return (
    <div className="scene-3d-wrapper relative w-full h-full bg-zinc-950 overflow-hidden">
      <R3FCanvas
        camera={{ position: [camDist * 0.7, camDist * 0.6, camDist * 0.7], fov: 35 }}
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={[isNightMode ? '#040814' : '#09090b']} />
        <fog attach="fog" args={[isNightMode ? '#040814' : '#09090b', maxDim * 2, maxDim * 4]} />

        {isNightMode ? (
          <>
            <ambientLight intensity={0.7} color="#e2e8f0" />
            <directionalLight
              position={[15, 25, -10]}
              intensity={1.8}
              color="#f8fafc"
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-far={80}
              shadow-camera-left={-25}
              shadow-camera-right={25}
              shadow-camera-top={25}
              shadow-camera-bottom={-25}
            />
            <pointLight position={[0, 15, 0]} intensity={1.5} color="#bae6fd" distance={40} />
            <pointLight position={[-15, 8, 15]} intensity={0.8} color="#e0f2fe" distance={30} />
          </>
        ) : (
          <>
            <ambientLight intensity={0.9} color="#ffffff" />
            <directionalLight
              position={[15, 25, -10]}
              intensity={2.5}
              color="#ffffff"
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-camera-far={80}
              shadow-camera-left={-25}
              shadow-camera-right={25}
              shadow-camera-top={25}
              shadow-camera-bottom={-25}
              shadow-bias={-0.0001}
            />
            <pointLight position={[-15, 10, 15]} intensity={0.8} color="#bfdbfe" />
            <pointLight position={[15, 10, 15]} intensity={0.5} color="#e0f2fe" />
          </>
        )}
        
        {!isNightMode && <Environment preset="studio" environmentIntensity={0.8} />}

        <CityScene />
        <AnimationManager />
        <AutoRotate />
      </R3FCanvas>
      
      {/* HUD Overlays */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <div className="text-xs text-zinc-400 font-medium tracking-wide pointer-events-none uppercase bg-zinc-950/80 px-4 py-1.5 rounded-full backdrop-blur-sm border border-zinc-800/60 shadow-sm">
          Drag to pan • Scroll to zoom
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-zinc-950/90 text-zinc-100 border border-zinc-800/60 rounded-xl px-3 py-2 shadow-lg backdrop-blur-sm pointer-events-none">
        <div className="text-[10px] font-bold tracking-wider uppercase text-zinc-500 mb-2">3D Legend</div>
        <div className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-300">
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Green = Park</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Blue = Residential</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-600" />Red = Hospital</div>
        </div>
      </div>
      {/* Telemetry Toggle Button */}
      <div style={{ position: 'absolute', top: 12, right: 120, zIndex: 60, display: 'flex', gap: 8 }}>
        <ExportControls />
        <TelemetryToggle visible={telemetryVisible} onToggle={() => setTelemetryVisible(v => !v)} />
      </div>
      {/* Telemetry Overlay (FPS, draw calls, instance counts) */}
      const telemetryEndpoint = (import.meta as any).env?.VITE_TELEMETRY_ENDPOINT || undefined
      const telemetryInterval = Number((import.meta as any).env?.VITE_TELEMETRY_INTERVAL_MS) || 5000
      <TelemetryOverlay visible={telemetryVisible} endpoint={telemetryEndpoint} logIntervalMs={telemetryInterval} />

    </div>
  )
}
