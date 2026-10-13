import { runEngineChecks } from "./utils/engineChecks";

const n = runEngineChecks();
console.log(`engine checks ok (${n.length})`);
