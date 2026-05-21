import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { getStandardMaterial } from '@/shared/three/materials'
import { useStore } from '@/entities/store/useStore'

type TreeInstance = { x: number; z: number; scale: number; seed: number; isPond?: boolean }
type HouseInstance = { x: number; z: number; scale: number; seed: number }
type CarInstance = { x: number; z: number; speed: number; offset: number; isXAxis: boolean; color?: string }

export function TreesInstancer({ instances }: { instances: TreeInstance[] }) {
  const count = instances.length
  const isNightMode = useStore(s => s.isNightMode)
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const leafRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const trunkGeom = useMemo(() => new THREE.CylinderGeometry(0.03, 0.04, 0.2, 5), [])
  const leafGeom = useMemo(() => new THREE.DodecahedronGeometry(0.15, 0), [])
  const trunkMat = useMemo(() => getStandardMaterial('park', isNightMode, { roughness: 0.9 }), [isNightMode])
  const leafMat = useMemo(() => getStandardMaterial('park', isNightMode, { roughness: 0.8 }), [isNightMode])

  useEffect(() => {
    if (!trunkRef.current || !leafRef.current) return
    for (let i = 0; i < count; i++) {
      const inst = instances[i]
      dummy.position.set(inst.x, inst.isPond ? 0.03 : 0.1, inst.z)
      const s = inst.scale
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      trunkRef.current.setMatrixAt(i, dummy.matrix)

      // foliage sits slightly above trunk
      dummy.position.set(inst.x, inst.isPond ? 0.05 : 0.3, inst.z)
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      leafRef.current.setMatrixAt(i, dummy.matrix)
    }
    trunkRef.current.instanceMatrix.needsUpdate = true
    leafRef.current.instanceMatrix.needsUpdate = true
  }, [instances, count, dummy])

  if (count === 0) return null

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeom, trunkMat, count]} castShadow receiveShadow />
      <instancedMesh ref={leafRef} args={[leafGeom, leafMat, count]} castShadow receiveShadow />
    </group>
  )
}


export function HousesInstancer({ instances }: { instances: HouseInstance[] }) {
  const count = instances.length
  const isNightMode = useStore(s => s.isNightMode)
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const roofRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const bodyGeom = useMemo(() => new THREE.BoxGeometry(0.4, 0.4, 0.4), [])
  const roofGeom = useMemo(() => new THREE.ConeGeometry(0.35, 0.2, 4), [])
  const bodyMat = useMemo(() => getStandardMaterial('residential', isNightMode, { roughness: 0.8 }), [isNightMode])
  const roofMat = useMemo(() => getStandardMaterial('residential', isNightMode, { roughness: 0.9 }), [isNightMode])

  useEffect(() => {
    if (!bodyRef.current || !roofRef.current) return
    for (let i = 0; i < count; i++) {
      const inst = instances[i]
      dummy.position.set(inst.x, 0.2, inst.z)
      dummy.scale.set(inst.scale, inst.scale, inst.scale)
      dummy.updateMatrix()
      bodyRef.current.setMatrixAt(i, dummy.matrix)

      dummy.position.set(inst.x, 0.4 + 0.05, inst.z)
      dummy.rotation.set(0, Math.PI / 4, 0)
      dummy.updateMatrix()
      roofRef.current.setMatrixAt(i, dummy.matrix)
    }
    bodyRef.current.instanceMatrix.needsUpdate = true
    roofRef.current.instanceMatrix.needsUpdate = true
  }, [instances, count, dummy])

  if (count === 0) return null

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[bodyGeom, bodyMat, count]} castShadow receiveShadow />
      <instancedMesh ref={roofRef} args={[roofGeom, roofMat, count]} castShadow receiveShadow />
    </group>
  )
}

export function CarsInstancer({ instances }: { instances: CarInstance[] }) {
  const count = instances.length
  const isNightMode = useStore(s => s.isNightMode)
  const carRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const carGeom = useMemo(() => new THREE.BoxGeometry(0.08, 0.06, 0.16), [])
  const carMat = useMemo(() => getStandardMaterial('road', isNightMode, { roughness: 0.3 }), [isNightMode])

  useEffect(() => {
    if (!carRef.current) return
    // initialize matrices
    for (let i = 0; i < count; i++) {
      const inst = instances[i]
      dummy.position.set(inst.x, 0.05, inst.z)
      dummy.updateMatrix()
      carRef.current.setMatrixAt(i, dummy.matrix)
    }
    carRef.current.instanceMatrix.needsUpdate = true
  }, [instances, count])

  useFrame(({ clock }) => {
    if (!carRef.current) return
    for (let i = 0; i < count; i++) {
      const inst = instances[i]
      const t = clock.elapsedTime * inst.speed + inst.offset
      const pos = Math.sin(t) * 0.4
      if (inst.isXAxis) {
        dummy.position.set(inst.x + pos, 0.05, inst.z)
        dummy.rotation.set(0, Math.cos(t) > 0 ? Math.PI / 2 : -Math.PI / 2, 0)
      } else {
        dummy.position.set(inst.x, 0.05, inst.z + pos)
        dummy.rotation.set(0, Math.cos(t) > 0 ? 0 : Math.PI, 0)
      }
      dummy.updateMatrix()
      carRef.current.setMatrixAt(i, dummy.matrix)
    }
    carRef.current.instanceMatrix.needsUpdate = true
  })

  if (count === 0) return null

  return (
    <instancedMesh ref={carRef} args={[carGeom, carMat, count]} castShadow receiveShadow />
  )
}

export default TreesInstancer
