
# OBS録画
# 録画ファイル管理
# fax受信ファイル管理
# ブラウザ自動起動
## 統合スクリプト



# ------------------------------------------------------------
# Main Script Area
# ------------------------------------------------------------

# OBS関係
import obspython as obs
import time
import os
import re
import shutil
import datetime
from datetime import timedelta

# ファイル管理関係
import sys
import os
import logging
# import shutil
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# # ブラウザ自動化
import schedule
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.support.wait import WebDriverWait


# OBS用変数
Debug_Mode = False
isRecording = True
Pause_Time = 1000
Recording_Start = "None"
Recording_Duration = 0
Recording_End = 0


# ファイル共有用path
FileSharePath = "\\\\192.168.23.217\\fax受信ファイル\\受信ファイル\\"
# FileSharePath = "C:\\Users\\stv\\Desktop\\example1\\public\\"
latestFileStamp =""


# ブラウザ再起動用
automateBrowserURL = "https://192.168.23.218:3000/sfu/tvmas"
browserRestartTime ="09:30"
# obsのudpate_scriptが複数呼ばれるため、seleniumを１回呼び出しするためのフラグ
isBrowserAutomateRun = False

# ------------------------------------------------------------
# Browser Automate
# ------------------------------------------------------------
def browserDriverInit():
	global options
	global driver

	print("driver Init")
	options = webdriver.ChromeOptions()
	options.add_argument("--use-fake-ui-for-media-stream")
	options.add_argument("ignore-certificate-errors")
	options.add_argument("--start-maximized")
	options.add_experimental_option('detach', True)
	driver = webdriver.Chrome(options=options)



def browserAutomate():
	global driver
	global automateBrowserURL


	print("run automation")
	driver.get(automateBrowserURL)
	driver.implicitly_wait(1)

	dropdown = driver.find_element(By.ID, "department")
	select = Select(dropdown)
	select.select_by_index(len(select.options)-1)


	WebDriverWait(driver, timeout=5)


	texts = driver.find_element(By.ID, "inputName")
	texts.send_keys("送信"+ Keys.ENTER)
	driver.implicitly_wait(1)


	enterBtn = driver.find_element(By.ID, "receiveSendBtn")
	enterBtn.click()
	time.sleep(3)


	enterRoomBtn = driver.find_element(By.ID, "enterRoomBtn")
	enterRoomBtn.click()
	time.sleep(3)


	#新しいタブを開き、REC用画面（受信のみ）を表示する
	driver.switch_to.new_window('tab')

	#URLを開く
	driver.get(automateBrowserURL)
	driver.fullscreen_window()

	# ルーム入室＋会話ボタンを押す
	recvOnlyBtn = driver.find_element(By.ID, "receiveOnlyBtn")
	recvOnlyBtn.click()

	print("ok")

def browserContMain():
    global driver

    driver.quit()
    browserDriverInit()
    browserAutomate()

# ------------------------------------------------------------
# File Script
# ------------------------------------------------------------


def getFolderNameStr(dateStr):
	dt_now = datetime.datetime.now()
	returnDate = str(dt_now.year)+"-"+ str(dt_now.month)+"-"+ str(dateStr[0:2])
	print("returnDate" ,returnDate)

	return returnDate


# ファイルを日付毎のフォルダへ移動
# 日付が古いフォルダは削除=>canDelFolder()
def fileSort(sorcePath):

	delFolderDay = ""

    # dstPath内のディレクトリを取得
	dirs = os.listdir(sorcePath)
	if Debug_Mode:
		print(dirs)

	for dir in dirs:
		try:
			tempPath, ext = os.path.splitext(sorcePath+"/"+dir)

			# 録画直後はpath直下に生成され、整理時に録画した日付のフォルダへ移動させる
			if ext ==".mkv":
				os.renames(sorcePath+"\\"+dir, sorcePath+"\\"+dir[:10]+"\\"+dir)

			# fax受信ファイルは整理する
			elif ext==".pdf" and sorcePath=="\\\\192.168.23.217\\fax受信ファイル\\受信ファイル\\" :
				folderName = getFolderNameStr(dir[5:])
				os.renames(sorcePath+"\\"+dir, sorcePath + "\\" + folderName + "\\"+dir)


			# ディレクトリがpath下にあるかどうか判定
			# ＋フォルダ名が正しいか判定（日付以外のフォルダは変更させないため)
			if os.path.isdir(sorcePath+"\\"+dir) and re.match(r'[0-9]{4}-[0-9]{2}-[0-9]{2}', dir) :
				# フォルダ自体が古い場合はディレクトリごと削除
				if canDelFolder(dir):
					shutil.rmtree(sorcePath+"\\"+dir)
					delFolderDay = str(dir[8:10])


		except PermissionError as e:
			print(e)

	pdfFolderPath = "C:\\Users\\syste\\Desktop\\mediasoup-demo-3\\example1\\public\\shareFolder\\"
	files = os.listdir(pdfFolderPath)
	dt_now = datetime.datetime.now()
	dt_now.day

	# サーバ内のshareFolderは217の受信ファイルディレクトリ削除のタイミングでファイルを削除
	for file in files:
		# if dt_now.day > file[5:7]
		if int(file[5:7]) == int(delFolderDay):
			print("file:", file, " ",file[5:7])
			os.remove(pdfFolderPath+file)


