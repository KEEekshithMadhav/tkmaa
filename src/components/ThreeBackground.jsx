"use client"
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'

function generateParticles(count) {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const colors = new Float32Array(count * 3)
  
  const goldColor = new THREE.Color('#D6B86A')
  const whiteColor = new THREE.Color('#ffffff')
  const blueColor = new THREE.Color('#4a90d9')
  
  for (let i = 0; i < count; i++) {
    // Distribute in a spherical volume with more density at center
    const radius = Math.random() * 12
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)
    
    // Varied sizes for depth
    sizes[i] = Math.random() * 0.03 + 0.005
    
    // Mostly gold with some white and blue accents
    const r = Math.random()
    let color
    if (r < 0.6) color = goldColor
    else if (r < 0.85) color = whiteColor
    else color = blueColor
    
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  return { positions, sizes, colors }
}

function Particles({ count = 4000 }) {
  const points = useRef()
  
  const [{ positions, sizes, colors }] = useState(() => generateParticles(count))

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (points.current) {
      points.current.rotation.y = time * 0.03
      points.current.rotation.x = Math.sin(time * 0.01) * 0.1
      
      // Subtle breathing scale
      const scale = 1 + Math.sin(time * 0.5) * 0.02
      points.current.scale.setScalar(scale)
    }
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.018}
        vertexColors
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// Subtle ambient fog particles
function FogParticles({ count = 800 }) {
  const points = useRef()
  
  const [positions] = useState(() => {
    const temp = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      temp[i * 3] = (Math.random() - 0.5) * 20
      temp[i * 3 + 1] = (Math.random() - 0.5) * 20
      temp[i * 3 + 2] = (Math.random() - 0.5) * 8
    }
    return temp
  })

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (points.current) {
      points.current.rotation.y = -time * 0.01
      points.current.rotation.z = Math.sin(time * 0.05) * 0.05
    }
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#D6B86A"
        transparent
        opacity={0.08}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 -z-10" style={{ background: 'radial-gradient(ellipse at center, #111827 0%, #0B0F19 100%)' }}>
      <Canvas 
        camera={{ position: [0, 0, 6], fov: 75 }}
        gl={{ antialias: false, alpha: true }}
        shadows={false}
        dpr={[1, 1.5]}
      >
        <Particles />
        <FogParticles />
        <fog attach="fog" args={['#0B0F19', 8, 20]} />
      </Canvas>
    </div>
  )
}
