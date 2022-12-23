const EventEmitter = require('events').EventEmitter;

const Logger = require('./Logger');

const config = require('./config.js');
const logger = new Logger('Room');


class Room extends EventEmitter{

	// 既にルームが無い前提
	static async create({ mediasoupWorker, roomNameParam })
	{
		console.log('create() [roomName:%s]', roomNameParam);
		console.log(config)
		// Router media codecs.

		const peers = new Map()

		// const { mediaCodecs } = config.mediasoup.routerOptions;
		const { mediaCodecs } = {
			mediaCodecs :
			[
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
		}

		// Create a mediasoup Router.
		const mediasoupRouter = await mediasoupWorker.createRouter({ mediaCodecs, });

		// 一旦音声デバイスは最大50まで取れるとしてみる（無理だったら変更 MAX8までって何かに書いてあった気がするけど）
		// Create a mediasoup AudioLevelObserver.
		const audioLevelObserver = await mediasoupRouter.createAudioLevelObserver(
			{
				maxEntries : 50,
				threshold  : -127,
				interval   : 250
			});

		// const bot = await Bot.create({ mediasoupRouter });

		const childrenRoom = new Array();

		return new Room(
			{
				peers,
				roomName:roomNameParam,
				webRtcServer : mediasoupWorker.appData.webRtcServer,
				mediasoupRouter,
				audioLevelObserver,
				childrenRoom
			});
		}

<<<<<<< HEAD
	setPeers(parentPeers){
		this._peers = parentPeers
	}

	getChildrenRoom(){
		return this._childrenRoom
	}

	// 親Roomで子Roomをセット
	// 子Roomに親Roomのpeerを参照させる
	setChildRoom(childRoom){
		childRoom.setPeers(this._peers)
		this._childrenRoom.push(childRoom)
	}

	setProducer(socket, pipeProducer, producerLabel, accessLevel){
		const producerData ={
			socket:socket,
			producer:pipeProducer,
			producerLabel:producerLabel,
			accessLevel:accessLevel
		}
		this._peers.set(socket.id, producerData)
		this.addProducer(socket, producer, producerLabel, accessLevel)

		this.informConsumers(socket.id, producer.id, producerLabel, accessLevel)
	}

=======
	static createPipeToRouter(anotherRouter){



	}

	static canEntry(){
		return true
	}

>>>>>>> 2f13ae1fd2600c4a4fbc6096bf41e481978b6350

	constructor({
			peers,
			roomName,
			webRtcServer,
			mediasoupRouter,
<<<<<<< HEAD
			audioLevelObserver,
			childrenRoom
=======
			audioLevelObserver
>>>>>>> 2f13ae1fd2600c4a4fbc6096bf41e481978b6350
		}){
			super();
			this.setMaxListeners(Infinity);

			// RoomName.
			// @type {String}
			this._roomName = roomName;

			// Closed flag.
			// @type {Boolean}
			this._closed = false;


			// Map of peers indexed by id. Each Object has:
			// - {String} socket.id
			// - {Object} data
			//   - {String} displayName
			//   - {Object} device
			//   - {RTCRtpCapabilities} rtpCapabilities
			//   - {Map<String, mediasoup.Transport>} transports
			//   - {Map<String, mediasoup.Producer>} producers
			//   - {Map<String, mediasoup.Consumers>} consumers
			//   - {Map<String, mediasoup.DataProducer>} dataProducers
			//   - {Map<String, mediasoup.DataConsumers>} dataConsumers
			// @type {Map<String, Object>}
			this._peers = new Map();

			// mediasoup WebRtcServer instance.
			// @type {mediasoup.WebRtcServer}
			this._webRtcServer = webRtcServer;

			// mediasoup Router instance.
			// @type {mediasoup.Router}
			this._mediasoupRouter = mediasoupRouter;

			// mediasoup AudioLevelObserver.
			// @type {mediasoup.AudioLevelObserver}
			this._audioLevelObserver = audioLevelObserver;

			// Handle audioLevelObserver.
			// this._handleAudioLevelObserver();

<<<<<<< HEAD
			this._childrenRoom = new Array();

=======
>>>>>>> 2f13ae1fd2600c4a4fbc6096bf41e481978b6350
		}



	/**
	* Called from server.js upon a WebSocket connection request from a
	* browser.
	*
	* @param {String} socketId - The id of the protoo peer to be created.
	* @param {Boolean} consume - Whether this peer wants to consume from others.
	* @param {protoo.WebSocketTransport} WebSocketConnection - The associated
	*   SocketIO.
	*/
	handleWebRtcConnection({socket, consume, webSocketServerConnection}){
		console.log("socketId",socket.id)
		socket.emit('connection-success', {
			socketId: socket.id,
		})

		// joinしてきたときのメソッド
		socket.on('joinRoom',async({ roomName }, callback)=>{
			console.log('joinRoom ',roomName, ' ', socket.id )
			const rtpCapabilities = this._mediasoupRouter.rtpCapabilities

			const peerData = {
				socket:socket,
				data:
				{
					roomName:roomName,
					// device :
					// {
					// 	flag    : 'broadcaster',
					// 	name    : device.name || 'Unknown device',
					// 	version : device.version
					// },
					rtpCapabilities:rtpCapabilities,
					transports    : new Map(),
					producers     : new Map(),
					consumers     : new Map(),
					dataProducers : new Map(),
					dataConsumers : new Map()
				}
			};

			this._peers.set(socket.id,peerData)
			console.log(`this._peers.length: ${this._peers.size}`)
			console.log(`this sockeet: ${socket.id}`)

			callback({ rtpCapabilities })
		})

		socket.on('createWebRtcTransport', async({ consumer }, callback )=>{

			const peer = this._peers.get(socket.id)
			const roomName = this._roomName
			const isConsume = consumer

			console.log("createWebRtcTransport", ` roomName:${roomName} `)

			// 親Roomの場合
			if(this._childrenRoom.length > 0 && isConsume == false){

				this.createWebRtcTransport().then(
					transport => {
						callback({
							transportParamfromServer:{
								id: transport.id,
								iceParameters: transport.iceParameters,
								iceCandidates: transport.iceCandidates,
								dtlsParameters: transport.dtlsParameters,
							}
						})

<<<<<<< HEAD
						this.addTransport(socket,transport, isConsume)
					},
					error => {
						logger.error("createWebRtcTransport error:",error)
					})
			}else{
				const childRoom = this.getLeastConsumersChildRoom();

				childRoom.createWebRtcTransport().then(
					transport => {
						callback({
							transportParamfromServer:{
								id: transport.id,
								iceParameters: transport.iceParameters,
								iceCandidates: transport.iceCandidates,
								dtlsParameters: transport.dtlsParameters,
							}
						})
						// console.log("this._peers.size")
						// console.log(this._peers.size)
						// console.log(`this room is : ${this._roomName}`)
						// console.log(`child room is : ${childRoom.getRoomName()}`)

						
						childRoom.addTransport(socket,transport, isConsume)
					},
					error => {
						logger.error("createWebRtcTransport error:",error)
					}
				)
			}
		})
=======
					this.addTransport(socket,transport, isConsume)
				},
				error => {
					logger.error("createWebRtcTransport error:",error)
				})
			})
