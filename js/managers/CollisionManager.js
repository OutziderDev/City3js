import {
  CAR_LENGTH, CAR_WIDTH, BUS_LENGTH, BUS_WIDTH,
  ROAD_WIDTH, SIDEWALK_HEIGHT,
  DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z,
  CAR_STOP_GAP, PERSON_HIT_RADIUS
} from '../utils/constants.js';

export class CollisionManager {
  constructor(vehicleManager, busManager, pedestrianManager, gridManager) {
    this.vehicleManager = vehicleManager;
    this.busManager = busManager;
    this.pedestrianManager = pedestrianManager;
    this.buildings = gridManager.buildings;
    this.blockedSet = new Set();
  }

  update() {
    this.blockedSet.clear();
    const vehicles = this.getVehicles();
    this.resolveVehicleCollisions(vehicles);
    this.resolvePedestrianBuildingCollisions();
    this.resolveVehiclePedestrianCollisions(vehicles);
  }

  isBlocked(entity) {
    return this.blockedSet.has(entity);
  }

  getVehicles() {
    const vehicles = [];
    for (const car of this.vehicleManager.cars) {
      vehicles.push({ entity: car, type: 'car' });
    }
    for (const bus of this.busManager.buses) {
      if (bus.alive) {
        vehicles.push({ entity: bus, type: 'bus' });
      }
    }
    return vehicles;
  }

  getVehicleHalfLength(type) {
    return type === 'bus' ? BUS_LENGTH / 2 : CAR_LENGTH / 2;
  }

  resolveVehicleCollisions(vehicles) {
    for (let i = 0; i < vehicles.length; i++) {
      const a = vehicles[i];
      const posA = a.entity.group.position;
      const dirA = a.entity.direction;
      const axisA = this.getAxis(dirA);

      for (let j = 0; j < vehicles.length; j++) {
        if (i === j) continue;
        const b = vehicles[j];
        const posB = b.entity.group.position;
        const dirB = b.entity.direction;

        if (this.getAxis(dirB) !== axisA) continue;
        if (this.isOppositeDirection(dirA, dirB)) continue;

        const perpDist = axisA === 'x'
          ? Math.abs(posA.z - posB.z)
          : Math.abs(posA.x - posB.x);

        if (perpDist > ROAD_WIDTH / 2) continue;

        const isAhead = this.isAhead(posA, posB, dirA);
        if (!isAhead) continue;

        const alongDist = axisA === 'x'
          ? posB.x - posA.x
          : posB.z - posA.z;

        const myHalf = this.getVehicleHalfLength(a.type);
        const otherHalf = this.getVehicleHalfLength(b.type);
        const gap = alongDist - myHalf - otherHalf;

        if (gap < CAR_STOP_GAP) {
          this.blockedSet.add(a.entity);
        }
      }
    }
  }

  resolvePedestrianBuildingCollisions() {
    const personHalf = 0.2;
    for (const person of this.pedestrianManager.people) {
      if (!person.alive) continue;
      const px = person.group.position.x;
      const pz = person.group.position.z;

      for (const bld of this.buildings) {
        const hw = bld.width / 2;
        const hd = bld.depth / 2;

        if (px + personHalf > bld.x - hw && px - personHalf < bld.x + hw &&
            pz + personHalf > bld.z - hd && pz - personHalf < bld.z + hd) {
          person.group.position.copy(person.previousPosition);
          person.direction = (person.direction + (Math.random() > 0.5 ? 1 : 3)) % 4;
          person.turnTimer = 0;
          break;
        }
      }
    }
  }

  resolveVehiclePedestrianCollisions(vehicles) {
    for (const v of vehicles) {
      const vPos = v.entity.group.position;
      const vHalf = this.getVehicleHalfLength(v.type);

      for (const person of this.pedestrianManager.people) {
        if (!person.alive) continue;
        const pPos = person.group.position;

        if (Math.abs(pPos.y - SIDEWALK_HEIGHT) > 0.1) continue;

        const dx = vPos.x - pPos.x;
        const dz = vPos.z - pPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < vHalf + PERSON_HIT_RADIUS) {
          person.alive = false;
        }
      }
    }
  }

  getAxis(direction) {
    return (direction === DIR_POS_X || direction === DIR_NEG_X) ? 'x' : 'z';
  }

  isAhead(posA, posB, direction) {
    switch (direction) {
      case DIR_POS_X: return posB.x > posA.x;
      case DIR_NEG_X: return posB.x < posA.x;
      case DIR_POS_Z: return posB.z > posA.z;
      case DIR_NEG_Z: return posB.z < posA.z;
    }
    return false;
  }

  isOppositeDirection(dirA, dirB) {
    return (dirA === DIR_POS_X && dirB === DIR_NEG_X) ||
           (dirA === DIR_NEG_X && dirB === DIR_POS_X) ||
           (dirA === DIR_POS_Z && dirB === DIR_NEG_Z) ||
           (dirA === DIR_NEG_Z && dirB === DIR_POS_Z);
  }
}