# # ファイル管理クラス
# # 受信フォルダに追加、変更があった際に発火する
class MyFileWatchHandler(FileSystemEventHandler):
	def __init__(self):
		super().__init__()

	def on_created(self, event):
		try:

			# dstPath = "shareFolder"
			filepath = event.src_path
			# print(filepath)
			filename = os.path.basename(filepath)
			# print("filename : ", filename)
			# print(datetime.datetime.now(),filename, "created")
			time.sleep(5)
			dstPathFileName = fr"C:\\Users\\syste\\Desktop\\mediasoup-demo-3\\example1\\public\\shareFolder\{filename}"
			faxRecvPath = "\\\\192.168.23.217\\fax受信ファイル\\受信ファイル\\"
			shutil.copy(filepath, dstPathFileName )

			sortPath = "C:\\Users\\syste\\Desktop\\mediasoup-demo-3\\example1\\public\\shareFolder\\"

			fileSort(faxRecvPath)

			# shareFolder内を整理
			fileSort(sortPath)

		except Exception as e:
			print("Exception")
			print(e)

	# def on_modified(self, event):
	# 	filepath = event.src_path
	# 	filename = os.path.basename(filepath)

	def on_deleted(self, event):
		filepath = event.src_path
		filename = os.path.basename(filepath)
		print(f"{datetime.datetime.now()} {filename} changed")

	# def on_moved(self, event):
	# 	filepath = event.src_path
	# 	filename = os.path.basename(filepath)
	# 	print(f"{datetime.datetime.now()} {filename} created")



# ------------------------------------------------------------
# OBS Script Functions
# ------------------------------------------------------------

def script_defaults(settings):
    global Debug_Mode
    if Debug_Mode:
        print("Calling defaults")


def script_description():
    global Debug_Mode
    if Debug_Mode:
        print("Calling description")

    return "<b>OBS 連続収録スクリプト</b>" + \
    "<hr>" +\
    "連続収録用のスクリプト" +\
    "<br/>" +\
    "Durationを入力することでその収録時間で常時RECを行う(1min~120minまで指定可)" +\
    "<br/>" +"Durationを0としたときは15minをデフォルトとしています" + \
    "<br/><br/>" +\
    "Made by Otake, © 2022" +\
    "<hr>"


def script_load(settings):
    global Debug_Mode
    if Debug_Mode:
        print("Calling Load")

    obs.obs_data_set_bool(settings, "enabled", False)

def script_properties():
	global Debug_Mode
	if Debug_Mode: print("Calling properties")

	props = obs.obs_properties_create()
	obs.obs_properties_add_bool(props, "enabled", "Enabled")
	obs.obs_properties_add_int(props, "duration", "Recording Duration (Minutes)", 1, 120, 1)


	obs.obs_properties_add_bool(props, "debug_mode", "Debug Mode")
	return props


def script_save(settings):
    global Debug_Mode
    if Debug_Mode:
        print("Calling Save")

    script_update(settings)

def script_unload():
	global Debug_Mode
	if Debug_Mode: print("Calling unload")

	obs.timer_remove(main)

def script_update(settings):

	global Debug_Mode
	global isRecording
	global Pause_Time
	global Recording_Start
	global Recording_Duration
	global Recording_End
	global FileSharePath
	global browserRestartTime
	global driver
	global isBrowserAutomateRun


	event_handler = MyFileWatchHandler()
	observer = Observer()

	if obs.obs_data_get_int(settings, "duration") == 0:
		Recording_Duration = 15 * 60
	else:
		durationInt = obs.obs_data_get_int(settings, "duration")
		print("durationInt",durationInt)
		Recording_Duration = durationInt * 60

	if obs.obs_data_get_bool(settings, "enabled") is True:
		if Debug_Mode:
			print("REC機能をONにします 1秒毎に関数を実行しています")

		if isBrowserAutomateRun == False:
			# schedule.every().day.at(browserRestartTime).do(browserContMain)
			schedule.every(1).minutes.do(browserContMain)
			browserDriverInit()
			browserAutomate()
			isBrowserAutomateRun = True

		observer.schedule(event_handler,FileSharePath,recursive=True)
		observer.start()

		print("recording duration", Recording_Duration)
		# 録画終了時間を設定
		Recording_End = time.time() + Recording_Duration
		print("timerStart")
		obs.timer_add(main,1000)

	else:
		try:
			if Debug_Mode:
				print("REC機能をOFFにします")
			if obs.obs_frontend_recording_active():
				obs.obs_frontend_recording_stop()

				observer.stop()

			obs.timer_remove(main)

			if isBrowserAutomateRun == True:
				driver.quit()
				isBrowserAutomateRun = False

		except Exception as e:
			print(e)

		Debug_Mode = obs.obs_data_get_bool(settings, "debug_mode")



# OBS用関数

# 日付ごとに管理しているフォルダ自体を削除
# 1週間前のフォルダは削除
def canDelFolder(strFolderDateName):
	year = strFolderDateName[:4]
	month = strFolderDateName[5:7]
	day = strFolderDateName[8:10]

	dt_now = datetime.datetime.now()
	folder_date = datetime.date(int(year), int(month), int(day))

	delDatetime = dt_now - datetime.timedelta(days=14)
	if delDatetime.date() > folder_date:
		return True
	else:
		return False


def main():
	global Pause_Time
	global Recording_End

	path = r'\\192.168.23.217\StreamingMasREC'

	# try:
	# 	schedule.run_pending()
	# except Exception as e:
	# 	print(e.args)

	# 終了までの残り時間がある場合＝録画
	if Recording_End - time.time() > 0:
		# 録画が開始されていないので録画開始
		if obs.obs_frontend_recording_active() == False:
			obs.obs_frontend_recording_start()

	# 終了時間に達している
	else:
		# 録画中の場合＝>録画終了
		if obs.obs_frontend_recording_active():
			obs.obs_frontend_recording_stop()

			obs.timer_add(main, Pause_Time)

			# 録画したファイルを整理する
			fileSort(path)


			# 次の終了時かをセット
			Recording_End = time.time() + Recording_Duration
