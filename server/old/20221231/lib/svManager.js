

// Maps to store all mediasoup objects.
const workers = new Map();
const webRtcServers = new Map();
const routers = new Map();
const transports = new Map();
const producers = new Map();
const consumers = new Map();
const dataProducers = new Map();
const dataConsumers = new Map();

//mediasoupでの各イベント（worker/router/transportの作成・closeなど）を検知するメソッド
function runMediasoupObserver()
{
	mediasoup.observer.on('newworker', (worker) =>
	{
		// Store the latest worker in a global variable.
		global.worker = worker;

		workers.set(worker.pid, worker);
		worker.observer.on('close', () => workers.delete(worker.pid));

		worker.observer.on('newwebrtcserver', (webRtcServer) =>
		{
			// Store the latest webRtcServer in a global variable.
			global.webRtcServer = webRtcServer;

			webRtcServers.set(webRtcServer.id, webRtcServer);
			webRtcServer.observer.on('close', () => webRtcServers.delete(webRtcServer.id));
		});

		worker.observer.on('newrouter', (router) =>
		{
			// Store the latest router in a global variable.
			global.router = router;

			routers.set(router.id, router);
			router.observer.on('close', () => routers.delete(router.id));

			router.observer.on('newtransport', (transport) =>
			{
				// Store the latest transport in a global variable.
				global.transport = transport;

				transports.set(transport.id, transport);
				transport.observer.on('close', () => transports.delete(transport.id));

				transport.observer.on('newproducer', (producer) =>
				{
					// Store the latest producer in a global variable.
					global.producer = producer;

					producers.set(producer.id, producer);
					producer.observer.on('close', () => producers.delete(producer.id));
				});

				transport.observer.on('newconsumer', (consumer) =>
				{
					// Store the latest consumer in a global variable.
					global.consumer = consumer;

					consumers.set(consumer.id, consumer);
					consumer.observer.on('close', () => consumers.delete(consumer.id));
				});

				transport.observer.on('newdataproducer', (dataProducer) =>
				{
					// Store the latest dataProducer in a global variable.
					global.dataProducer = dataProducer;

					dataProducers.set(dataProducer.id, dataProducer);
					dataProducer.observer.on('close', () => dataProducers.delete(dataProducer.id));
				});

				transport.observer.on('newdataconsumer', (dataConsumer) =>
				{
					// Store the latest dataConsumer in a global variable.
					global.dataConsumer = dataConsumer;

					dataConsumers.set(dataConsumer.id, dataConsumer);
					dataConsumer.observer.on('close', () => dataConsumers.delete(dataConsumer.id));
				});
			});
		});
	});
}


module.exports = async function(){

	//server.jsからManagerを起動することでmediasoup内の動きを検知する
	// Run the mediasoup observer API.
	runMediasoupObserver();

	// Make maps global so they can be used during the REPL terminal.
	global.workers = workers;
	global.routers = routers;
	global.transports = transports;
	global.producers = producers;
	global.consumers = consumers;
	global.dataProducers = dataProducers;
	global.dataConsumers = dataConsumers;


}
