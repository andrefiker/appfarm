export const soundThemes = ['classic','wood','marble','orchestra','cartoon'] as const;
export type SoundTheme = typeof soundThemes[number];
export function readSoundTheme(value:unknown):SoundTheme {return soundThemes.includes(value as SoundTheme)?value as SoundTheme:'classic';}
export const themeVoices:Record<SoundTheme,{wave:OscillatorType;pitch:number;end:number;duration:number;beats:number[]}>= {
 classic:{wave:'sine',pitch:988,end:988,duration:.21,beats:[0,.085]},
 wood:{wave:'triangle',pitch:320,end:110,duration:.065,beats:[0]},
 marble:{wave:'sine',pitch:1800,end:1100,duration:.11,beats:[0,.035]},
 orchestra:{wave:'sine',pitch:523.25,end:523.25,duration:.24,beats:[0,.09,.18]},
 cartoon:{wave:'triangle',pitch:240,end:720,duration:.15,beats:[0,.12]},
};
