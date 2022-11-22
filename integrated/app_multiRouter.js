import os

import express from 'express'

import https from 'httpolyglot'
import http from 'http'
import fs from 'fs'
import path from 'path'

import { Server } from 'socket.io'
import mediasoup from 'mediasoup'

// Express application.
// @type {Function}
let app;

//awaitqueueモジュール
const { AwaitQueue } = require('awaitqueue');




// mediasoup Workers.
// @type {Array<mediasoup.Worker>}
const mediasoupWorkers = [];

// ルームを非同期で処理するためのqueue.
// @type {AwaitQueue}
const queue = new AwaitQueue();

const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
	kind: 'video',
	mimeType: 'video/vp8',
	clockRate: 90000,
	parameters:
		{
		  'x-google-start-bitrate': 1000
		}
  },
]

// HTTPS server.
// @type {https.Server}
let httpsServer;


//websocketサーバ
let webSocketServer





// socket.io namespace (could represent a room?)
const connections = io.of('/mediasoup')

run();

async function run(){
	// Run a mediasoup Worker.
	await runMediasoupWorkers();

	await runExpressApp();

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

	app.use('send/sfu/room',express.static(path.join(__dirname, 'public/sendOnly')))
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
	await new Promise((resolve)=>{
		httpsServer.listen(3000, () => {
			logger.info('listening on port: ' + 3000)
		})
	})
}

async function runWebSocketServer(){
	const io = new Server(httpsServer);
	webSocketServer = io.of('/mediasoup')
	webSocketServer.on('connection',async socket=>{
		console.log("socket id",socket.id)
		socket.emit('connection-success', {
			socketId: socket.id,
		})





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
	//serverで保持してるrooms[Mas()]から取得する
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
