// 設定ファイル
const config = require('../config');

// websocketサーバ
const { Server } = require( 'socket.io')

//mediasoupモジュール
const mediasoup = require('mediasoup');

//awaitqueueモジュール
const { AwaitQueue } = require( 'awaitqueue')

const RoomManager = require('./lib/RoomManager')


class SFUManager {

	constructor({
		workers,
		roomManagers,
		workers,
		httpsServer,
		websocketServer
	}){

		this._workers = workers;

		this._RoomManagers = new Map();

		this._httpsServer = httpsServer;

		this._websocketServer = websocketServer;

	}


	static async start(httpsServer){

		// workerを作成し保持
		const workers = await startMediasoupWorkers();
		const roomManagers = new Array();
		const websocketServer = runWebSocketServer(httpsServer);

		return new SFUManager(
		{
			workers : workers,
			roomManagers : roomManagers,
			httpsServer: httpsServer,
			websockerServer : websocketServer
		});

	}

	// startで各要素を作成し、RoomManagerを動かす
	run(){
		await runWebSocketServer();
	}


	/**
	 * Launch as many mediasoup Workers as given in the configuration file.
	 * WorkerをConfig.jsで設定した数、起動する
	 */
	async startMediasoupWorkers()
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

		webSocketServerConnection.on('connection',async socket =>{
			const url = "https://"+socket.handshake.headers.host+"/sfu/"
			const diffRoomNameLength = socket.handshake.headers.referer.length - url.length
			const roomName = socket.handshake.headers.referer.substr(url.length,diffRoomNameLength-1)
			// console.log(socket.handshake.headers.referer)
			console.log(`roomName :${roomName}`)

			queue.push(async () =>{
				// RoomManagerを作成or取得する

				const workers = this._workers;

				const roomManager = getOrCreateRoomManager(roomName)

				roomManager.handleConnection(socket)

			})
		})

	}

	// RoomManagerがない場合RoomManagerを作成して返す
	getOrCreateRoomManager(roomName){
		const roomManager
		if(this._RoomManagers.size == 0 || !this._RoomManagers.has(roomName)){
			// RoomManagerを作成

			const workers = this._workers;

			roomManager = await RoomManager.create({roomName, workers})

			// RoomManagerのMapに追加
			this._RoomManagers.set(roomName,roomManager)
		}else{
			roomManager = this._RoomManagers.get(roomName)
		}
		return roomManager
	}

}
