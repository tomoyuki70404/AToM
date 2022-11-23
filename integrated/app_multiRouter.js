const os = require('os')

const express = require('express')
const https = require( 'httpolyglot')
const http = require( 'http')
const fs = require( 'fs')
const path = require( 'path')

const { Server } = require( 'socket.io')
const mediasoup = require( 'mediasoup')
//awaitqueueモジュール
const { AwaitQueue } = require( 'awaitqueue')

// Express application.
// @type {Function}
let app;

const Logger = require('./lib/Logger');

const Room = require('./lib/Room');


const logger = new Logger();

// websocketserverのもとを作成
let io

// mediasoup Workers.
// @type {Array<mediasoup.Worker>}
let mediasoupWorkers = [];

// ルームを非同期で処理するためのqueue.
// @type {AwaitQueue}
let queue = new AwaitQueue();

// Map of Room instances indexed by roomId.
// @type {Map<Number, Room>}
let rooms = new Map();

// HTTPS server.
// @type {https.Server}
let httpsServer;


//websocketサーバ
let webSocketServer


// socket.io namespace (could represent a room?)
let connections

// workerのカウント用インデックス
let nextMediasoupWorkerIdx = 0


run();

async function run(){
	// Run a mediasoup Worker.
	await runMediasoupWorkers();

	await runExpressApp();

	await runHttpsServer();

	await runWebSocketServer();

}

async function runMediasoupWorkers()
{
	const numWorkers = Object.keys(os.cpus()).length;
	console.log('running %d mediasoup Workers...', numWorkers);

	for (let i = 0; i < numWorkers; ++i)
	{
		console.log(`run worker${i}`)
		const worker = await mediasoup.createWorker(
			{
				// Loggerを動かすときに要変更
				// logLevel   : config.mediasoup.workerSettings.logLevel,
				// logTags    : config.mediasoup.workerSettings.logTags,
				rtcMinPort : 40000,
				rtcMaxPort : 49999,
			});

		worker.on('died', () =>
		{
			logger.error(
				'mediasoup Worker died, exiting  in 2 seconds... [pid:%d]', worker.pid);

			//10秒後にプロセスを終了する
			setTimeout(() => process.exit(1), 2000);
		});
		// cpuのコア数分workerを起動
		mediasoupWorkers.push(worker);
	}
}

async function runExpressApp(){

	app = express()

	app.get('*', (req, res, next) => {
	    const path = '/sfu/'
	    try{
	        if (req.path.indexOf(path) == 0 && req.path.length > path.length && req.protocol == 'https'){
				logger.info("remoteAddress")
				var remoteAddress = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
				logger.info(remoteAddress)
	            return next()
	        }else{
	            return res.redirect(`https://${req.get('host')}${req.originalUrl}`)
	        }
	    }catch(err){
	        logger.error(err)
	    }
	    res.send(`https://{サーバのIPアドレス}/sfu/tvmas のアドレスを再度確認してアクセスしてください`)
	    logger.info("アドレス再確認 アクセス")
	})

	// app.use('send/sfu/room',express.static(path.join(__dirname, 'public/sendOnly')))
	app.use('/sfu/:room', express.static(path.join(__dirname, 'public')))
}

async function runHttpsServer()
{
	// SSL cert for HTTPS access
	const options = {
	  key: fs.readFileSync('./server/ssl/key.pem', 'utf-8'),
	  cert: fs.readFileSync('./server/ssl/cert.pem', 'utf-8')
	}

	httpsServer = https.createServer(options, app)
	// await new Promise((resolve)=>{
	// 	httpsServer.listen(3000, () => {
	// 		logger.info('listening on port: ' + 3000)
	// 	})
	// })
	httpsServer.listen(3000, () => {
		logger.info('listening on port: ' + 3000)
	})
}

async function runWebSocketServer(){
	io = new Server(httpsServer);

	// websocketでroomNameを取得して代入
	// queryをパースして取得など
	const roomName = "tempName"

	// mediasoupのnamespaceであるsocketを作成
	webSocketServerConnection = io.of('/mediasoup')

	webSocketServerConnection.on('connection',async socket =>{


		queue.push(async () =>{
			// ルームを作成or取得する
			const room = await getOrCreateRoom({ roomName })
			console.log("complete!!!!")

			room.handleWebRtcConnection({socket, webSocketServerConnection})
		})
	})



}

/**
 * Get next mediasoup Worker.
 */
function getMediasoupWorker()
{
	const worker = mediasoupWorkers[nextMediasoupWorkerIdx];

	if (++nextMediasoupWorkerIdx === mediasoupWorkers.length)
		nextMediasoupWorkerIdx = 0;

	return worker;
}

/**
 * Get a Room instance (or create one if it does not exist).
 */
async function getOrCreateRoom({ roomName })
{
	//serverで保持してるrooms[Mas()]から取得する
	let room = rooms.get(roomName);

	// If the Room does not exist create a new one.
	if (!room)
	{
		logger.info('creating a new Room [roomName:%s]', roomName);

		const mediasoupWorker = getMediasoupWorker();

		room = await Room.create({ mediasoupWorker, roomName });

		rooms.set(roomName, room);
		room.on('close', () => rooms.delete(roomName));
	}

	return room;
}