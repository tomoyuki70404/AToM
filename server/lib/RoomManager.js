// 設定ファイル
const config = require('../config');

const RoomCell = require('./RoomCell')


class RoomManager{

	constructor({
		roomName,
		roomCells,
		workers
	}){
		// ルーム名
		this._roomName = roomName

		this._roomCells = roomCells

		this._workers = workers

		this._isHandleSocket = false

		// 1Clientにつき１Roomに対して送受信で2つのtransportをつなぐ
		// {String} producer.id
		// {Array} transports
		//	-	{bool} isConsume
		// 	-	{transport} transport
		this._pipeList = new Map();
	}

	// RoomManagerを作り、mainのRoomを１つ入れておく
	// Roomを増やす場合は
	static async create({roomName, workers}){
		console.log("create")
		const roomCells = new Array();

		// config.jsからcodec情報を取得
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

		// workers[0]でrouterを作成
		// const router = await workers[0].createRouter({ mediaCodecs });
		for(const index in workers) {
			console.log(`index :${index}`)
			console.log(workers[index])
			const router = await workers[index].createRouter({ mediaCodecs });

			const roomCell = await RoomCell.create({ roomName, roomIndex:index, router });

			roomCells.push(roomCell)
			console.log("create roomCells")
			console.log(`roomCell Count :${roomCells.length}`)
		};

		return new RoomManager(
			{
				roomName	:roomName,
				roomCells 	:roomCells,
				workers 	:workers
			}
		)
	}

	getIsHandleSocket(){
		return this._isHandleSocket
	}

	createTransport(socket, roomCellIndex , isConsume ,  callback){
		// transportが無い
		// producerがいるRoomCellからtransportをつくる
		const roomCell = this._roomCells.at(roomCellIndex)
		roomCell.createWebRtcTransport().then(
			transport => {
				callback({
					transportParamfromServer:{
						id: transport.id,
						iceParameters: transport.iceParameters,
						iceCandidates: transport.iceCandidates,
						dtlsParameters: transport.dtlsParameters,
					}
				})
				roomCell.addTransport(socket, transport, isConsume)
			}
		)
	}

	informConsumers(socketId, producerId, producerLabel, accessLevel){
		let allConsumers = new Array();
		let informedConsumers = new Map();
		this._roomCells.forEach( (roomCell, index) => {
			if(index != 0){ //親RoomでないRoomCellからconsumersを取ってくる
				allConsumers = allConsumers.concat(roomCell.getConsumers())
			}
		});

		allConsumers.forEach( consumer => {
			// consumerがいるsocketに重複が無ければinformするconsumersとして配列に入れる
			// 重複するとなんどもsocketを呼び出すことになるため
			if(!informedConsumers.has(consumer.socket.id) && socketId != consumer.socket.id){
				consumer.socket.emit('new-producer',{
					producerId: producerId,
					producerLabel: producerLabel,
					accessLevel: accessLevel
				})
				informedConsumers.set( consumer.socket.id , consumer )
			}
		});
	}

