
//設定ファイル
const config = require('./config');
// fsモジュール：https通信するためのcertとkeyをファイルから読むため
const fs = require('fs');
//httpsモジュール
const https = require('https');
// urlモジュール
const url = require('url');
// // protoo-serverモジュール：websocket部分
// const protoo = require('protoo-server');
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



const logger = new Logger();

const SFUManager = require('./lib/SFUManager');

const path = require( 'path')


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

// Protoo WebSocket server.
// @type {protoo.WebSocketServer}
let protooWebSocketServer;

// // WebSocket server.
// // @type {protoo.WebSocketServer}
// let webSocketServer;

let webRTCServerCount = 0

run();

async function run(){

	// await svManager();
	console.log("running")

	// Create Express app.
	await runExpressApp();
	// Create HttpServer
	await runHttpsServer();

	await runSFUManager();

}


async function runExpressApp(){

	app = express()

	app.get('*', (req, res, next) => {
	    const path = '/sfu/'
	    try{
	        if (req.path.indexOf(path) == 0 && req.path.length > path.length && req.protocol == 'https'){
				console.log("remoteAddress")
				var remoteAddress = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
				console.log(remoteAddress)
	            return next()
	        }else{
	            return res.redirect(`https://${req.get('host')}${req.originalUrl}`)
	        }
	    }catch(err){
	        logger.error(err)
	    }
	    res.send(`https://{サーバのIPアドレス}/sfu/tvmas のアドレスを再度確認してアクセスしてください`)
	    console.log("アドレス再確認 アクセス")
	})

	// app.use('send/sfu/room',express.static(path.join(__dirname, 'public/sendOnly')))
	app.use('/sfu/:room', express.static(path.join(__dirname, 'public')))
}


/**
 * Create a Node.js HTTPS server. It listens in the IP and port given in the
 * configuration file and reuses the Express application as request listener.
 */
 async function runHttpsServer()
 {
 	// SSL cert for HTTPS access
 	const options = {
 	  key: fs.readFileSync('./ssl/key.pem', 'utf-8'),
 	  cert: fs.readFileSync('./ssl/cert.pem', 'utf-8')
 	}

 	httpsServer = https.createServer(options, app)
 	// await new Promise((resolve)=>{
 	// 	httpsServer.listen(3000, () => {
 	// 		console.log('listening on port: ' + 3000)
 	// 	})
 	// })
 	httpsServer.listen(3000, () => {
 		console.log('listening on port: ' + 3000)
 	})
 }



async function runSFUManager()
{
	const sfuManager = await SFUManager.create(httpsServer);

	sfuManager.run();

}
