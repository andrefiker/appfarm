import server, { poker } from './app.js';

await poker.tick();
const timer = setInterval(() => { void poker.tick(); }, 1_000);
timer.unref();
server.listen(Number(process.env.PORT ?? 3000), () => console.log('poker server listening'));
