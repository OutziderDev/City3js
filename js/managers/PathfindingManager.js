import { GRID_SIZE, BLOCK_SIZE, ROAD_WIDTH, DIR_POS_X, DIR_NEG_X, DIR_POS_Z, DIR_NEG_Z } from '../utils/constants.js';

export class PathfindingManager {
  constructor() {
    this.gridSize = GRID_SIZE;
    this.step = BLOCK_SIZE + ROAD_WIDTH;
    this.totalSize = GRID_SIZE * this.step;
    this.halfExtent = this.totalSize / 2;
    this.adjacency = this.buildGraph();
  }

  nodeIndex(row, col) {
    return row * (this.gridSize + 1) + col;
  }

  buildGraph() {
    const adj = new Map();
    const size = this.gridSize + 1;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const idx = this.nodeIndex(r, c);
        const neighbors = [];

        if (r > 0) neighbors.push(this.nodeIndex(r - 1, c));
        if (r < this.gridSize) neighbors.push(this.nodeIndex(r + 1, c));
        if (c > 0) neighbors.push(this.nodeIndex(r, c - 1));
        if (c < this.gridSize) neighbors.push(this.nodeIndex(r, c + 1));

        adj.set(idx, neighbors);
      }
    }

    return adj;
  }

  getPath(fromRow, fromCol, toRow, toCol) {
    const fromIdx = this.nodeIndex(fromRow, fromCol);
    const toIdx = this.nodeIndex(toRow, toCol);

    if (fromIdx === toIdx) return [];

    const size = this.gridSize + 1;
    const visited = new Map();
    const queue = [fromIdx];
    visited.set(fromIdx, null);

    while (queue.length > 0) {
      const current = queue.shift();

      if (current === toIdx) {
        return this.reconstructPath(visited, fromIdx, toIdx);
      }

      const neighbors = this.adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.set(neighbor, current);
          queue.push(neighbor);
        }
      }
    }

    return [];
  }

  reconstructPath(visited, fromIdx, toIdx) {
    const path = [];
    let current = toIdx;

    while (current !== fromIdx) {
      path.unshift(current);
      current = visited.get(current);
    }

    const directions = [];
    for (let i = 0; i < path.length; i++) {
      const from = i === 0 ? fromIdx : path[i - 1];
      const to = path[i];

      const fromRow = Math.floor(from / (this.gridSize + 1));
      const fromCol = from % (this.gridSize + 1);
      const toRow = Math.floor(to / (this.gridSize + 1));
      const toCol = to % (this.gridSize + 1);

      if (toRow < fromRow) directions.push(DIR_NEG_Z);
      else if (toRow > fromRow) directions.push(DIR_POS_Z);
      else if (toCol < fromCol) directions.push(DIR_NEG_X);
      else if (toCol > fromCol) directions.push(DIR_POS_X);
    }

    return directions;
  }

  getRandomDestination(excludeRow, excludeCol) {
    const size = this.gridSize + 1;
    let row, col;
    let attempts = 0;

    do {
      row = Math.floor(Math.random() * size);
      col = Math.floor(Math.random() * size);
      attempts++;
    } while (
      (row === excludeRow && col === excludeCol) &&
      attempts < 100
    );

    return { row, col };
  }

  getRandomEdgeOrigin() {
    const size = this.gridSize;
    const side = Math.floor(Math.random() * 4);

    switch (side) {
      case 0: return { row: 0, col: Math.floor(Math.random() * (size + 1)) };
      case 1: return { row: size, col: Math.floor(Math.random() * (size + 1)) };
      case 2: return { row: Math.floor(Math.random() * (size + 1)), col: 0 };
      case 3: return { row: Math.floor(Math.random() * (size + 1)), col: size };
    }
  }

  createRoute(fromRow, fromCol) {
    const destination = this.getRandomDestination(fromRow, fromCol);
    const directions = this.getPath(fromRow, fromCol, destination.row, destination.col);

    if (directions.length === 0) return null;

    return { directions, destination, currentIndex: 0 };
  }

  getSpawnPosition(originPos, direction, laneOffset, margin = 10) {
    switch (direction) {
      case DIR_POS_X:
        return { x: originPos.x - margin, z: originPos.z - laneOffset };
      case DIR_NEG_X:
        return { x: originPos.x + margin, z: originPos.z + laneOffset };
      case DIR_POS_Z:
        return { x: originPos.x + laneOffset, z: originPos.z - margin };
      case DIR_NEG_Z:
        return { x: originPos.x - laneOffset, z: originPos.z + margin };
    }
  }

  gridToWorld(row, col) {
    return {
      x: -this.halfExtent + col * this.step,
      z: -this.halfExtent + row * this.step
    };
  }

  worldToGrid(x, z) {
    const col = Math.round((x + this.halfExtent) / this.step);
    const row = Math.round((z + this.halfExtent) / this.step);
    return {
      row: Math.max(0, Math.min(this.gridSize, row)),
      col: Math.max(0, Math.min(this.gridSize, col))
    };
  }
}
