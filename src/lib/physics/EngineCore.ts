import Matter from "matter-js";
import { MemoryType } from "@/types/memory";

// Physical profiles for different memory types.
// Keep the older light, bouncy jar feel while the UI layer handles easy clicking.
export const MEMORY_PHYSICS_PROFILES: Record<MemoryType, Matter.IBodyDefinition> = {
  promise: { mass: 2, friction: 0.05, restitution: 0.6, frictionAir: 0.005 },
  letter: { mass: 0.5, friction: 0.05, restitution: 0.7, frictionAir: 0.01 },
  photo: { mass: 0.8, friction: 0.05, restitution: 0.65, frictionAir: 0.005 },
  voice: { mass: 3, friction: 0.05, restitution: 0.5, frictionAir: 0.005 },
  video: { mass: 2.5, friction: 0.05, restitution: 0.55, frictionAir: 0.005 },
  wish: { mass: 0.2, friction: 0.01, restitution: 0.8, frictionAir: 0.015 },
  travel: { mass: 0.6, friction: 0.05, restitution: 0.6, frictionAir: 0.01 },
  gratitude: { mass: 0.1, friction: 0.01, restitution: 0.75, frictionAir: 0.02 },
  random_thought: { mass: 0.3, friction: 0.05, restitution: 0.7, frictionAir: 0.01 },
};

// Default sizes relative to jar width (e.g. 0.2 = 20% of jar width).
export const MEMORY_SIZES: Record<MemoryType, { width: number; height: number }> = {
  promise: { width: 0.05, height: 0.04 },
  letter: { width: 0.05, height: 0.03 },
  photo: { width: 0.05, height: 0.06 },
  voice: { width: 0.05, height: 0.03 },
  video: { width: 0.05, height: 0.05 },
  wish: { width: 0.04, height: 0.04 },
  travel: { width: 0.055, height: 0.035 },
  gratitude: { width: 0.045, height: 0.03 },
  random_thought: { width: 0.04, height: 0.025 },
};

export interface NormalizedVisualState {
  id: string; // The memory id
  type: MemoryType;
  status: "sealed" | "unlocked" | "opening";
  capsuleStyle: "vintage_parcel" | "ribbon_box" | "wax_capsule" | "glass_capsule" | "wooden_box" | "silk_envelope" | null;
  unlockAt: string | null;
  isCollaborative: boolean;
  x: number; // 0 to 1
  y: number; // 0 to 1
  rotation: number;
  scale: number;
  vx: number;
  vy: number;
  isSleeping: boolean;
  z_index?: number;
}

export class EngineCore {
  public engine: Matter.Engine;
  public runner: Matter.Runner;
  private width: number;
  private height: number;
  private bodiesMap: Map<string, Matter.Body> = new Map();
  private metaMap: Map<string, { status: NormalizedVisualState["status"], capsuleStyle: NormalizedVisualState["capsuleStyle"], unlockAt: string | null, isCollaborative: boolean }> = new Map();
  private updateCallback?: (states: NormalizedVisualState[]) => void;
  private sleepCallback?: (id: string, state: NormalizedVisualState) => void;
  private wakeCallback?: (id: string) => void;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    
    this.engine = Matter.Engine.create({
      enableSleeping: true,
      positionIterations: 6,
      velocityIterations: 4,
    });
    
    // Setup Jar boundaries
    this.setupBoundaries();

    // Setup event listeners
    Matter.Events.on(this.engine, "afterUpdate", this.handleUpdate.bind(this));

