// 設定ファイル
const config = require('../config');

//utilsモジュール：JSONのコピーメソッドを持つ
const utils = require('./utils');

// websocketサーバ
const { Server } = require( 'socket.io')

//mediasoupモジュール
const mediasoup = require('mediasoup');

//awaitqueueモジュール
const { AwaitQueue } = require('awaitqueue')

// ルームを非同期で処理するためのqueue.
// @type {AwaitQueue}
let queue = new AwaitQueue();

const RoomManager = require('./RoomManager')

class SFUManager {

	constructor({
		httpsServer,
		workers
	}){

		this._workers = workers;

		this._RoomManagers = new Map();

		this._httpsServer = httpsServer;

	}


	static async create(httpsServer){

		const workers = await this.startMediasoupWorkers();

		return new SFUManager(
		{
			httpsServer,
			workers
		});

	}

	/**
	 * Launch as many mediasoup Workers as given in the configuration file.
	 * WorkerをConfig.jsで設定した数、起動する
	 */
	static async startMediasoupWorkers()
	{
		const mediasoupWorkers = new Array();
		const { runWorkersNum } = config.mediasoup;

		for (let i = 0; i < runWorkersNum; ++i)
		{
			console.log(`run worker${i}`)
			const worker = await mediasoup.createWorker(
				{
					// logLevel   : config.mediasoup.workerSettings.logLevel,
					// logTags    : config.mediasoup.workerSettings.logTags,
					// rtcMinPort : Number(config.mediasoup.workerSettings.rtcMinPort),
					// rtcMaxPort : Number(config.mediasoup.workerSettings.rtcMaxPort)
					rtcMinPort : 40000,
					rtcMaxPort : 49999,
				});

			worker.on('died', () =>
			{
				//10秒後にプロセスを終了する
				setTimeout(() => process.exit(1), 2000);
			});

			mediasoupWorkers.push(worker);

			// Each mediasoup Worker will run its own WebRtcServer, so those cannot
			// share the same listening ports. Hence we increase the value in config.js
			// for each Worker.
			if (process.env.MEDIASOUP_USE_WEBRTC_SERVER !== 'false')
			{
				// Each mediasoup Worker will run its own WebRtcServer, so those cannot
				// share the same listening ports. Hence we increase the value in config.js
				// for each Worker.
				const webRtcServerOptions = utils.clone(config.mediasoup.webRtcServerOptions);
				const portIncrement = mediasoupWorkers.length - 1;

				console.log(portIncrement)
				for (const listenInfo of webRtcServerOptions.listenInfos)
				{
					listenInfo.port += portIncrement;
				}

				const webRtcServer = await worker.createWebRtcServer(webRtcServerOptions);

				worker.appData.webRtcServer = webRtcServer;
			}

		}

		return mediasoupWorkers
	}

	async runWebSocketServer(){

		const io = new Server(this._httpsServer);

		// websocketでroomNameを取得して代入
		// queryをパースして取得など
		const roomName = ""

		// mediasoupのnamespaceであるsocketを作成
		const webSocketServerConnection = io.of('/mediasoup')

		console.log(`runWebSocketServer`)

		webSocketServerConnection.on('connection', async socket =>{
			const url = "https://"+socket.handshake.headers.host+"/sfu/"
			const diffRoomNameLength = socket.handshake.headers.referer.length - url.length
			const roomName = socket.handshake.headers.referer.substr(url.length,diffRoomNameLength-1)
			// console.log(socket.handshake.headers.referer)
			console.log(`roomName :${roomName}`)

			queue.push(async () =>{
				// RoomManagerを作成or取得する
				console.log(`queue push`)
				const roomManager = await this.getOrCreateRoomManager(roomName)

				console.log(`handle connection`)
				roomManager.handleConnection(socket)
			})
		})

	}

	// RoomManagerがない場合RoomManagerを作成して返す
	async getOrCreateRoomManager(roomName){

		let roomManager
		console.log("getOrCreateRoomManager")
		if(this._RoomManagers.size == 0 || !this._RoomManagers.has(roomName)){
			// RoomManagerを作成

			const workers = this._workers;
			console.log(`workers.length: ${workers.length}`)

			roomManager = await RoomManager.create({roomName, workers})

			console.log("getOrCreateRoomManager set")
			// RoomManagerのMapに追加
			this._RoomManagers.set(roomName,roomManager)
		}else{
			console.log("getOrCreateRoomManager else")
			roomManager = this._RoomManagers.get(roomName)
		}
		return roomManager
	}

	async run(){
		await this.runWebSocketServer();
	}

}

module.exports = SFUManager;
