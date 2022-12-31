class RoomManager{

	constructor({
		roomName,
		mainRoom,
		workers
	}){
		// ルーム名
		this._roomName = roomName

		this._mainRoom = mainRoom

		// RoomCellの保持を可変にするため（単細胞か多細胞か）
		this._roomSize = 1

		this._workers = workers
	}

	// RoomManagerを作り、mainのRoomを１つ入れておく
	// Roomを増やす場合は
	static create({roomName, workers}){

		// config.jsからcodec情報を取得
		const { mediaCodecs } = config.mediasoup.codecs;

		// workers[0]でrouterを作成
		const router = await workers[0].createRouter({ mediaCodecs });

		// roomを１つ作成
		const room = await Room.create({roomName,roomIndex = 0, router});

		return new RoomManager(
			{
				roomName:roomName,
				mainRoom : room,
				workers : workers
			}
		)
	}

	handleConnection(socket){
		socket.emit('connection-success', {
			socketId: socket.id,
		})

		socket.on('joinRoom', async({ roomName}, callback) =>{






		})



	}



}
