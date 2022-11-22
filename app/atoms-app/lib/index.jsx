// urlパースモジュール
import UrlParse from 'url-parse'
// Reactモジュール

import RoomClient from './RoomClient';



let roomClient;

// RoomClient.init({ store })


async function run(){
  logger.debug('run() [environment:%s]', process.env.NODE_ENV);

	const urlParser = new UrlParse(window.location.href, true);
	const peerId = randomString({ length: 8 }).toLowerCase();
	let roomId = urlParser.query.roomId;
	let displayName =
		urlParser.query.displayName || (cookiesManager.getUser() || {}).displayName;
	const handler = urlParser.query.handler;
	const useSimulcast = urlParser.query.simulcast !== 'false';
	const useSharingSimulcast = urlParser.query.sharingSimulcast !== 'false';
	const forceTcp = urlParser.query.forceTcp === 'true';
	const produce = urlParser.query.produce !== 'false';
	const consume = urlParser.query.consume !== 'false';
	const forceH264 = urlParser.query.forceH264 === 'true';
	const forceVP9 = urlParser.query.forceVP9 === 'true';
	const svc = urlParser.query.svc;
	const datachannel = urlParser.query.datachannel !== 'false';
	const info = urlParser.query.info === 'true';
	const externalVideo = urlParser.query.externalVideo === 'true';
	const throttleSecret = urlParser.query.throttleSecret;
	const e2eKey = urlParser.query.e2eKey;

  if (info)
  {
    // eslint-disable-next-line require-atomic-updates
    window.SHOW_INFO = true;
  }

  if (!roomId)
  {
    roomId = randomString({ length: 8 }).toLowerCase();

    urlParser.query.roomId = roomId;
    window.history.pushState('', '', urlParser.toString());
  }

  




}


roomClient = new RoomClient(
  // Constructorを設定しないといけない
  {
      roomId,
			peerId,
			displayName,
			device,
			handlerName : handler,
			useSimulcast,
			useSharingSimulcast,
			forceTcp,
			produce,
			consume,
			forceH264,
			forceVP9,
			svc,
			datachannel,
			externalVideo,
			e2eKey
  });