    this.runner = Matter.Runner.create();
  }

  public start() {
    Matter.Runner.run(this.runner, this.engine);
  }

  public stop() {
    Matter.Runner.stop(this.runner);
    Matter.Engine.clear(this.engine);
  }

  public pause() {
    this.runner.enabled = false;
  }

  public resume() {
    this.runner.enabled = true;
  }

  public onUpdate(cb: (states: NormalizedVisualState[]) => void) {
    this.updateCallback = cb;
  }

  public onSleep(cb: (id: string, state: NormalizedVisualState) => void) {
    this.sleepCallback = cb;
  }

  public onWake(cb: (id: string) => void) {
    this.wakeCallback = cb;
  }

  public updateDimensions(width: number, height: number) {
    // Resize boundaries proportionally and wake all bodies
    const scaleX = width / this.width;
    const scaleY = height / this.height;
    
    this.width = width;
    this.height = height;

    // Remove old boundaries
    const staticBodies = Matter.Composite.allBodies(this.engine.world).filter(b => b.isStatic);
    Matter.Composite.remove(this.engine.world, staticBodies);
    
    // Create new boundaries
    this.setupBoundaries();

    // Scale and reposition existing dynamic bodies
    this.bodiesMap.forEach(body => {
      Matter.Body.setPosition(body, {
        x: body.position.x * scaleX,
        y: body.position.y * scaleY
      });
      // Wake up to re-settle
      Matter.Sleeping.set(body, false);
    });
  }

  private setupBoundaries() {
    const wallThickness = 100;

    // Keep the older bucket shape, with the floor slightly lower so the pile sits in the glass base.
    const bottom = Matter.Bodies.rectangle(this.width / 2, this.height * 0.965, this.width, wallThickness, {
      isStatic: true,
      friction: 0.3,
      restitution: 0.2
    });

    const leftWall = Matter.Bodies.rectangle(-wallThickness / 2 + (this.width * 0.25), this.height / 2, wallThickness, this.height * 1.5, {
      isStatic: true,
      angle: 0
    });

    const rightWall = Matter.Bodies.rectangle(this.width + wallThickness / 2 - (this.width * 0.25), this.height / 2, wallThickness, this.height * 1.5, {
      isStatic: true,
      angle: 0
    });

    Matter.Composite.add(this.engine.world, [bottom, leftWall, rightWall]);
  }

  // Load an existing memory from the database
  public loadMemory(id: string, type: MemoryType, state: NormalizedVisualState) {
    if (this.bodiesMap.has(id)) return;
    
    this.metaMap.set(id, {
      status: state.status,
      capsuleStyle: state.capsuleStyle,
      unlockAt: state.unlockAt,
      isCollaborative: state.isCollaborative
    });

    const size = MEMORY_SIZES[type];
    const pxW = size.width * this.width;
    const pxH = size.height * this.width; // scaling height relative to jar width to maintain aspect ratio!

    const body = Matter.Bodies.rectangle(
      state.x * this.width, 
      state.y * this.height, 
      pxW, 
      pxH, 
      {
        ...MEMORY_PHYSICS_PROFILES[type],
        angle: state.rotation,
        label: `${id}|${type}`,
        chamfer: { radius: Math.min(pxW, pxH) * 0.45 }
      }
    );

    Matter.Body.setVelocity(body, { x: state.vx, y: state.vy });
    
    // Set sleeping if the DB says it was sleeping
    if (state.isSleeping) {
      Matter.Sleeping.set(body, true);
    }

    this.bodiesMap.set(id, body);
    Matter.Composite.add(this.engine.world, body);
  }

  // Drop a brand new memory
  public dropMemory(id: string, type: MemoryType, stateExt: { status: NormalizedVisualState["status"], capsuleStyle: NormalizedVisualState["capsuleStyle"], unlockAt: string | null, isCollaborative: boolean } = { status: 'sealed', capsuleStyle: null, unlockAt: null, isCollaborative: false }) {
    if (this.bodiesMap.has(id)) return;

    this.metaMap.set(id, stateExt);

    const size = MEMORY_SIZES[type];
    const pxW = size.width * this.width;
    const pxH = size.height * this.width;

    const body = Matter.Bodies.rectangle(
      this.width / 2 + (Math.random() * 20 - 10),
      -pxH,
      pxW, 
      pxH, 
      {
        ...MEMORY_PHYSICS_PROFILES[type],
        angle: Math.random() * Math.PI,
        label: `${id}|${type}`,
        chamfer: { radius: Math.min(pxW, pxH) * 0.45 }
      }
    );

    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.5);

    this.bodiesMap.set(id, body);
    Matter.Composite.add(this.engine.world, body);
  }

  public pokeMemory(id: string) {
    const body = this.bodiesMap.get(id);
    if (body) {
      Matter.Sleeping.set(body, false);
      Matter.Body.applyForce(body, body.position, {
        x: (Math.random() - 0.5) * 0.05 * body.mass,
        y: -0.05 * body.mass
      });
    }
  }

  public removeMemory(id: string) {
    const body = this.bodiesMap.get(id);
    if (body) {
      Matter.Composite.remove(this.engine.world, body);
      this.bodiesMap.delete(id);
      this.metaMap.delete(id);
    }
  }

  /**
   * Update metadata on an existing physics body.
   * The body position, velocity and rotation are preserved.
   * Only the metaMap entry is updated (status, capsuleStyle, unlockAt, isCollaborative).
   */
  public updateMemoryMeta(id: string, meta: Partial<{ status: NormalizedVisualState["status"], capsuleStyle: NormalizedVisualState["capsuleStyle"], unlockAt: string | null, isCollaborative: boolean }>) {
    const existing = this.metaMap.get(id);
    if (!existing) return; // body not in world, nothing to do
    this.metaMap.set(id, { ...existing, ...meta });
  }

  private handleUpdate() {
    if (!this.updateCallback) return;
    
    const states: NormalizedVisualState[] = [];
    
    this.bodiesMap.forEach((body, id) => {
      const parts = body.label.split("|");
      const type = parts[1] as MemoryType;
      const meta = this.metaMap.get(id);

      const state: NormalizedVisualState = {
        id,
        type,
        status: meta?.status || 'sealed',
        capsuleStyle: meta?.capsuleStyle || null,
        unlockAt: meta?.unlockAt || null,
        isCollaborative: meta?.isCollaborative || false,
        x: body.position.x / this.width,
        y: body.position.y / this.height,
        rotation: body.angle,
        scale: 1, // physics engine handles base scale, any pop effects are React side
        vx: body.velocity.x,
        vy: body.velocity.y,
        isSleeping: body.isSleeping
      };

      states.push(state);

      // Detect sleep transition
      const wasSleeping = body.plugin.wasSleeping || false;
      if (body.isSleeping && !wasSleeping) {
        if (this.sleepCallback) this.sleepCallback(id, state);
      } else if (!body.isSleeping && wasSleeping) {
        if (this.wakeCallback) this.wakeCallback(id);
      }
      body.plugin.wasSleeping = body.isSleeping;
    });

    this.updateCallback(states);
  }
}
