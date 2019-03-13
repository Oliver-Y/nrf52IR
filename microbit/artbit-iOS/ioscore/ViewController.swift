//
//  ViewController.swift
//  art:bit
//
//  Created by Paula Bontá on 2016-04-26.
//  Copyright © 2016 Paula Bontá. All rights reserved.
//

import UIKit
import WebKit
import AVFoundation
import CoreBluetooth

class ViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler, CBCentralManagerDelegate, CBPeripheralDelegate {
    
    var webview: WKWebView?
    var messages: [String: (String)->(String)] = [:]
    var sounds: [String: AVAudioPlayer] = [:]
    let nativeclass = "iOS."
    var player: AVQueuePlayer?
    var manager: CBCentralManager?
    var webviewActive = false;

    override func viewDidLoad() {
        super.viewDidLoad()
        registerDefaultsFromSettingsBundle()
        let wkcfg =  WKWebViewConfiguration()
        let wkucc = WKUserContentController();
        addMessages(wkucc)
        wkcfg.userContentController = wkucc
        webview = WKWebView(frame: view.frame, configuration: wkcfg)
        view = webview
        webview?.navigationDelegate = self;
        manager = CBCentralManager(delegate: self, queue: nil) // ble initialization
        loadPage();
        setAppNotifications();
    }
    
    func setAppNotifications (){
        // managing app gone to background or foreground
        let notificationCenter = NotificationCenter.default
        notificationCenter.addObserver(self, selector: #selector(appMovedToBackground), name: UIApplication.willResignActiveNotification, object: nil)
        notificationCenter.addObserver(self, selector: #selector(appMovedToActive), name: UIApplication.didBecomeActiveNotification, object: nil)
    }
    
    @objc func appMovedToBackground() {
        print("App moved to background!")
    }
    
    @objc func appMovedToActive() {
        print("App moved to active!")
        let cmd = nativeclass + "appMovedToActive()"
        webview!.evaluateJavaScript(cmd, completionHandler: nil)
    }

    func loadPage (){
        let hostkind = UserDefaults.standard.string(forKey: "host")!
        if(hostkind=="0"){
            let topurl = Bundle.main.url(forResource: "html5", withExtension: nil)!
            let starturl = Bundle.main.url(forResource: "html5/index", withExtension: "html")!
            webview!.loadFileURL(starturl, allowingReadAccessTo: topurl)
            print (topurl)
        } else {
            let url: URL = URL(string: UserDefaults.standard.string(forKey: "html")!)!
            let req = URLRequest(url:url)
            webview!.load(req)
            print (url)
        }
    }
    
    func addMessages(_ ucc: WKUserContentController){
        addMessage(ucc, "scan", doScan)
        addMessage(ucc, "connect", doConnect)
        addMessage(ucc, "connectid", doConnectID)
        addMessage(ucc, "getDevices", doGetDevices)
        addMessage(ucc, "changesetting", doChangeSetting)
        addMessage(ucc, "disconnect", doDisconnect)
        addMessage(ucc, "sendmessage", doSendMessage)
        addMessage(ucc, "sendwithhandshake", doSendMessageWithResponse)
        addMessage(ucc, "stopscan", doStopScan)
        addMessage(ucc, "getBLEstatus", getBLEStatus)
        addMessage(ucc, "registerSound", registerSound)
        addMessage(ucc, "playSound", playSound)
        addMessage(ucc, "open", doOpen)
        addMessage(ucc, "exec", doExec)
        addMessage(ucc, "close", doClose)
        addMessage(ucc, "stmt", doStmt)
        addMessage(ucc, "query", doQuery)
        addMessage(ucc, "resourceToString", resourceToString)
    }
    
    func addMessage(_ ucc: WKUserContentController, _ name: String, _ fcn: @escaping (String)->(String)){
        ucc.add(self, name: name)
        messages[name] = fcn;
    }
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        let body: [String] = message.body as! [String]
        let str = body[1]
        var resp: String = "message not found"
        if let fcn = messages[message.name] {resp = fcn(str)}
        let cmd = nativeclass + "response('\(body[0])', '\(resp)')"
        webview!.evaluateJavaScript(cmd, completionHandler: nil)
    }
    
    override var prefersStatusBarHidden : Bool {return true}
    
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        let version: String = Bundle.main.infoDictionary!["CFBundleShortVersionString"] as! String
        var defaults: [String: Any]  = [:]
        var devices = UserDefaults.standard.string(forKey: "devices") // paired devices images
        let lan = UserDefaults.standard.string(forKey: "lan")
    //    let lastone = UserDefaults.standard.string(forKey: "lastconnected")
        let ioslan = Locale.current.languageCode
        devices = devices == nil ? "{}" : devices;
        defaults["version"] = version
        defaults["devices"] = devices
        defaults["lan"] = lan == nil ? ioslan : lan
     //   defaults["lastconnected"] = lastone
        let theJSONData = try? JSONSerialization.data(withJSONObject: defaults,
         options: JSONSerialization.WritingOptions(rawValue: 0))
         var data = "";
         if let json = theJSONData {
            let theJSONText = NSString(data: json, encoding: String.Encoding.ascii.rawValue)
            data =  (theJSONText as String?)!
         }
        let cmd = nativeclass + "didFinishLoad (\'\(data)\')"
        webview!.evaluateJavaScript(cmd, completionHandler: nil)
    }
    
    
    
