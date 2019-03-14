//
//  ViewController.swift
//  OSXShell
//
//  Created by Paula Bontá on 2015-12-10.
//  Copyright © 2015 Paula Bontá. All rights reserved.
//

import Cocoa
import WebKit
import CoreBluetooth

class ViewController: NSViewController, WKScriptMessageHandler, CBCentralManagerDelegate, CBPeripheralDelegate {
    
    var webview: WKWebView?
    let startat = "http://localhost/~brian/FeatherShell/MacShell/html5/index.html"
    var messages: [String: (String)->(String)] = [:]
    
    override func viewDidLoad() {
        super.viewDidLoad()
        let wkcfg =  WKWebViewConfiguration()
        let wkucc = WKUserContentController();
        addMessages(wkucc)
        wkcfg.userContentController = wkucc
        webview = WKWebView(frame: view.frame, configuration: wkcfg)
        view = webview!
        let url: URL = URL(string: startat)!
        let req = URLRequest(url:url)
        webview!.load(req)
        // Do any additional setup after loading the view.
    }
    
    func addMessages(_ ucc: WKUserContentController){
        addMessage(ucc, "print", doPrint)
        addMessage(ucc, "bleinit", doBLEinit)
        addMessage(ucc, "scan", doScan)
        addMessage(ucc, "scanoff", doScanOff)
        addMessage(ucc, "connect", doConnect)
        addMessage(ucc, "disconnect", doDisconnect)
        addMessage(ucc, "sendmessage", doSendMessage)
    }
    
    func addMessage(_ ucc: WKUserContentController, _ name: String, _ fcn: @escaping (String)->(String)){
        ucc.add(self, name: name)
        messages[name] = fcn;
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        let body: [String] = message.body as! [String]
        let str = body[1]
        var resp: String = "message not found"
        if let fcn = messages[message.name] {resp = fcn(str)}
        webview!.evaluateJavaScript("nativeResponse('\(body[0])', '\(resp)')", completionHandler: nil)
    }
    
    override var representedObject: Any? {
        didSet {
            // Update the view, if already loaded.
        }
    }
    
    //////////////////////
    //
    // Native Calls
    //
    //////////////////////
    
    func doPrint(_ str: String) -> String {
        let args = NSString(string: str).components(separatedBy: "\n")
        print(args)
        return "doPrint"
    }
    

    //////////////////////
    //
    // BLE Calls
    //
    //////////////////////

    var manager: CBCentralManager?
    var bricks : [String: CBPeripheral] = [:]
//    var uuids : [CBUUID] = []
    let txuuid = CBUUID (string: "6E400002-B5A3-F393-E0A9-E50E24DCCA9E");
    let rxuuid = CBUUID (string: "6E400003-B5A3-F393-E0A9-E50E24DCCA9E");
//    let rxuuid = CBUUID (string: "5646");
//    let txuuid = CBUUID (string: "5647");
    var rxchars : [String: CBCharacteristic] = [:]
    var txchars : [String: CBCharacteristic] = [:]

    
    
    func doBLEinit(_ str: String) -> String {
      print("init");
        manager = CBCentralManager(delegate: self, queue: nil)
//        uuids = [CBUUID(string: "00007426-1212-EFDE-BAAB-785FEABCD123")]
        return "doBLEinit"
    }
    
    func doScan(_ str: String) -> String {
        manager!.scanForPeripherals(withServices: nil, options:  [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        return "doScan"
    }
  
    func doScanOff(_ str: String) -> String {
        manager!.stopScan()
        return "doScanOff"
    }
    
    func centralManagerDidUpdateState(_ central: CBCentralManager){
        webview!.evaluateJavaScript("bleStarted()", completionHandler: nil)
}

    func centralManager(_ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String : Any],
        rssi RSSI: NSNumber) {
        if let name = peripheral.name {foundPeripheral(name, peripheral)}
//        print(advertisementData)
    }
    
    func foundPeripheral(_ name:String, _ p:CBPeripheral){
        if let _ = bricks[name] {return }
        bricks[name] = p;
        print(name)
        let cmd = "foundbrick (\"\(name)\")"
        webview!.evaluateJavaScript(cmd, completionHandler: nil)
    }
    
    func doDisconnect(_ str: String) -> String {
      let args = NSString(string: str).components(separatedBy: "\n")
      let p = bricks[args[0]]
      manager!.cancelPeripheralConnection(p!)
      return "doDisonnect"
    }
  
    func centralManager(_ c: CBCentralManager, didDisconnectPeripheral p: CBPeripheral, 
        error: Error?){
        let name = p.name
        let cmd = "disconnectedFrom (\"\(name!)\")"
        print(cmd)
        webview!.evaluateJavaScript(cmd, completionHandler: nil)
    }

    func doConnect(_ str: String) -> String {
        let args = NSString(string: str).components(separatedBy: "\n")
        let p = bricks[args[0]]
        manager!.connect(p!, options: nil)
        return "doConnect"
    }
    
    func centralManager(_ c: CBCentralManager, didConnect p: CBPeripheral){
        p.delegate = self
        p.discoverServices(nil)
        let cmd = "connectedTo (\"\(p.name!)\")"
        print(cmd)
        webview!.evaluateJavaScript(cmd, completionHandler: nil)
    }
    
    func peripheral(_ p: CBPeripheral, didDiscoverServices error: Error?){
        let uuids = [rxuuid, txuuid]
        for s in p.services! {
          print(p.name!)
          print(s)
//          print(s.characteristics!)
          print("---")
           p.discoverCharacteristics(uuids, for: s)
        }
    }
  
    func peripheral(_ p: CBPeripheral, didDiscoverCharacteristicsFor s: CBService,
        error: Error?){
        let name = p.name!
        for c in s.characteristics! {
            print("characteristics")
            print(c.uuid)
            if c.uuid == rxuuid {
                rxchars[name] = c
                p.setNotifyValue(true, for: c)
            }
            if c.uuid == txuuid {txchars[name] = c}
        }
    }
    
    func doSendMessage(_ str: String) -> String {
        let args = NSString(string: str).components(separatedBy: "\n")
        if (bricks.index(forKey: args[0]) == nil) {return "doSendMessage"}
        let p = bricks[args[0]]!
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
        if let e = error {print (e)}
    }
 
  func peripheral(_ p: CBPeripheral, didUpdateValueFor c: CBCharacteristic,
    error: Error?){
      var cmd = "gotpacket (["
      let data = c.value
      var values = [UInt8](repeating: 0, count: data!.count)
      (data! as NSData).getBytes(&values, length:data!.count)
      for i in 0 ..< data!.count {cmd = "\(cmd)\(values[i]),"}
      let blindex = cmd.index(cmd.endIndex, offsetBy: -1) 
      cmd = String(cmd[..<blindex])
      cmd = "\(cmd)]);"
      print(cmd)
      webview!.evaluateJavaScript(cmd, completionHandler: nil)
  }
  
  func read16(_ list: [UInt8], _ n: Int)-> Int{
    return  (Int(list[n+1])<<8) + Int(list[n])
  }
  
}

