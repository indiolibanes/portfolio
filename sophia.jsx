import React, { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations, Environment } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';

// Componente que carrega e controla a Sophia
function SophiaModel({ url }) {
  const group = useRef();
    // Carrega o modelo 3D (certifique-se de colocar o sophia.glb na pasta /public)
      const { scene, animations } = useGLTF(url);
        // Prepara as animações contidas no arquivo (ex: 'Idle', 'Walk')
          const { actions } = useAnimations(animations, group);

            useEffect(() => {
                // Se houver animações feitas no Blender, toca a primeira automaticamente
                    if (actions && Object.keys(actions).length > 0) {
                          const idleAnimation = Object.keys(actions)[0];
                                actions[idleAnimation].play();
                                    }
                                      }, [actions]);

                                        return (
                                            // RigidBody adiciona a física do rapier.rs ao modelo
                                                <RigidBody colliders="hull" type="dynamic">
                                                      <primitive 
                                                              ref={group} 
                                                                      object={scene} 
                                                                              scale={[1.5, 1.5, 1.5]} // Ajuste de tamanho
                                                                                      position={[0, -1, 0]} 
                                                                                            />
                                                                                                </RigidBody>
                                                                                                  );
                                                                                                  }

                                                                                                  // Componente Principal da Aplicação
                                                                                                  export default function PortfolioRevolucionario() {
                                                                                                    return (
                                                                                                        <div style={{ width: '100vw', height: '100vh', backgroundColor: '#f0f0f0' }}>
                                                                                                              <Canvas camera={{ position: [0, 2, 6], fov: 45 }}>
                                                                                                                      {/* Iluminação suave para destacar as cores e constelações */}
                                                                                                                              <ambientLight intensity={0.6} />
                                                                                                                                      <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
                                                                                                                                              <Environment preset="city" /> {/* Reflexos realistas */}

                                                                                                                                                      <Physics gravity={[0, -9.81, 0]}>
                                                                                                                                                                <SophiaModel url="/sophia.glb" />
                                                                                                                                                                          
                                                                                                                                                                                    {/* Chão invisível para ela não cair no infinito */}
                                                                                                                                                                                              <RigidBody type="fixed" position={[0, -1, 0]}>
                                                                                                                                                                                                          <mesh>
                                                                                                                                                                                                                        <boxGeometry args={[10, 0.1, 10]} />
                                                                                                                                                                                                                                      <meshStandardMaterial transparent opacity={0} />
                                                                                                                                                                                                                                                  </mesh>
                                                                                                                                                                                                                                                            </RigidBody>
                                                                                                                                                                                                                                                                    </Physics>

                                                                                                                                                                                                                                                                            {/* Controles de câmera: Zoom, Rotação 360º (Blender-like) */}
                                                                                                                                                                                                                                                                                    <OrbitControls 
                                                                                                                                                                                                                                                                                              enableZoom={true} 
                                                                                                                                                                                                                                                                                                        enablePan={false} 
                                                                                                                                                                                                                                                                                                                  enableRotate={true}
                                                                                                                                                                                                                                                                                                                            minDistance={2} // Zoom in máximo
                                                                                                                                                                                                                                                                                                                                      maxDistance={10} // Zoom out máximo
                                                                                                                                                                                                                                                                                                                                              />
                                                                                                                                                                                                                                                                                                                                                    </Canvas>
                                                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                                                                          );
                                                                                                                                                                                                                                                                                                                                                          }

                                                                                                                                                                                                                                                                                                                                                          // Pre-carrega o modelo para evitar telas em branco
                                                                                                                                                                                                                                                                                                                                                          useGLTF.preload('/sophia.glb');
                                                                                                                                                                                                                                                                                                                                                