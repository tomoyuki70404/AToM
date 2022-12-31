class Room{

	constructor({
		roomName,
		roomIndex,
		router,
		roomChildren,

	}){

		this._roomName = roomName;

		this._roomIndex = roomIndex;

		this._router = router;

		this._roomChildren = new Array();

	}

	static create({roomName, roomIndex, router}){


		return new Room({
			roomName:roomName,
			roomIndes:roomIndex,
			router: router
		})

	}






}
