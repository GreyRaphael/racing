import * as THREE from 'three';

import { Kart } from '../kart/Kart';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
}

export class ParticleSystem {
  readonly group = new THREE.Group();
  private readonly particles: Particle[] = [];
  private readonly pool: Particle[] = [];
  private dustColor = 0xd8c49a;
  private readonly dustMaterial = new THREE.MeshBasicMaterial({ color: 0xd8c49a, transparent: true, opacity: 0.45 });

  constructor(maxParticles = 100) {
    for (let i = 0; i < maxParticles; i += 1) {
      const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.12, 0), this.dustMaterial.clone());
      mesh.visible = false;
      this.group.add(mesh);
      this.pool.push({ mesh, velocity: new THREE.Vector3(), age: 0, lifetime: 1 });
    }
  }

  setDustColor(color: number): void {
    this.dustColor = color;
  }

  update(delta: number, kart: Kart): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.age += delta;
      if (particle.age >= particle.lifetime) {
        particle.mesh.visible = false;
        this.pool.push(particle);
        this.particles.splice(index, 1);
        continue;
      }
      particle.velocity.y -= 2.5 * delta;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      const life = 1 - particle.age / particle.lifetime;
      particle.mesh.scale.setScalar(0.45 + (1 - life) * 1.1);
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = life * 0.46;
    }
    if (kart.isOffRoad || kart.isDrifting) this.spawnDust(kart);
  }

  spawnDust(kart: Kart): void {
    const particle = this.pool.pop();
    if (!particle) return;
    particle.mesh.visible = true;
    const material = particle.mesh.material as THREE.MeshBasicMaterial;
    material.color.set(kart.isDrifting ? 0xffd05e : this.dustColor);
    material.opacity = kart.isDrifting ? 0.8 : 0.45;
    particle.mesh.position.copy(kart.position).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.25, (Math.random() - 0.5) * 0.8));
    particle.mesh.rotation.set(Math.random(), Math.random(), Math.random());
    particle.velocity.set((Math.random() - 0.5) * 1.5, 1.1 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5);
    particle.age = 0;
    particle.lifetime = kart.isDrifting ? 0.35 : 0.7;
    this.particles.push(particle);
  }

  burst(position: THREE.Vector3): void {
    for (let i = 0; i < 8; i += 1) {
      const particle = this.pool.pop();
      if (!particle) return;
      particle.mesh.visible = true;
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.color.set(0xffd05e);
      material.opacity = 0.8;
      particle.mesh.position.copy(position);
      particle.velocity.set((Math.random() - 0.5) * 4, 1 + Math.random() * 3, (Math.random() - 0.5) * 4);
      particle.age = 0;
      particle.lifetime = 0.35 + Math.random() * 0.3;
      this.particles.push(particle);
    }
  }

  dispose(): void {
    for (const p of this.pool) {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    for (const p of this.particles) {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.dustMaterial.dispose();
    this.group.clear();
  }
}
