
//設定ファイル
const config = require('./config');

//httpsモジュール
const https = require('https');
//websocketモジュール
const socket = require('socket.io')
//mediasoupモジュール
const mediasoup = require('mediasoup');
//expressモジュール
const express = require('express');
//awaitqueueモジュール
const { AwaitQueue } = require('awaitqueue');
//Loggerモジュール
const Logger = require('./lib/Logger');
//Roomモジュール
const Room = require('./lib/Room');
//utilsモジュール：JSONのコピーメソッドを持つ
const utils = require('./lib/utils');

const logger = new Logger();

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

		// Create a WebRtcServer in this Worker.
		// if (process.env.MEDIASOUP_USE_WEBRTC_SERVER !== 'false')
		// {
		// 	// Each mediasoup Worker will run its own WebRtcServer, so those cannot
		// 	// share the same listening ports. Hence we increase the value in config.js
		// 	// for each Worker.
		// 	const webRtcServerOptions = utils.clone(config.mediasoup.webRtcServerOptions);
		// 	const portIncrement = mediasoupWorkers.length - 1;
		//
		// 	for (const listenInfo of webRtcServerOptions.listenInfos)
		// 	{
		// 		listenInfo.port += portIncrement;
		// 	}
		//
		// 	const webRtcServer = await worker.createWebRtcServer(webRtcServerOptions);
		//
		// 	worker.appData.webRtcServer = webRtcServer;
		// }
		if(webRTCServerCount == 0){
			const webRtcServerOptions = utils.clone(config.mediasoup.webRtcServerOptions);
			const webRtcServer = await worker.createWebRtcServer(webRtcServerOptions);
			worker.appData.webRtcServer = webRtcServer;
		}


		// Log worker resource usage every X seconds.
		setInterval(async () =>
		{
			const usage = await worker.getResourceUsage();

			logger.info('mediasoup Worker resource usage [pid:%d]: %o', worker.pid, usage);
		}, 120000);
	}
}
