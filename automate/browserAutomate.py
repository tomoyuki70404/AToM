import schedule
import time
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.support.wait import WebDriverWait

# options = webdriver.ChromeOptions()
# options.add_argument("--use-fake-ui-for-media-stream")
# options.add_argument("ignore-certificate-errors")
# options.add_argument("--start-maximized")
# options.add_experimental_option('detach', True)
# driver = webdriver.Chrome(options=options)
#
# print("start")
isRunning = False


def init():
	global options
	global driver

	options = webdriver.ChromeOptions()
	options.add_argument("--use-fake-ui-for-media-stream")
	options.add_argument("ignore-certificate-errors")
	options.add_argument("--start-maximized")
	options.add_experimental_option('detach', True)
	driver = webdriver.Chrome(options=options)

	print("start")

#01 定期的にブラウザを起動する関数
def browserAutomate():
	global driver
	print("running")
	driver.get("https://192.168.10.113:3000/sfu/room")

	driver.implicitly_wait(1)

	# プルダウンのdepartmentを入力
	dropdown = driver.find_element(By.ID, "department")
	select = Select(dropdown)
	select.select_by_index(len(select.options)-1)

	WebDriverWait(driver, timeout=5)

	# テキスト入力を行う
	texts = driver.find_element(By.ID, "inputName")
	texts.send_keys("送信"+ Keys.ENTER)

	driver.implicitly_wait(1)

	# ルーム入室＋会話ボタンを押す
	enterBtn = driver.find_element(By.ID, "receiveSendBtn")
	enterBtn.click()

	# driver.implicitly_wait(30)

	# ルーム入室＋会話ボタンを押す
	# enterRoomBtn = driver.find_element(By.ID, "enterRoomBtn")
	# enterRoomBtn.click()


def browserControl():
	global driver
	global isRunning

	if isRunning :
		driver.close()
		init()
		browserAutomate()

	else:
		print("else")
		init()
		isRunning = True
		browserAutomate()


#02 スケジュール登録
# 1分毎に実行
# schedule.every(1).minutes.do(browserControl)

# 10秒毎に実行
# schedule.every(10).seconds.do(browserControl)

# 毎日3:45に実行
schedule.every().day.at("3:45").do(browserControl)

while True:
    schedule.run_pending()
    time.sleep(1)
