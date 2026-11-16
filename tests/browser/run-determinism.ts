import { runSeededCheckpointScenario } from '../../src/game/determinism-scenario';

const result = document.querySelector<HTMLOutputElement>('#result');
if (!result) throw new Error('Browser determinism test output element is missing.');
const { hashes, match } = runSeededCheckpointScenario(0x51a7);
(window as Window & { __determinismHashes?: string[] }).__determinismHashes = hashes;
result.value = JSON.stringify({ hashes, simulationTick: match.simulationTick });
match.shutdown();
