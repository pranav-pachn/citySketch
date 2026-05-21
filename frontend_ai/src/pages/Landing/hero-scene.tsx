import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Grid, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from '@/entities/store/useStore'
import { getStandardMaterial } from '@/shared/three/materials'

function CityBlocks() {
  const blocks = useMemo(() => {
    const items: Array<{ x: number; z: number; h: number; t: string }> = [];
    const palette = ["#69d7e9", "#7de9ff", "#d5ff66"];

    for (let x = -4; x <= 4; x += 1) {
      for (let z = -3; z <= 3; z += 1) {
        const roadRow = x === 0 || z === 0;
        if (roadRow) {
          continue;
        }

        const seed = Math.abs(Math.sin(x * 2.13 + z * 1.73));
        const h = 0.25 + seed * 1.6;
        const t = palette[Math.floor(seed * palette.length) % palette.length];
        items.push({ x, z, h, t });
      }
    }

    return items;
  }, []);

  const isNightMode = useStore(s => s.isNightMode)

  return (
    <group>
      {blocks.map((block, idx) => (
        <mesh key={idx} position={[block.x * 0.48, block.h / 2, block.z * 0.48]} castShadow material={getStandardMaterial('heroBlock', isNightMode, { color: block.t, emissive: block.t, emissiveIntensity: 0.08, roughness: 0.22, metalness: 0.64 })}>
          <boxGeometry args={[0.34, block.h, 0.34]} />
        </mesh>
      ))}

      <mesh position={[0, 0.01, 0]} receiveShadow material={getStandardMaterial('heroBase', isNightMode, { color: '#0c131b', roughness: 0.92, metalness: 0.1 })}>
        <boxGeometry args={[4.8, 0.02, 3.6]} />
      </mesh>
    </group>
  );
}

function ScanLine() {
  const lineRef = useRef<THREE.Mesh>(null);
  const tRef = useRef(0);

  const isNightMode = useStore(s => s.isNightMode)

  useFrame((_, delta) => {
    tRef.current += delta * 0.42;
    const sweep = Math.sin(tRef.current) * 1.5;

    if (lineRef.current) {
      lineRef.current.position.z = sweep;
    }
  });

  return (
    <mesh ref={lineRef} position={[0, 0.03, 0]} material={getStandardMaterial('scan', isNightMode, { color: '#d5ff66', emissive: '#d5ff66', emissiveIntensity: 0.42 })}>
      <boxGeometry args={[4.7, 0.01, 0.16]} />
    </mesh>
  );
}

export function HeroScene() {
  return (
    <div className="hero-scene-wrap">
      <Canvas camera={{ position: [2.2, 2.4, 3.8], fov: 44 }} dpr={[1, 1.8]} shadows="percentage">
        <color attach="background" args={["#05080d"]} />
        <ambientLight intensity={0.42} />
        <directionalLight position={[3, 6, 1]} intensity={1.2} color="#d8ff80" castShadow />
        <pointLight position={[-2, 1.3, -2]} intensity={0.8} color="#7de9ff" />
        <Stars radius={20} depth={14} count={500} factor={1.8} saturation={0} fade speed={0.25} />
        <Grid
          args={[6, 5]}
          cellColor="#183246"
          sectionColor="#254a66"
          fadeDistance={12}
          fadeStrength={1.4}
          position={[0, 0, 0]}
        />
        <Float speed={1.1} rotationIntensity={0.2} floatIntensity={0.25}>
          <CityBlocks />
        </Float>
        <ScanLine />
      </Canvas>
    </div>
  );
}
