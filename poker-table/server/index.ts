import server from './app.js';

server.listen(Number(process.env.PORT ?? 3000), () => console.log('poker server listening'));
