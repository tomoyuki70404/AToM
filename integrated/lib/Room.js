const EventEmitter = require('events').EventEmitter;

const Logger = require('./Logger');

const config = require('./config.js');
const logger = new Logger('Room');


class Room extends EventEmitter{

	// 既にルームが無い前提
	static async create({ mediasoupWorker, roomName })
	{
		logger.info('create() [roomName:%s]', roomName);
		console.log(config)
		// Router media codecs.
		const { mediaCodecs } = config.mediasoup.routerOptions;

		// Create a mediasoup Router.
		const mediasoupRouter = await mediasoupWorker.createRouter({ mediaCodecs });

		// 一旦音声デバイスは最大50まで取れるとしてみる（無理だったら変更 MAX8まで説あり）
		// Create a mediasoup AudioLevelObserver.
		const audioLevelObserver = await mediasoupRouter.createAudioLevelObserver(
			{
				maxEntries : 50,
				threshold  : -127,
				interval   : 250
			});

		// const bot = await Bot.create({ mediasoupRouter });

		return new Room(
			{
				roomName,
				webRtcServer : mediasoupWorker.appData.webRtcServer,
				mediasoupRouter,
				audioLevelObserver
			});
	}

	constructor(
	{
		roomName,
		webRtcServer,
		mediasoupRouter,
		audioLevelObserver
	}){
		super();
		this.setMaxListeners(Infinity);

		// RoomName.
		// @type {String}
		this._roomName = roomName;

		// Closed flag.
		// @type {Boolean}
		this._closed = false;

		// Map of broadcasters indexed by id. Each Object has:
		// - {String} id
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
		this._broadcasters = new Map();

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
		this._handleAudioLevelObserver();

	}

	_handleAudioLevelObserver()
	{
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
	close()
	{
		logger.debug('close()');

		this._closed = true;

		// Close the mediasoup Router.
		this._mediasoupRouter.close();

		// Emit 'close' event.
		this.emit('close');

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
	handleWebRtcConnection({socket, consume, webSocketServerConnection})
	{
		logger.info("socketId",socket.id)
		socket.emit('connection-success', {
		  socketId: socket.id,
		})

		socket.data.consume = consume;
		socket.data.joined = false;
		socket.data.displayName = undefined;
		socket.data.device = undefined;
		socket.data.rtpCapabilities = undefined;
		socket.data.sctpCapabilities = undefined;

		socket.data.transports = [];
		socket.data.producers = [];
		socket.data.consumers = [];
		socket.data.dataProducers = [];
		socket.data.dataConsumers = [];


		const removeItems = (items, socketId, type) => {
		  items.forEach(item => {
			if (item.socketId === socket.id) {
			  item[type].close()
			}
		  })
		  items = items.filter(item => item.socketId !== socket.id)
		  return items
		}


		socket.on('disconnect',()=>{
			logger.debug('disconnect', socket.id)

			socket.data.consumers = removeItems(consumers, socket.id, 'consumer')
			socket.data.producers = removeItems(producers, socket.id, 'producer')
			socket.data.transports = removeItems(transports, socket.id, 'transport')

			const { roomName } = peers[socket.id]

		})








	}


}

module.exports = Room;
