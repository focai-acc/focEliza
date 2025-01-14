/**
 * automatic evolution based on Conway's Game of Life rules
 * @param numStr Example：000000000000000000000000010000010100010000100001100000000101000000010000000000111
 * @param step Example：99
 * @returns
 */
export function gameLoop(numStr: string, step: number) {

    let evolutionData = findOnesPositions(numStr);

    const game: any = new GameOfLife()
    evolutionData.forEach((cell: any) => {
        game.addCell(+cell[0], +cell[1])
    })
    let hashrate: number = 0;
    for (let i = 0; i < step; i++) {
        game.step();
        evolutionData = game.activeCells
    }
    return evolutionData.length;
}

class GameOfLife {
    private activeCells: Array<[number, number]>;

    constructor() {
        this.activeCells = [];
    }

    addCell(x: number, y: number): void {
        this.activeCells.push([x, y]);
    }

    removeCell(x: number, y: number): void {
        this.activeCells = this.activeCells.filter(([cx, cy]) => cx !== x || cy !== y);
    }

    isActive(x: number, y: number): boolean {
        return this.activeCells.some(([cx, cy]) => cx === x && cy === y);
    }

    private getNeighbors(x: number, y: number): Array<[number, number]> {
        const neighbors: Array<[number, number]> = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                neighbors.push([x + dx, y + dy]);
            }
        }
        return neighbors;
    }

    private countActiveNeighbors(x: number, y: number): number {
        return this.getNeighbors(x, y).reduce(
            (count, [nx, ny]) => count + (this.isActive(nx, ny) ? 1 : 0),
            0
        );
    }

    step(): void {
        const toEvaluate = new Set<string>();
        const nextState: Array<[number, number]> = [];

        this.activeCells.forEach(([x, y]) => {
            toEvaluate.add(`${x},${y}`);
            this.getNeighbors(x, y).forEach(([nx, ny]) => {
                toEvaluate.add(`${nx},${ny}`);
            });
        });

        toEvaluate.forEach((cell: string) => {
            const [x, y] = cell.split(",").map(Number);
            const isActive = this.isActive(x, y);
            const activeNeighbors = this.countActiveNeighbors(x, y);
            if (
                (isActive && (activeNeighbors === 2 || activeNeighbors === 3)) ||
                (!isActive && activeNeighbors === 3)
            ) {
                nextState.push([x, y]);
            }
        });

        this.activeCells = nextState;
    }
}

function findOnesPositions(binaryString: string): number[][] {
    if (binaryString.length !== 81 && binaryString.length !== 144) {
        throw new Error("The binary string must have exactly 81 or 144 characters.");
    }

    const gridSize = binaryString.length === 81 ? 9 : 12;

    const grid: string[][] = [];
    for (let i = 0; i < binaryString.length; i += gridSize) {
        grid.push(binaryString.slice(i, i + gridSize).split(''));
    }

    const positions: number[][] = [];

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (grid[i][j] === '1') {
                positions.push([i, j]);
            }
        }
    }

    return positions;
}