    //////////////////////
    //
    // Sound Management
    //
    //////////////////////
    
    var audioPlayer = AVAudioPlayer()
    
    func registerSound(_ str: String) -> String {
        let args = NSString(string: str).components(separatedBy: "\n")
        let dir = args[0]
        let name = args[1]
        let callback = args[2]
        let ext = args[3]
        let url = Bundle.main.url(forResource: "html5/"+dir+name, withExtension: ext)!
        if let snd = try?AVAudioPlayer(contentsOf: url){
            sounds[name]=snd
            let dur = snd.duration
            let cmd = callback + " (\"\(name)\", \"\(dur)\")"
            webview!.evaluateJavaScript(cmd, completionHandler: nil)
        }
        return "sound registered"
    }
    
    
    func playSound(_ str: String) -> String {
        let args = NSString(string: str).components(separatedBy: "\n")
        if (sounds[args[0]] !=  nil) {playAudio(args[0]) }
        return "sound played"
    }
    
    func playAudio(_ str: String) {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
            audioPlayer = sounds[str]!
            if (audioPlayer.isPlaying) {
                audioPlayer.stop()
                audioPlayer.currentTime = 0
            }
            audioPlayer.prepareToPlay()
            audioPlayer.play()
        } catch {
            print(error)
        }
    }
    
    
    //////////////////////
    //
    // BLE Calls
    //
    //////////////////////


    var bledevices : [String: CBPeripheral] = [:] // all discovered devices
    var connected : [String: CBPeripheral] = [:] // connected devices
    var deviceInfo = CBUUID(string:"180A")
 //   let uuids : [CBUUID] = []
    let rxuuid = CBUUID (string: "6E400002-B5A3-F393-E0A9-E50E24DCCA9E")
    let txuuid = CBUUID (string: "6E400003-B5A3-F393-E0A9-E50E24DCCA9E")
    let service = CBUUID(string: "6E400001-B5A3-F393-E0A9-E50E24DCCA9E") //    Nordic UART Service
    var rxchars : [String: CBCharacteristic] = [:] // rx charactereristics
    var txchars : [String: CBCharacteristic] = [:] // tx charactereristics
    var foundDeviceCallback = "iOS.founddevice"
    
    func doScan(_ str: String) -> String {
        let args = NSString(string: str).components(separatedBy: "\n")
        foundDeviceCallback = args[0];
        manager!.scanForPeripherals(withServices: nil, options:  [CBCentralManagerScanOptionAllowDuplicatesKey: true, CBAdvertisementDataOverflowServiceUUIDsKey: [service, txuuid, rxuuid]])
        print ("scanStarted");
        webview!.evaluateJavaScript(nativeclass + "scanStarted()", completionHandler: nil)
        return "doScan"
    }
  
    func centralManagerDidUpdateState(_ central: CBCentralManager){
        print ("ble started")
        webview!.evaluateJavaScript(nativeclass + "bleStarted()", completionHandler: nil)
    }

    func centralManager(_ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String : Any],
        rssi RSSI: NSNumber) {
        if let name = peripheral.name {
           // print (peripheral, advertisementData[CBAdvertisementDataServiceUUIDsKey] as Any)
            foundPeripheral(name, peripheral, RSSI: RSSI)
        }
    }
    
    func foundPeripheral(_ name:String, _ p:CBPeripheral, RSSI:NSNumber){
        let id = p.identifier.uuidString
      //  if let _ = bledevices[id] {return }
    //    print ("foundPeripheral ", id, name)
        bledevices[id] = p;
        let cmd = nativeclass + "founddevice (\"\(name)\", \"\(id)\", \"\(RSSI)\")"
        webview!.evaluateJavaScript(cmd, completionHandler: nil)
    }
    
    func doConnect(_ str: String) -> String {
        let args = NSString(string: str).components(separatedBy: "\n")
        if (bledevices.index(forKey: args[0]) == nil) {return "notfound"}
        if (connected.index(forKey: args[0]) != nil) {return "connected"}
        let p = bledevices[args[0]]
        manager!.connect(p!, options: nil)
        return "connecting"
    }
    
    func doConnectID(_ str: String) -> String {
        let args = NSString(string: str).components(separatedBy: "\n")
        let list:[UUID] = [NSUUID(uuidString: args[0])! as UUID]
        let peripherials:[CBPeripheral] = manager!.retrievePeripherals(withIdentifiers:list)
        if peripherials.count > 0 {
            let p = peripherials[0]
            let state = p.state as CBPeripheralState
            var result="unkown"
            switch (state) {
                case CBPeripheralState.disconnected:
                    manager!.connect(p, options: nil)
                    result="disconnected:"+args[0]
                    break
                case CBPeripheralState.connecting:
                    result="connecting:"+args[0]
                    break
                case CBPeripheralState.connected:
                    result="connected:"+args[0]
                    break;
                case CBPeripheralState.disconnecting:
                    result="disconnecting:"+args[0]
                    break;
            }
            return result
        }
        return "notfound"
    }
    
    func doDisconnect(_ str: String) -> String {
        let args = NSString(string: str).components(separatedBy: "\n")
        let pid = args[0]
        print ("doDisconnect ",  pid)
        if (connected.index(forKey: pid) == nil) {return "notconnected"}
        let p = connected[pid]
        manager!.cancelPeripheralConnection(p!)
        return "doDisconnect"
    }
    
    func centralManager(_ c: CBCentralManager, didConnect p: CBPeripheral){
        p.delegate = self
      //  print ("didConnectPeripheral", p.name as Any, p.services as Any, p.state)
        p.discoverServices(nil)
        let id = p.identifier.uuidString
        connected[id] = p;
        let cmd = nativeclass + "connectedTo (\"\(id)\")"
        webview!.evaluateJavaScript(cmd, completionHandler: nil)
    }
    
    func centralManager(_ c: CBCentralManager, didFailToConnect p: CBPeripheral, error: Error?) {
        p.delegate = self
        print("didFailToConnectPeripheral", p.name as Any)
        manager!.cancelPeripheralConnection(p)
        let cmd = nativeclass + "failToConnect (\"\(p.name!)\")"
        webview!.evaluateJavaScript(cmd, completionHandler: nil)
    }
    
    func doGetDevices(_ str: String) -> String { // doesn't seem to work
        let _ : [CBPeripheral] =  manager!.retrieveConnectedPeripherals(withServices: [service])
        return "gotDevices"
    }
    
    func centralManager(_ c: CBCentralManager, didDisconnectPeripheral p: CBPeripheral,
        error: Error?) {
        let id = p.identifier.uuidString
        print ("disconnect", id)
      //  if (bledevices.index(forKey: id) != nil) {bledevices.removeValue(forKey: id)}
        if (connected.index(forKey: id) != nil) {connected.removeValue(forKey: id)}
        let cmd = nativeclass + "disconnectedFrom (\"\(id)\")"
        webview!.evaluateJavaScript(cmd, completionHandler: nil)
    }

    func peripheral(_ p: CBPeripheral, didDiscoverServices error: Error?){
        let uuids = [rxuuid, txuuid]
        for s in p.services! {
            p.discoverCharacteristics(uuids, for: s)
        }
    }
  
    func peripheral(_ p: CBPeripheral, didDiscoverCharacteristicsFor s: CBService,
        error: Error?){
       
        let id = p.identifier.uuidString
   //     print ("didDiscoverCharacteristicsFor",p, "sevice", s, "char",  s.characteristics!)
        for c in s.characteristics! {
            if c.uuid == rxuuid {
                rxchars[id] = c
                p.setNotifyValue(true, for: c)
            }

            if c.uuid == txuuid {
                txchars[id] = c
                let cmd = nativeclass + "deviceIsReady (\"\(id)\")"
                webview!.evaluateJavaScript(cmd, completionHandler: nil)
            }
        }
    }
    
    func doSendMessage(_ str: String) -> String {
     //   print ("send message ", str)
        let args = NSString(string: str).components(separatedBy: "\n")
        if (connected.index(forKey: args[0]) == nil) {return "notconnected"}
        if (txchars.index(forKey: args[0]) == nil) {return "unkowncharacteristics"}
        let p = bledevices[args[0]]!
        let c = txchars[args[0]]!
        let list = args[1].components(separatedBy: ",")
        var arr = [UInt8](repeating: 0, count: list.count)
        for i in 0 ..< list.count { arr [i]  =  UInt8(list[i])! }
        let data = Data(bytes: UnsafePointer<UInt8>(arr as [UInt8]), count: arr.count)
        p.writeValue(data, for: c, type: CBCharacteristicWriteType.withoutResponse)
        return "doSendMessage"
    }

    func doSendMessageWithResponse(_ str: String) -> String {
    //    print ("send message ", str)
        let args = NSString(string: str).components(separatedBy: "\n")
        if (connected.index(forKey: args[0]) == nil) {return "notconnected"}
        if (txchars.index(forKey: args[0]) == nil) {return "unkowncharacteristics"}
        let p = bledevices[args[0]]!
        let c = txchars[args[0]]!
        let list = args[1].components(separatedBy: ",")
        var arr = [UInt8](repeating: 0, count: list.count)
        for i in 0 ..< list.count { arr [i]  =  UInt8(list[i])! }
        let data = Data(bytes: UnsafePointer<UInt8>(arr as [UInt8]), count: arr.count)
        p.writeValue(data, for: c, type: CBCharacteristicWriteType.withResponse)
        return "doSendMessage"
    }
    func peripheral(_ p: CBPeripheral,
        didWriteValueFor characteristic: CBCharacteristic,
        error: Error?) {
        var str = ""
        if (error != nil)  {
                print ("has and error")
                print (error as Any)
            str = (error?.localizedDescription)!
        }
        let cmd = nativeclass + "writeValueResult (\"\(str)\", \"\(p.identifier.uuidString)\")"
        webview!.evaluateJavaScript(cmd, completionHandler: nil)
    }
 
    func peripheral(_ p: CBPeripheral, didUpdateValueFor c: CBCharacteristic,
        error: Error?){
            let data = c.value
            var values = [UInt8](repeating: 0, count: data!.count)
            (data! as NSData).getBytes(&values, length:data!.count)
            var str = ""
            for s in values {str = "\(str)\(s),"}
            str = String(str[..<str.endIndex])
          //  print ("gotpacket", str)
            let id = p.identifier.uuidString
            let name = p.name
            let cmd = nativeclass + "gotpacket (\"\(name!)\", \"\(id)\",\"\(str)\")"
            webview!.evaluateJavaScript(cmd, completionHandler: nil)
    }
    
    func read16(_ list: [UInt8], _ n: Int)-> Int{
        return  (Int(list[n+1])<<8) + Int(list[n])
    }
    
    func doStopScan(_ str: String) -> String {
        manager?.stopScan()
        return "doStopScan"
    }
    
    func getBLEStatus(_ str: String) -> String {
        var res = [String]()
        for (id, p) in connected {
            let name = p.name
            let entry = "\(name!),\(id)"
            res.append(entry)
        }
     //   let lastone = UserDefaults.standard.string(forKey: "lastconnected")
    //    let lastconnectedTo : [String] = (lastone != nil) ? [lastone!] : []
     //   var response = [String]()
     //   response.append (res.joined(separator: "|"))
     //   response.append(lastconnectedTo.joined(separator: "|"))
     //   return response.joined(separator: "&")
        return res.joined(separator: "|");
    }
    
    //////////////////////
    //
    // Helpers
    //
    //////////////////////

    func registerDefaultsFromSettingsBundle() {
        let defaultsToRegister: [String: Any] = getRegisterDefaults ()
        let defaults = UserDefaults.standard
        defaults.register(defaults: defaultsToRegister)
        defaults.synchronize()
    }
    
    func getRegisterDefaults () ->[String: Any]{
        let settingsBundle: URL = Bundle.main.url(forResource: "Settings", withExtension: "bundle")!
        let root: URL = settingsBundle.appendingPathComponent("Root.plist")
        let settings = NSDictionary(contentsOf: root)
        let preferences = settings?.object(forKey: "PreferenceSpecifiers") as! NSArray
        var defaultsToRegister: [String: Any]  = [:]
        for prefSpecification in preferences {
            let key: String = (prefSpecification as AnyObject).object(forKey: "Key")! as! String
            let val = (prefSpecification as AnyObject).object(forKey: "DefaultValue")!
            defaultsToRegister[key] = val
        }
        return defaultsToRegister;
    }
    
    func doChangeSetting(_ str: String) -> String  {
        let args = NSString(string: str).components(separatedBy: "\n")
        let key = args[0]
        let val = args[1]
        UserDefaults.standard.set(val, forKey:key)
        return "yes";
    }

    
    /////////////////////////
    // resources
    /////////////////////////

    func resourceToString(_ str: String) -> String {
        let args = NSString(string: str).components(separatedBy: "\n")
        let dir = args[0]
        let name = args[1]
        let type = args[2]
        let path = Bundle.main.path(forResource: "html5/"+dir+name, ofType: type)
        let contents = try? String(contentsOfFile:path!, encoding: String.Encoding.utf8)
        if let res =  contents {return toBase64(res)}
        else {return ""}
    }
    
    func toBase64(_ str: String) -> String {
        let utf8str = str.data(using: String.Encoding.utf8)
        return utf8str!.base64EncodedString(options: NSData.Base64EncodingOptions(rawValue: 0))
    }

    func eraseFile(_ str: String) -> String {
        let args = NSString(string: str).components(separatedBy: "\n")
        let url = getDocumentPath(args[0])
        let mgr = FileManager.default
        if let _ = try? mgr.removeItem(at: url) {return "eraseFile"}
        else {return "eraseFile Error"}
    }
    
    func renameFile(_ str: String) -> String {
        let args = NSString(string: str).components(separatedBy: "\n")
        let fromurl = getDocumentPath(args[0])
        let tourl = getDocumentPath(args[1])
        let mgr = FileManager.default
        if let _ = try? mgr.moveItem(at: fromurl, to: tourl) {return "renameFile"}
        else {return "renameFile Error"}
    }
    
    func getDocumentPath(_ str: String) -> URL{
        let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
        let docs = URL(fileURLWithPath: paths[0])
        let url = URL(fileURLWithPath: str, relativeTo: docs)
        return url
    }

    
}


// Helper function inserted by Swift 4.2 migrator.
fileprivate func convertFromAVAudioSessionCategory(_ input: AVAudioSession.Category) -> String {
	return input.rawValue
}
