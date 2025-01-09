import fs from "fs";
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ethers = require("ethers");
const abi = require("./abi.json")
const GreenfieldSDK = require('@bnb-chain/greenfield-js-sdk');
const { NodeAdapterReedSolomon } = require('@bnb-chain/reed-solomon/node.adapter');

const { Client } = GreenfieldSDK;
//GreenField test RPC
const greenFieldRpc = 'https://gnfd-testnet-fullnode-tendermint-ap.bnbchain.org';
const client = Client.create(greenFieldRpc, '5600');
const rs = new NodeAdapterReedSolomon();

//BSC test RPC
const rpc = "https://bsc-testnet-rpc.publicnode.com";
//private key
const key = '';
const wallet = new ethers.Wallet(key, new ethers.JsonRpcProvider(rpc));
//contract address
const contractAddress = '';
const bitlifeAutorun = new ethers.Contract(contractAddress, abi, wallet);
//life gene
const numstr = '';
//life born time
const lifeBornTime = 1736401320000;
//life one step time
const stepTime = 60000;
//character
const youngCharacter = 'young.character.json';
const midCharacter = 'mid.character.json';
const oldCharacter = 'old.character.json';


export async function evo() {

    var nowTime = new Date().getTime();
    var step = Math.floor((nowTime - lifeBornTime)/stepTime)
    if(step > 0){
        var hashrate = gameLoop(numstr, step);
        postHashRate(step, hashrate);
        if(step > 4000){
            //todo generate agent.character.json
            //upload
            upload('agent.character.json');
        }else if(step > 2016){
            await download('old/' + oldCharacter, oldCharacter);
            return oldCharacter;
        }else if(step > 1440){
            await download('mid/' + midCharacter, midCharacter);
            return midCharacter;
        }else if(step > 864){
            await download('young/' + youngCharacter, youngCharacter);
            return youngCharacter;
        }
    }
    return null;
}

export async function getHashRate(): Promise<any> {
    const bitlife1 = await bitlifeAutorun.bitlifes("1");
    return bitlife1[2];
}

export async function postHashRate(step: number, hashrate: number): Promise<void> {
    await bitlifeAutorun.change("1", step, hashrate);
}

export async function download(path:string, objectName:string) {
    const filePath = '../characters/' + objectName;

    if (fs.existsSync(filePath)) {
        console.log(`File ${filePath} already exists. Skipping download.`);
        return;
    }
    const res = await client.object.getObject(
        {
            bucketName: 'cellula',
            objectName: path,
        },
        {
            type: 'ECDSA',
            privateKey: key,
        }
    ).then((res) => {res.body.arrayBuffer().then(buffer => {
            const nodeBuffer = Buffer.from(buffer);
            fs.writeFileSync('../characters/' + objectName, nodeBuffer); })
            .catch(err => { console.error('Error:', err); });
    })
}

export async function upload(objectName:string) {
    const filePath = '../characters/' + objectName;
    const file = createFile(filePath);

    const res = await client.object.delegateUploadObject(
      {
        bucketName: 'cellula',
        objectName: 'agent/'+objectName,
        body: file,
        delegatedOpts: {
          visibility: GreenfieldSDK.VisibilityType.VISIBILITY_TYPE_PRIVATE,
        },
      },
      {
        type: 'ECDSA',
        privateKey: key,
      },
    );
}

function createFile(path) {
    const stats = fs.statSync(path);
    const fileSize = stats.size;

    return {
      name: path,
      type: '',
      size: fileSize,
      content: fs.readFileSync(path),
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

export function gameLoop(numStr: string, step: number) {

    let evolutionData = findOnesPositions(numStr);

    const game: any = new GameOfLife()
    evolutionData.forEach((cell: any) => {
        game.addCell(+cell[0], +cell[1])
    })
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
