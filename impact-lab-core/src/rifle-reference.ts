/** Published launch conditions only. These do NOT calibrate our gel or bone solver. */
export const RIFLE_REFERENCE = Object.freeze({
 id: 'sb-v340842-2026-09-29',
 name: '7.62×39 FMJ · S&B V340842',
 source: 'https://www.sellier-bellot.cz/en/products/rifle-ammunition/rifle-ammunition-training-fmj/detail/216/',
 massKg: .008,
 speedMps: 738,
 testBarrelMm: 520,
});
// Explicit compatibility scale for the existing illustrative material model.
// This scale and material work losses are assumptions, not measured gel properties.
export const JOULES_PER_SIMULATION_UNIT = 1000;
export function kineticEnergy(massKg:number,speedMps:number){return .5*massKg*speedMps*speedMps;}
export function rifleLaunch(){return {...RIFLE_REFERENCE,energyJ:kineticEnergy(RIFLE_REFERENCE.massKg,RIFLE_REFERENCE.speedMps),joulesPerUnit:JOULES_PER_SIMULATION_UNIT};}
export type LaunchReference=ReturnType<typeof rifleLaunch>;
export const RIFLE_INITIAL_ENERGY=rifleLaunch().energyJ/JOULES_PER_SIMULATION_UNIT;
