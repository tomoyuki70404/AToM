import sys
import time
import logging
from watchdog.observers import Observer
from watchdog.events import LoggingEventHandler

if __name__ == "__main__":
    #ロギングの設定
    logging.basicConfig(level=logging.INFO,
                        format='%(asctime)s - %(message)s',
                        datefmt='%Y-%m-%d %H:%M:%S')
    # path = sys.argv[1] if len(sys.argv) > 1 else '.'    #監視対象のpathを設定
    path = "//192.168.23.217/fax受信ファイル/受信ファイル/"
    event_handler = LoggingEventHandler()   #イベントハンドラ生成
    observer = Observer()       #監視オブジェクト生成
    observer.schedule(          #監視設定
        event_handler,
        path,
        recursive=True
        )
    observer.start()            #監視開始
    try:
        while True:             #ctrl-Cが押されるまで実行
            time.sleep(1)       #1秒停止
    except KeyboardInterrupt:   #ctrl-C実行時
        observer.stop()         #監視修了
    observer.join()
