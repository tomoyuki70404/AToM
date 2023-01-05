const os = require('os');

module.exports =
{
	// https接続に関する設定
	https  :
	{
		listenIp   : '192.168.10.113',
		listenPort :  4443,
		// tls        :
		// {
		// 	cert : `./ssl/cert.pem`,
		// 	key  : `./ssl/key.pem`
		// }
	},

	// mediasoupに関する設定
	mediasoup:
	{
		runWorkersNum     : Object.keys(os.cpus()).length,
		codecs :
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
			}
		],
		workerSettings :
		{
			rtcMinPort : 2000,
			rtcMaxPort : 2999
		},
		webRtcTransportOptions :
		{
			listenIps: [
				{
					ip: '192.168.10.113', // replace with relevant IP address
					// announcedIp: '10.0.0.115',
				}
			],
			enableUdp: true,
			enableTcp: true,
			preferUdp: true,
		},
		webRtcServerOptions :
		{
			listenInfos :
			[
				{
					protocol    : 'udp',
					ip          : process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
					announcedIp : process.env.MEDIASOUP_ANNOUNCED_IP,
					port        : 4444
				},
				{
					protocol    : 'tcp',
					ip          : process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
					announcedIp : process.env.MEDIASOUP_ANNOUNCED_IP,
					port        : 4444
				}
			],
		}
	}



}