>>>>>>> 2f13ae1fd2600c4a4fbc6096bf41e481978b6350

			socket.on('transport-connect', ({ dtlsParameters }) => {
				console.log(`transport-connect ${socket.id}`)
				this.getTransport(socket.id).connect({ dtlsParameters })
			})

			socket.on('transport-produce', async ({ kind, rtpParameters, appData, }, callback) =>{
				console.log(`transport-produce  appData:${appData}`)
<<<<<<< HEAD

				const producerLabel = appData[0].producerLabel
				const accessLevel = appData[0].accessLevel


				// 親Roomにあたる場合
				if(this._childrenRoom.length > 0){
					console.log("room is parent")
					const producer = await this.getTransport(socket.id).produce({
						kind,
						rtpParameters,
					})

					// pipeToRouterの処理=========================

					const childRoom = this.getLeastConsumersChildRoom();
					await this._mediasoupRouter.pipeToRouter({
						producerId: producer.id,
						router: childRoom._mediasoupRouter
					})

					// 親RoomでaddProducer =>子Roomにもpeersは共有される
					this.addProducer( socket, producer, producerLabel , accessLevel )

					const peer = this._peers.get(socket.id)
					const producers = peer.data.producers

					callback({
						id: producer.id,
						producersExist: producers.length>1 ? true : false,
						appData:[producerLabel],
					})
					// =============================================

				}else{
					console.log("room is child")

					const transportTest = await this.getTransport(socket.id)
					console.log(transportTest.keys())
					console.log(transportTest.values())

					const producer = await this.getTransport(socket.id).produce({
						kind,
						rtpParameters,
					})

					// 子Roomとしてproducerを追加する場合

					this.addProducer(socket, producer, producerLabel, accessLevel)
					// const setProducer = this._peers.get(socket.id)
					// console.log("setProducer")
					// console.log(setProducer)

					this.informConsumers(socket.id, producer.id, producerLabel, accessLevel)

					console.log(`Producer Id:${producer.id}  producer.kind:${producer.kind}`)

					producer.on('transportclose', () => {
						console.log(`transport close ${producer}`)
						// audioLevelObserver.RemoveProducer(producer);
						producer.close()
					})

					const peer = this._peers.get(socket.id)
					const producers = peer.data.producers

					callback({
						id: producer.id,
						producersExist: producers.length>1 ? true : false,
						appData:[producerLabel],
					})
				}
			})

			socket.on('getProducers', callback =>{
				try{
					console.log(` getProducers  `)
					let callbackProducerList = []

					let producers = []
					// this._peersに入っているすべてのsocketからproducersを探索
					this._peers.forEach( extPeer => {
						// 自分のソケット以外のproducerを探す　&& そのsocketのproducersが１つでもあること
						if(extPeer.id !== socket.id  && extPeer.data.producers.size > 0){
							extPeer.data.producers.forEach( extProducer => {
								console.log(`producerId`)
								// console.log(extProducer)
								producers = [
									...producers,
									{
										socketId:extPeer.socket.id,
										producerId:extProducer.producer.id,
										producerLabel:extProducer.producerLabel,
										accessLevel:extProducer.accessLevel
									}
								]
							});

						}
					});
					// console.log("producers")
					// console.log(producers)

					producers.forEach(producerData => {

						if(producerData.socketId !== socket.id ){
							// console.log("producerData.producer")
							// console.log(producerData.producer)
							callbackProducerList = [
								...callbackProducerList,
								{
									producerId:producerData.producerId,
									producerLabel:producerData.producerLabel,
									accessLevel:producerData.accessLevel
								},
							]
						}
					})
					console.log(`getProducers   socket.id : ${socket.id} callbackProducerList:${callbackProducerList}`)

					callback(callbackProducerList)
				}catch(error){

					console.log("getProducers error",error)
				}
			})

			socket.on('transport-recv-connect', async({dtlsParameters, serverConsumerTransportId}) =>{
				console.log(`transport-recv-connect ${socket.id}`)

				const peer = this._peers.get(socket.id)
				let consumerTransport
				peer.data.transports.forEach( extTransport => {
					if(extTransport.isConsume && extTransport.transport.id == serverConsumerTransportId){
						consumerTransport = extTransport.transport
					}
				});
				await consumerTransport.connect({dtlsParameters})
			})

			socket.on('consume', async ({rtpCapabilities, remoteProducerId, serverConsumerTransportId }, callback )=>{
				try{
					const peer = this._peers.get(socket.id)
					let consumerTransport
					peer.data.transports.forEach( extTransport => {

						if(extTransport.isConsume && extTransport.transport.id == serverConsumerTransportId){
							// console.log("extTransport")
							// console.log(extTransport)
							consumerTransport = extTransport.transport
						}
					});
					console.log(`remoteProducerId : ${remoteProducerId}`)
					// console.log(`rtpCapabilities`)
					// console.log(rtpCapabilities)
					if(this._mediasoupRouter.canConsume({
						producerId:remoteProducerId,
						rtpCapabilities
					})){
						const consumer = await consumerTransport.consume({
							producerId: remoteProducerId,
							rtpCapabilities,
							paused:true,
						})

						consumer.on('transportclose',() =>{
							console.log('transport close from consumer')
						})

						consumer.on('producerclose', () =>{
							console.log(`producer of consumer close`)

							socket.emit('producer-closed', { remoteProducerId })

							consumerTransport.close([])

=======
				const producer = await this.getTransport(socket.id).produce({
					kind,
					rtpParameters,
				})
				const producerLabel = appData[0].producerLabel
				const accessLevel = appData[0].accessLevel

				this.addProducer(socket, producer, producerLabel, accessLevel)
				const setProducer = this._peers.get(socket.id)
				// console.log("setProducer")
				// console.log(setProducer)

				this.informConsumers(socket.id, producer.id, producerLabel, accessLevel)

				console.log(`Producer Id:${producer.id}  producer.kind:${producer.kind}`)

				producer.on('transportclose', () => {
					console.log(`transport close ${producer}`)
					// audioLevelObserver.RemoveProducer(producer);
					producer.close()
				})

				const peer = this._peers.get(socket.id)
				const producers = peer.data.producers

				callback({
					id: producer.id,
					producersExist: producers.length>1 ? true : false,
					appData:[producerLabel],
				})
			})

			socket.on('getProducers', callback =>{
				try{
					console.log(` getProducers  `)
					let callbackProducerList = []

					let producers = []
					// this._peersに入っているすべてのsocketからproducersを探索
					this._peers.forEach( extPeer => {
						// 自分のソケット以外のproducerを探す　&& そのsocketのproducersが１つでもあること
						if(extPeer.id !== socket.id  && extPeer.data.producers.size > 0){
							extPeer.data.producers.forEach( extProducer => {
								console.log(`producerId`)
								// console.log(extProducer)
								producers = [
									...producers,
									{socketId:extPeer.socket.id, producerId:extProducer.producer.id,producerLabel:extProducer.producerLabel,accessLevel:extProducer.accessLevel}
								]
							});

						}
					});
					// console.log("producers")
					// console.log(producers)

					producers.forEach(producerData => {

						if(producerData.socketId !== socket.id ){
							// console.log("producerData.producer")
							// console.log(producerData.producer)
							callbackProducerList = [
								...callbackProducerList,
								{
									producerId:producerData.producerId,
									producerLabel:producerData.producerLabel,
									accessLevel:producerData.accessLevel
								},
							]
						}
					})
					console.log(`getProducers   socket.id${socket.id} callbackProducerList:${callbackProducerList}`)

					callback(callbackProducerList)
				}catch(error){

					console.log("getProducers error",error)
				}
			})

			socket.on('transport-recv-connect', async({dtlsParameters, serverConsumerTransportId}) =>{
				console.log(`transport-recv-connect ${socket.id}`)

				const peer = this._peers.get(socket.id)
				let consumerTransport
				peer.data.transports.forEach( extTransport => {
					if(extTransport.isConsume && extTransport.transport.id == serverConsumerTransportId){
						consumerTransport = extTransport.transport
					}
				});
				await consumerTransport.connect({dtlsParameters})
			})

			socket.on('consume', async ({rtpCapabilities, remoteProducerId, serverConsumerTransportId }, callback )=>{
				try{
					const peer = this._peers.get(socket.id)
					let consumerTransport
					peer.data.transports.forEach( extTransport => {

						if(extTransport.isConsume && extTransport.transport.id == serverConsumerTransportId){
							// console.log("extTransport")
							// console.log(extTransport)
							consumerTransport = extTransport.transport
						}
					});
					console.log(`remoteProducerId : ${remoteProducerId}`)
					// console.log(`rtpCapabilities`)
					// console.log(rtpCapabilities)
					if(this._mediasoupRouter.canConsume({
						producerId:remoteProducerId,
						rtpCapabilities
					})){
						const consumer = await consumerTransport.consume({
							producerId: remoteProducerId,
							rtpCapabilities,
							paused:true,
						})

						consumer.on('transportclose',() =>{
							console.log('transport close from consumer')
						})

						consumer.on('producerclose', () =>{
							console.log(`producer of consumer close`)

							socket.emit('producer-closed', { remoteProducerId })

							consumerTransport.close([])

>>>>>>> 2f13ae1fd2600c4a4fbc6096bf41e481978b6350
							const peer = this._peers.get(socket.id)
							peer.data.transports.delete(socket.id)
							consumer.close()
							peer.data.consumers.delete(socket.id)
						})

						this.addConsumer(socket, consumer)

						const consumerParams = {
							id:consumer.id,
							producerId:remoteProducerId,
							kind:consumer.kind,
							rtpParameters: consumer.rtpParameters,
							serverconsumerId: consumer.id,
						}

						callback({ consumerParams })
					}
					else{
						console.log("can't consume")
					}
				}catch( error ){
					console.log(`consume error ${error}`)

					callback({
						consumerParams:{
							error:error
						}
					})
				}
			})

			socket.on('consumer-resume', async ({ serverConsumerId }) => {
				console.log(`consumer resume ${socket.id}`)

				const peer = this._peers.get(socket.id)
				let consumer

				peer.data.consumers.forEach( extConsumer => {
					if(extConsumer.id === serverConsumerId){
						consumer = extConsumer
					}
				});

				await consumer.consumer.resume()
			})

			socket.on('disconnect', () => {
				//peers内のsocketデータを削除
				this._peers.delete(socket.id)

				console.log('disconnect End', socket.id)

			})
		}

	handleAudioLevelObserver(){
		this._audioLevelObserver.on('volumes', (volumes) =>
		{
			const { producer, volume } = volumes[0];

			// logger.debug(
			// 	'audioLevelObserver "volumes" event [producerId:%s, volume:%s]',
			// 	producer.id, volume);

			// Notify all Peers.
			for (const peer of this._getJoinedPeers())
			{
				peer.notify(
					'activeSpeaker',
					{
						socketId : producer.appData.socketId,
						volume : volume
					})
					.catch(() => {});
				}
			});
			this._audioLevelObserver.on('silence', () =>
			{
				// logger.debug('audioLevelObserver "silence" event');

				// Notify all Peers.
				for (const peer of this._getJoinedPeers())
				{
					peer.notify('activeSpeaker', { socketId: null })
					.catch(() => {});
				}
			});
		}

	/**
	* Closes the Room instance by closing the protoo Room and the mediasoup Router.
	*/
	close(){
		logger.debug('close()');
<<<<<<< HEAD

		this._closed = true;

		// Close the mediasoup Router.
		this._mediasoupRouter.close();
	}

	getRoomName(){
		return this._roomName
=======

		this._closed = true;

		// Close the mediasoup Router.
		this._mediasoupRouter.close();
>>>>>>> 2f13ae1fd2600c4a4fbc6096bf41e481978b6350
	}

	getConsumerSize(){
		let consumerSize = 0

		this._peers.forEach( peer => {
				consumerSize += peer.data.consumers.size
		});
		return consumerSize
	}

	getTransport(socketId){
		const peer = this._peers.get(socketId)
		// const [producerTransport] = peer.data.transports.filter(transportData => transportData.socketId === socketId && !transportData.isConsume)
		let producerTransport = []
		peer.data.transports.forEach(item => {
			if(item.socket.id === socketId && ! item.isConsume){
				producerTransport = item
			}
		});
		console.log(`getTransport ${socketId}` )
		return producerTransport.transport
	}

	addTransport(socket, transport, isConsume){
		console.log("addTransport", ` transport:${transport} `, ` isConsume:${isConsume}`)

		const peer = this._peers.get(socket.id)
		const transportData ={
			socket:socket,
			transport:transport,
			isConsume:isConsume,
			routerId:this._mediasoupRouter.id,
			routerName:this.roomName
		}
		console.log("this._peers.size")
		console.log(this._peers.size)
		peer.data.transports.set(transport.id, transportData )

		console.log(`transports.length: ${peer.data.transports.size}`)
	}

	addProducer(socket, producer, producerLabel, accessLevel){
		console.log(`addProducer  producer:${producer}  producerLabel:${producerLabel} accessLevel:${accessLevel}`)

		const peer = this._peers.get(socket.id)
		const producerData ={
			socket:socket,
			producer:producer,
			producerLabel:producerLabel,
			accessLevel:accessLevel
		}
		peer.data.producers.set(producer.id, producerData )
	}

	addConsumer(socket, consumer){
		try{
			console.log(`addConsumer  socket:${socket}  consumer:${consumer}`)

			const peer = this._peers.get(socket.id)
			const consumerData = {
				socket:socket,
				consumer:consumer
			}
			console.log("peer")
			peer.data.consumers.set(consumer.id, consumerData )
<<<<<<< HEAD

			const currentConsumersNum = this.getConsumerSize()
			console.log(`     Consumer Size:${currentConsumersNum}`)

=======

			const currentConsumersNum = this.getConsumerSize()
			console.log(`     Consumer Size:${currentConsumersNum}`)

>>>>>>> 2f13ae1fd2600c4a4fbc6096bf41e481978b6350
		}catch(error){
			console.log(`add Consumer Error ${error}`)
		}
	}

	informConsumers( socketId, producerId, producerLabel, accessLevel ){
		console.log(`informConsumers, socket.id:${socketId} producerId:${producerId} producerLabel:${producerLabel} accessLevel:${accessLevel}`)

		let consumers = []
		this._peers.forEach( item => {
			consumers = [
				...consumers,
				{socketId:item.socket.id, socket:item.socket, consumer:item.consumer}
			]
		});

		let producers = []
		this._peers.forEach( item => {
			producers = [
				...producers,
				{socketId:item.socket.id, socket:item.socket, producer:item.producer}
			]
		});

		// producerが１つ以上ある場合
		if(consumers.length == 0 && peer.data.producers.length > 0){

			console.log('inform one consumer')

			for(let key of this._peers.keys()){
				if(key != socketId){
					const peer = this._peers.get(key)
					const firstConsumerSocket = peer.socket
					console.log('first consumer : get new-producer')
					firstConsumerSocket.emit('new-producer',{
						producerId:producerid,
						producerLabel:producerLabel,
						accessLevel:accessLevel
					})
				}
			}
		}else{ // consumerが１番最初にいる場合、getproducerを呼べないのでその場合の処理

			//１人のクライアント先に複数のconsumerがあるとき,すべてにinformConsumersが送られるので、重複を回避するリスト
			let consumerSocketIdList = []

			let consumers = []
			this._peers.forEach( item => {
				consumers = [
					...consumers,
					{socketId:item.socket.id, socket:item.socket, consumer:item.consumer}
				]
			});
			console.log(`consumers : ${consumers}`)
			consumers.forEach(consumerData => {
				// consumer自身のsocketにinformしないように排除
				if(consumerData.socketId !== socketId){

					if(consumerSocketIdList.includes(consumerData.socketId) == false){
						console.log(`consumerData socketId: ${consumerData.socketId}  socketId: ${socketId}`)

						consumerData.socket.emit('new-producer',{
							producerId:producerId,
							producerLabel:producerLabel,
							accessLevel:accessLevel,
						})
						consumerSocketIdList.push(consumerData.socketId)
					}else{
						logger.error("add consumer socketId pass")
					}
				}else{
					console.log(`no consumers`)
				}
			});
		}
	}

	// 親Roomにproducerを追加するときにconsumeさせたい子Roomを取得する
	getLeastConsumersChildRoom(){
		// // 子Roomの中からピア数が少ないRoomを取得し配列に格納
		// let childRoomsHasConsumersLength = this._childrenRoom.filter(item => item._peers.size)
		// console.log(`childRoomsHasConsumersLength: ${childRoomsHasConsumersLength}`)
		//
		// // 一番少ないConsumer数を入れておく
		// let leastConsumers = Math.min(...childRoomsHasConsumersLength);
		//
		// // 最小のconsumerを持つRoomのインデックスを取得し、戻す
		// return childRoomsHasConsumersLength.indexOf(leastConsumers)

		// 一旦一つ目のChildRoomを渡す
		return this._childrenRoom[0]
	}

	async createWebRtcTransport(){
		return new Promise(async (resolve, reject)=>{
			try{
				const webRtcTransport_options = {
					listenIps: [
						{
<<<<<<< HEAD
							ip: '192.168.10.113', // replace with relevant IP address
=======
							ip: '192.168.35.35', // replace with relevant IP address
>>>>>>> 2f13ae1fd2600c4a4fbc6096bf41e481978b6350
							// announcedIp: '10.0.0.115',
						}
					],
					enableUdp: true,
					enableTcp: true,
					preferUdp: true,
				}

				let transport = await this._mediasoupRouter.createWebRtcTransport(webRtcTransport_options)
				console.log(`transport id: ${transport.id}`)


				transport.on('dtlsstatechange', dtlsState =>{
					if (dtlsState === 'closed') {
						transport.close()
					}
				})
				transport.on('close', () => {
					console.log('transport closed')
				})
				resolve(transport)
			}catch(error){
				reject(error)
			}
		})
	}
}
module.exports = Room;
