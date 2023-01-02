const config = require('../config');

class Room{

	constructor({
		roomName,
		connections,
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
		//   - {Map<String, mediasoup.Producer>} producers
		//   - {Map<String, mediasoup.Consumers>} consumers
		//   - {Map<String, mediasoup.DataProducer>} dataProducers
		//   - {Map<String, mediasoup.DataConsumers>} dataConsumers
		// @type {Map<String, Object>}
		this._connections = new Map();

		this._roomIndex = roomIndex;

		this._router = router;

		this._roomChildren = new Array();

	}



	static create({roomName, roomIndex, router}){

		return new Room({
			roomName:roomName,
			roomIndex:roomIndex,
			router: router
		})

	}
	// roomManagerからsocket.idに紐づくtransportを取得する
	getWebRtcTransport(socket){
		this.createWebRtcTransport()


	}

	async createWebRtcTransport(){
		return new Promise(async (resolve, reject ) => {
			try{
				const  { transportOptions }  = config.mediasoup.webRtcTransportOptions;

				let transport = await this._router.createWebRtcTransport( transportOptions )
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
