
//設定ファイル
const config = require('./config');
//httpsモジュール
const https = require('https');
//mediasoupモジュール
const mediasoup = require('mediasoup');
//expressモジュール
const express = require('express');
// body-parserモジュール:expressにアクセスしてきたhttpsリクエストをjsonとして解釈する
const bodyParser = require('body-parser');
//awaitqueueモジュール
const { AwaitQueue } = require('awaitqueue');
//Loggerモジュール
const Logger = require('./lib/Logger');
//Roomモジュール
const Room = require('./lib/Room');
//utilsモジュール：JSONのコピーメソッドを持つ
const utils = require('./lib/utils');

const logger = new Logger();

import { Server } from 'socket.io'

// ルームを非同期で処理するためのqueue.
// @type {AwaitQueue}
const queue = new AwaitQueue();

// Map of Room instances indexed by roomName.
// @type {Map<Number, Room>}
const rooms = new Map();

// HTTPS server.
// @type {https.Server}
let httpsServer;

// Express application.
// @type {Function}
let expressApp;

// WebSocket server.
// @type {protoo.WebSocketServer}
let webSocketServer;

// mediasoup Workers.
// @type {Array<mediasoup.Worker>}
const mediasoupWorkers = [];

// Index of next mediasoup Worker to use.
// @type {Number}
let nextMediasoupWorkerIdx = 0;

let webRTCServerCount = 0

run();

async function run(){

	// await svManager();
	console.log("running")
	// Run a mediasoup Worker.
	await runMediasoupWorkers();
	// Create Express app.
	await createExpressApp();
	// Create HttpServer
	await runHttpsServer();

	// Run a protoo WebSocketServer.
	await runWebSocketServer();

	//定時にログを取得し、定時監視する
	// Log rooms status every X seconds.
	setInterval(() =>
	{
		for (const room of rooms.values())
		{
			room.logStatus();
		}
	}, 120000);
}


/**
 * Launch as many mediasoup Workers as given in the configuration file.
 * WorkerをConfig.jsで設定した数、起動する
 */
async function runMediasoupWorkers()
{
	const { numWorkers } = config.mediasoup;
	logger.info('running %d mediasoup Workers...', numWorkers);

	for (let i = 0; i < numWorkers; ++i)
	{
		console.log(`run worker${i}`)
		const worker = await mediasoup.createWorker(
			{
				logLevel   : config.mediasoup.workerSettings.logLevel,
				logTags    : config.mediasoup.workerSettings.logTags,
				rtcMinPort : Number(config.mediasoup.workerSettings.rtcMinPort),
				rtcMaxPort : Number(config.mediasoup.workerSettings.rtcMaxPort)
			});

		worker.on('died', () =>
		{
			logger.error(
				'mediasoup Worker died, exiting  in 2 seconds... [pid:%d]', worker.pid);

			//10秒後にプロセスを終了する
			setTimeout(() => process.exit(1), 2000);
		});

		mediasoupWorkers.push(worker);

		// Each mediasoup Worker will run its own WebRtcServer, so those cannot
		// share the same listening ports. Hence we increase the value in config.js
		// for each Worker.
		const webRtcServerOptions = utils.clone(config.mediasoup.webRtcServerOptions);
		const portIncrement = mediasoupWorkers.length - 1;

		for (const listenInfo of webRtcServerOptions.listenInfos)
		{
			listenInfo.port += portIncrement;
		}

		const webRtcServer = await worker.createWebRtcServer(webRtcServerOptions);

		worker.appData.webRtcServer = webRtcServer;



		// Log worker resource usage every X seconds.
		setInterval(async () =>
		{
			const usage = await worker.getResourceUsage();

			logger.info('mediasoup Worker resource usage [pid:%d]: %o', worker.pid, usage);
		}, 120000);
	}
}

async function createExpressApp(){
	logger.info('create Express App');

	//webappのインスタンス生成
	expressApp = express();

	//httpsリクエストをjsonとして解釈
	expressApp.use(bodyParser.json());

	/**
	 * For every API request, verify that the roomId in the path matches and
	 * existing room.
	 */
	expressApp.param(
		'roomName', (req, res, next, roomName) =>
		{
			// The room must exist for all API requests.
			if (!rooms.has(roomName))
			{
				const error = new Error(`room with id "${roomName}" not found`);

				error.status = 404;
				throw error;
			}

			req.room = rooms.get(roomName);

			next();
		});

		/**
		 * API GET resource that returns the mediasoup Router RTP capabilities of
		 * the room.
		 */
		expressApp.get(
			'/rooms/:roomName', (req, res) =>
			{
				const data = req.room.getRouterRtpCapabilities();

				res.status(200).json(data);
			});


}


/**
 * Create a Node.js HTTPS server. It listens in the IP and port given in the
 * configuration file and reuses the Express application as request listener.
 */
async function runHttpsServer()
{
	logger.info('running an HTTPS server...');

	// HTTPS server for the protoo WebSocket server.
	const tls =
	{
		cert : fs.readFileSync(config.https.tls.cert),
		key  : fs.readFileSync(config.https.tls.key)
	};

	httpsServer = https.createServer(tls, expressApp);

	await new Promise((resolve) =>
	{
		httpsServer.listen(
			Number(config.https.listenPort), config.https.listenIp, resolve);
	});
}
 
async function runWebSocketServer()
{
	logger.info('running WebSocketServer...');

	webSocketServer = new Server(httpsServer);

	webSocketServer.on('connection', async socket =>{
		// The client indicates the roomId and peerId in the URL query.
		const roomName = socket.roomName;
		const socketId = socket.id;

		socket.emit('connection-success', {
			socketId: socket.id,
		})

		if (!roomName || !socketId)
		{
			reject(400, 'Connection request without roomId and/or peerId');

			return;
		}


		logger.info(
			'websocket connection request [roomId:%s, peerId:%s, address:%s, origin:%s]',
			roomId, peerId, info.socket.remoteAddress, info.origin);


			// Serialize this code into the queue to avoid that two peers connecting at
			// the same time with the same roomId create two separate rooms with same
			// roomId.
			queue.push(async () =>
			{
				const room = await getOrCreateRoom({ roomId });

				// Accept the protoo WebSocket connection.
				const protooWebSocketTransport = accept();

				room.handleProtooConnection({ peerId, protooWebSocketTransport });
			})
			.catch((error) =>
			{
				logger.error('room creation or room joining failed:%o', error);

				reject(error);
			});
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
async function getOrCreateRoom({ roomId })
{
	let room = rooms.get(roomId);

	// If the Room does not exist create a new one.
	if (!room)
	{
		logger.info('creating a new Room [roomId:%s]', roomId);

		const mediasoupWorker = getMediasoupWorker();

		room = await Room.create({ mediasoupWorker, roomId });

		rooms.set(roomId, room);
		room.on('close', () => rooms.delete(roomId));
	}

	return room;
}
