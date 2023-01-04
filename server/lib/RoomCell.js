const config = require('../config');

class RoomCell{

	constructor({
		roomName,
		peers,
		roomIndex,
		router,
		roomChildren,
	}){

		this._roomName = roomName;

		// Map of peers indexed by id. Each Object has:
		// - {String} socket.id
		// - {Object} data
		//   - {String} displayName
		//   - {RTCRtpCapabilities} rtpCapabilities
		//   - {Map<String, mediasoup.Transport>} transports
		//       	- {String}:transport.id
		//    	   		- {socket}:socket,
		//	 	     		- {transport}:transport,
		//		     		- {bool}:isConsume,
		//		     		- router:<router>
		//   - {Map<String, mediasoup.Producer>} producers
		//       - {String}:producer.id
		//    	     - {socket}:socket,
		//	 	     - {producer}:producer,
		//		     - {String}:producerLabel,
		//		     - {Int}:accessLevel
		//   - {Map<String, mediasoup.Consumers>} consumers
		//       - {String}:consumer.id
		//    	     - {socket}:socket,
		//	 	     - {consumer}:consumer,
		//   - {Map<String, mediasoup.DataProducer>} dataProducers
		//   - {Map<String, mediasoup.DataConsumers>} dataConsumers
		// @type {Map<String, Object>}
		this._peers = new Map();

		this._roomIndex = roomIndex;

		this._router = router;

		this._roomChildren = new Array();

	}


	static create({roomName, roomIndex, router}){

		return new RoomCell({
			roomName:roomName,
			roomIndex:roomIndex,
			router: router
		})

	}




	async createWebRtcTransport(){
		return new Promise(async (resolve, reject ) => {
			try{
				const webRtcTransport_options = {
					listenIps: [
						{
							// ip: '192.168.10.113', // replace with relevant IP address
							ip: '192.168.35.35', // smc PC
							// announcedIp: '10.0.0.115',
						}
					],
					enableUdp: true,
					enableTcp: true,
					preferUdp: true,
				}

				let transport = await this._router.createWebRtcTransport( webRtcTransport_options )

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

	// Roomに入室する際にsocket情報を初期化する
	addSocketRoomCell(socket){
		// _peersにsocket情報がない場合のみ初期化する
		if(!this._peers.has(socket.id)){
			const peerData = {
				transports    : new Map(),
				producers     : new Map(),
				consumers     : new Map(),
				dataProducers : new Map(),
				dataConsumers : new Map()
			}
			this._peers.set(socket.id, peerData)
		}
	}


	// 部屋から離脱した時に呼び、_peersから削除する
	leaveRoom(socket){
		this._peers.delete(socket.id)
	}


	addTransport(socket, transport, isConsume){
		const peer = this._peers.get(socket.id);
		const transportData = {
			socket:socket,
			transport:transport,
			isConsume:isConsume,
			router:this._router
		}
		// peers<Map>のtransports<Map>に登録
		peer.transports.set(transport.id, transportData)
	}

	addProducer(socket, producer, producerLabel, accessLevel){
		const peer = this._peers.get(socket.id)
		const producerData ={
			socket:socket,
			producer:producer,
			producerLabel:producerLabel,
			accessLevel:accessLevel
		}
		peer.producers.set(producer.id, producerData )
	}

	addConsumer(socket, consumer){
		try{
			const peer = this._peers.get(socket.id)
			const consumerData = {
				socket:socket,
				consumer:consumer
			}
			// consumersに登録
			peer.consumers.set(consumer.id, consumerData )
		}catch(error){
			console.log(`add Consumer Error ${error}`)
		}
	}

	getRouter(){
		return this._router
	}

	getRoomCellIndex(){
		return this._roomIndex
	}

	getPeers(){
		return this._peers
	}

	getTransports(socket){
		const peer = this._peers.get(socket.id)
		return peer.transports
	}

	// RoomCellに含まれるconsumerすべて抽出してリスト化
	getConsumers(){
		let consumersList = new Array();
		this._peers.forEach( peer => {
			peer.consumers.forEach( consumer => {
				consumersList.push(consumer)
			});
		});
		return consumersList
	}

	// 引数のsocket以外のsocketに紐づくconsumersに通知する
	informConsumers(socket, producerId, producerLabel, accessLevel){
		let consumers = new Array();
		let sameSocketConsumer = new Array();


		this._peers.forEach( (peer, socketId) => {
			// peersのsocket.id自身以外のsocketへ通知するため、consumersを集める
			if(socketId != socket.id){
				peer.consumers.forEach( (consumer, consumerId) => {
					consumers.push({
						socketId: consumerId,
						socket: consumer.socket,
						consumer: consumer.consumer
					})
				});
			}
		});

		consumers.forEach( consumer  => {
			// １つのsocketに何回もnew-producerを通知しないように１度送ったsocketIdを覚えておく
			if(!sameSocketConsumer.includes(consumer.socketId)){
				consumer.socket.emit('new-producer',{
					producerId: producerId,
					producerLabel: producerLabel,
					accessLevel: accessLevel
				})
				sameSocketConsumer.push(consumer.socketId)
			}
		});
	}


}

module.exports = RoomCell;
