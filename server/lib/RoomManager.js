class RoomManager{

	constructor({
		roomName,
		rooms,
		workers
	}){
		// ルーム名
		this._roomName = roomName

		this._rooms = rooms

		this._workers = workers
	}

	// RoomManagerを作り、mainのRoomを１つ入れておく
	// Roomを増やす場合は
	static async create({roomName, workers}){

		const rooms = new Array();

		// config.jsからcodec情報を取得
		const { mediaCodecs } = config.mediasoup.codecs;

		// workers[0]でrouterを作成
		// const router = await workers[0].createRouter({ mediaCodecs });
		for(var i= 0; i < workers.length ; i++){
			const router = await workers[i].createRouter({ mediaCodecs });

			// roomを１つ作成
			// roomIndex[0]をParentRoomとする
			const room = await Room.create({ roomName, roomIndex = i, router });

			rooms.push(room)
		}

		return new RoomManager(
			{
				roomName:roomName,
				rooms : rooms,
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