	handleConnection(socket){
		socket.emit('connection-success', {
			socketId: socket.id,
		})

		socket.on('joinRoom', async({ roomName }, callback) =>{
			// 全Roomで処理ができるか確認する

			// roomCells内のroomにjoinRoom(socket)でsocket情報を初期化
			this._roomCells.forEach( roomCell => {
				roomCell.addSocketRoomCell(socket)
			});

			//rtpCapabilitiesを一旦roomCell[0](=親RoomCell)で作ってみる
			const childroom = this._roomCells.at(0)
			// 親RoomCellのrtpCapabilitiesを渡しておく
			const rtpCapabilities = childroom.getRouter().rtpCapabilities

			callback({ rtpCapabilities })
		})

		// consumerはisConsumerに変更したほうがいい（メモ）
		// callbackで複数のtransportを返せるように変更する必要あり
		// Client側の修正が必要になるので、一旦1transportを返すのみにしておく
		socket.on('createWebRtcTransport', async({ consumer, remoteProducerId }, callback )=> {

			const isConsume = consumer
			// socketから重複した呼び出しがあれば１つのtransportを渡せばsend,recv１つずつで済む
			// consumer == trueのときはChildRoomからtransportを作成or取得
			if(isConsume == true){

				// getProducerによってproducerIdが渡されたとき
				// そのproducerがいるルームからのtransportを検索する
				// transport（isConsume==true)があればそれを返し、無ければ作成

				// getProducerをもとにtransportを渡す
				if(remoteProducerId != null){

					let roomCellTransportData = null;

					// 各RoomCellからremoteProducerIdがあるRoomCellを見つける
					// RoomCellのtransportsからtransportを取得
					// 無ければtransport作成
					this._roomCells.forEach( (roomCell, index) => {
						roomCell.getPeers().forEach( peer => {
							if(index != 0 && peer.producers.has(remoteProducerId)){
								// 全RoomCellから探しているproducerが入っているsocket.idのtransportsを返す
								roomCellTransportData = { roomCellIndex:index, roomCell: roomCell, transports:peer.transports }
							}
						});
					});

					// transportsが入っていたら
					// remoteProducerIdが入っているRoomCellにtransportがあるとき
					if(roomCellTransportData != null){
						let callbackTransport = null
						roomCellTransportData.transports.forEach( ( transportData , index) => {
							// consume用のtransportがあったとき
							if(transportData.isConsume == true){
								callbackTransport = transportData.transport
							}
						});
						if(callbackTransport != null){
							callback({
								transportParamfromServer:{
									id: callbackTransport.id,
									iceParameters: callbackTransport.iceParameters,
									iceCandidates: callbackTransport.iceCandidates,
									dtlsParameters: callbackTransport.dtlsParameters,
								}
							});
						}else{
							// remoteProducerDataがnull
							// producerがRoomCellにいるのでそのRoomCellからtransportを作る必要がある
							this.createTransport(socket, roomCellTransportData.roomCellIndex , isConsume , callback)
						}
					}else{
						console.log("can't find producerId")
					}
				}else{
					// producerがどこにもいないのでRoomCell[1]に新しいproducerが来るためそこで構えておく
					// RoomCell[1]にtransportを追加
					this.createTransport(socket, 1, isConsume , callback)
				}

			}else{

				//consumer == falseのときはProducerのため親Roomからtransportを取得し、return
				const parentRoom = this._roomCells.at(0)

				// ParentRoomで呼んでくるsocketに紐づくtransportがあるかを確認
				let producerTransport = null
				parentRoom.getTransports(socket).forEach( extTransport => {
					if( extTransport.isConsume == false){
						// producer用のtransportだったとき
						producerTransport = extTransport.transport
					}
				});
				//transportがあれば、それをcallbackで返す
				if(producerTransport != null){
					callback({
						transportParamfromServer:{
							id: producerTransport.id,
							iceParameters: producerTransport.iceParameters,
							iceCandidates: producerTransport.iceCandidates,
							dtlsParameters: producerTransport.dtlsParameters,
						}
					})
				}else{
					// transportが無ければ作って返す
					parentRoom.createWebRtcTransport().then(
						transport => {
							callback({
								transportParamfromServer:{
									id: transport.id,
									iceParameters: transport.iceParameters,
									iceCandidates: transport.iceCandidates,
									dtlsParameters: transport.dtlsParameters,
								}
							})
							console.log("createWebRtcTransport parentRoom")
							parentRoom.addTransport(socket, transport, consumer)
						}
					)
				}
			}
		})

		socket.on('transport-connect', ({ transportId, dtlsParameters }) => {

			console.log(`transport-connect ${socket.id}`)
			this._roomCells.forEach( roomCell => {
				if(roomCell.getTransports(socket).has(transportId)){
					roomCell.getTransports(socket).get(transportId).transport.connect({ dtlsParameters })
				}
			});

		})

		socket.on('transport-produce', async ({kind, rtpParameters, transportId, appData, }, callback) => {

			console.log("transport-produce")
			const producerLabel = appData[0].producerLabel
			const accessLevel = appData[0].accessLevel

			const parentRoom = this._roomCells.at(0)


			// 一旦this._roomCells[1]を子Roomとしてそこからconsumeできるかテスト
			// 最適な子RoomにaddProducerできるように改修する必要あり
			// const childRoom = this._roomCells.at(1)
			let consumersCountArray = new Array();
			this._roomCells.forEach( (roomCell, index)  => {
				if(index != 0){ //親RoomCellにはpipeしない
					consumersCountArray.push(roomCell.getConsumers().length)
				}
			});
			// consumersCountで取得した各RoomCellに持っているconsumerのうち、一番少ないRoomCellのindexを返す
			// consumersCountArray[0]は子RoomCell[1]～入っているのでchildRoomのindexにするには+1する
			// （childRoomCellIndex[0]は親RoomCellをさすことになるため）
			const childRoomIndex = consumersCountArray.indexOf(Math.min(...consumersCountArray)) + 1
			// pipeするRoomCellを取得する
			const childRoom = this._roomCells.at(childRoomIndex)

			const producer = await parentRoom.getTransports(socket).get(transportId).transport.produce({
				kind,
				rtpParameters,
			})
			console.log(`transport-produce producerId: ${producer.id}`)
			console.log(`transport-produce ParentRoomRouter.id: ${parentRoom.getRouter().id}`)
			// 親Roomにproducerを追加
			parentRoom.addProducer(socket, producer, producerLabel, accessLevel)

			// 親Roomから子RoomにpipeToRouter
			await parentRoom.getRouter().pipeToRouter({
				producerId: producer.id,
				router: childRoom.getRouter()
			})

			// 子RoomにaddProducer
			childRoom.addProducer(socket, producer, producerLabel, accessLevel)
			console.log(`transport-produce childRoomRouter.id: ${childRoom.getRouter().id}`)

			// childRoom.informConsumers(socket.id, producer.id, producerLabel, accessLevel)
			this.informConsumers(socket.id, producer.id, producerLabel, accessLevel)

			producer.on('transportclose', () => {
				console.log(`transport close ${producer}`)
				// audioLevelObserver.RemoveProducer(producer);
				producer.close()
			})

			callback({
				id: producer.id,
				// producersExist: producers.length>1 ? true : false,
				producersExist:false,//使ってない
				appData:[producerLabel],
			})

		})

		socket.on('getProducers', callback =>{
			let producersArray = new Array();
			try{
				this._roomCells.forEach((roomCell, i) => {

					if(i != 0){//親RoomCellからproducersを取得しない

						// 子RoomCellからproducersを取得
						const peers = roomCell.getPeers()

						// １peer(=1socket)におけるproducers
						peers.forEach( ( peer, key) =>{
							if(key !== socket.id && peer.producers.size >0){
								console.log(`roomCell.getRouterId:${roomCell.getRouter().id}`)

								console.log(peer)
								peer.producers.forEach( extProducer => {
									producersArray.push({
										socketId:extProducer.socket.id,
										producerId: extProducer.producer.id,
										producerLabel:extProducer.producerLabel,
										accessLevel:extProducer.accessLevel
									})
								});
							}
						})
					}
				});
				console.log(`producersArray`)
				console.log(producersArray)
				callback(producersArray)
			}catch{
				console.log("getProducers error",error)
			}
		})

		socket.on('transport-recv-connect', async({dtlsParameters, serverConsumerTransportId}) =>{
			console.log(`transport-recv-connect ${socket.id}`)

			this._roomCells.forEach( async (roomCell) => {
				if(roomCell.getTransports(socket).has(serverConsumerTransportId)){
					console.log(`transport-recv-connect  serverConsumerTransportId : ${serverConsumerTransportId}`)
					const consumerTransport = roomCell.getTransports(socket).get(serverConsumerTransportId).transport
					await consumerTransport.connect({dtlsParameters})
				}
			});
		})

		socket.on('consume', async ({rtpCapabilities, remoteProducerId, serverConsumerTransportId }, callback )=>{
			try{

				let consumerTransport
				this._roomCells.forEach( async (roomCell, i) => {
					// console.log(`roomCell===========================================`)
					// console.log(roomCell.getRouter().id)
					// console.log(roomCell)

					// 親Roomからproducerは取得しない
					// RoomCell１つでも稼働させるには改修必要
					if(i != 0){
						// 子RoomCellからsocket.idのpeerを取得
						const peer = roomCell.getPeers().get(socket.id)
						if(peer.transports.has(serverConsumerTransportId)){
							console.log(`consume  serverConsumerTransportId : ${serverConsumerTransportId}`)
							consumerTransport = peer.transports.get(serverConsumerTransportId).transport

							if(roomCell.getRouter().canConsume({
								producerId:remoteProducerId,
								rtpCapabilities
							})){
								console.log(`consume remoteProducerId: ${remoteProducerId}`)
								console.log(`consume consumerTransportId: ${consumerTransport.id}`)
								const consumer = await consumerTransport.consume({
									producerId: remoteProducerId,
									rtpCapabilities,
									paused: true,
								})

								consumer.on('transportclose', ()=>{
									console.log('transport close from consumer')
								})

								consumer.on('producerclose', () =>{
									socket.emit('producer-closed', { remoteProducerId })

									consumerTransport.close([])

									// 子Roomのpeers>transportsからsocket.idのtransportを削除する
									roomCell.getPeers().get(socket.id).transports.delete(socket.id)

									consumer.close()

									roomCell.getPeers().get(socket.id).consumers.delete(socket.id)
								})

								roomCell.addConsumer(socket, consumer)

								const consumerParams = {
									id:consumer.id,
									producerId:remoteProducerId,
									kind:consumer.kind,
									rtpParameters: consumer.rtpParameters,
									serverConsumerId: consumer.id,
								}

								callback({ consumerParams })
							}else{
								console.log("can't consume")
							}
						}
					}
				})
			}catch(error) {
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
			this._roomCells.forEach(async (roomCell, i) => {
				console.log(`consumer-resume   roomCell===========================================`)
				console.log(`roomCell index:${roomCell.getRoomCellIndex()}`)
				console.log(roomCell.getRouter().id)
				// console.log(roomCell)
				roomCell.getPeers().forEach( peer => {
					console.log("peer=================")
					console.log(peer)
				});



				if(i !=0 ){
					// 子RoomCellにあるconsumerを見つけてresume()をする
					const consumers = roomCell._peers.get(socket.id).consumers
					if(consumers.has(serverConsumerId)){
						await consumers.get(serverConsumerId).consumer.resume()
					}
				}
			})
		})

		socket.on('disconnect', () => {
			this._roomCells.forEach((roomCell, i) => {
				if(i != 0){
					//peers内のsocketデータを削除
					roomCell._peers.delete(socket.id)
					console.log(`roomCell===========================================`)
					console.log(roomCell.getRouter().id)
					console.log(roomCell)
					console.log('disconnect End', socket.id)
				}
			})
		})
	}

}

module.exports = RoomManager;
