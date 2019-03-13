//
//  SQL.swift
//
//  Created by Paula Bontá on 2016-10-12.
//  Copyright © 2016 Paula Bontá. All rights reserved.
//

import Foundation
//////////////////////
//
// SQL
//
//////////////////////

internal let SQLITE_STATIC = unsafeBitCast(0, to: sqlite3_destructor_type.self)
internal let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

var db: OpaquePointer? = nil;

func sendError(_ errmsg: OpaquePointer) -> String {
    let errmsg = String(cString: sqlite3_errmsg(db))
    print("SQL error", errmsg)
    return "error: " + errmsg;
}

func doOpen(_ str: String) -> String {
    let args = NSString(string: str).components(separatedBy: "\n")
    let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
    let fileURL = URL(fileURLWithPath: paths[0]).appendingPathComponent(args[0])
    if sqlite3_open(fileURL.path, &db) != SQLITE_OK {return sendError(db!)}
    //   print ("open");
    return "open"
}

func doClose(_ str: String) -> String {
    if sqlite3_close(db) != SQLITE_OK {return sendError(db!)}
    db = nil;
    return "close";
}

func doExec(_ str: String) -> String {
    let args = NSString(string: str).components(separatedBy: "\n")
    if sqlite3_exec(db, args[0], nil, nil, nil) != SQLITE_OK {return sendError(db!)}
    return "exec"
}

func doStmt(_ str: String) -> String {
    let args = NSString(string: str).components(separatedBy: "\n")
    //   print (args)
    let data: Data = args[0].data(using: String.Encoding.utf8)!
    let jsonObject: Any = try! JSONSerialization.jsonObject(with: data, options: JSONSerialization.ReadingOptions.mutableContainers) as Any;
    if let dict = jsonObject as? NSDictionary {return sendStatement(dict);}
    else {return "error: bad dictionary"}
}

func doQuery(_ str: String) -> String {
    let args = NSString(string: str).components(separatedBy: "\n")
    //    print (args)
    let data: Data = args[0].data(using: String.Encoding.utf8)!
    let jsonObject: Any = try! JSONSerialization.jsonObject(with: data, options: JSONSerialization.ReadingOptions.mutableContainers) as Any;
    if let dict = jsonObject as? NSDictionary {return sendResult(dict);}
    else {return "error: bad dictionary"}
}

func sendStatement (_ dict: NSDictionary)-> String {
    var statement: OpaquePointer? = nil
    let values = dict.object(forKey: "values") as! NSArray
    let stmtstr = dict.object(forKey: "stmt") as! String
    if sqlite3_prepare_v2(db, stmtstr, -1, &statement, nil) != SQLITE_OK {
        let errmsg = String(cString: sqlite3_errmsg(db))
        print("error preparing insert: \(errmsg)")
        return sendError(db!)
    }
    print (stmtstr)
    var i = 0;
    for val in values {
        if let stringArray = val as? String{
            if sqlite3_bind_text(statement, Int32(i+1), stringArray, -1, SQLITE_TRANSIENT) != SQLITE_OK {
                print (val, i+1);
                return sendError(db!)
            }
        }
        else {
            if let number = val as? Int32 {
                if sqlite3_bind_int(statement, Int32(i+1), Int32(number)) != SQLITE_OK {
                    return sendError(db!)
                }
            }
            else {print ("not converted" , val)}

        }
        i += 1;
    }
    if sqlite3_step(statement) != SQLITE_DONE  {return sendError(db!)}
    if sqlite3_finalize(statement) != SQLITE_OK  {return sendError(db!)}
    print ("no problems")
    return sqlite3_last_insert_rowid(db).description;
}


func sendResult (_ dict: NSDictionary)-> String {
   // print ("sendResult", dict);
    
    var statement: OpaquePointer? = nil
    let values = dict.object(forKey: "values") as! NSArray
    let stmtstr = dict.object(forKey: "stmt") as! String
    
    if sqlite3_prepare_v2(db, stmtstr, -1, &statement, nil) != SQLITE_OK {
        return sendError(db!)
    }
    var i = 0
    for val in values {
        if let stringArray = val as? String{
            if sqlite3_bind_text(statement, Int32(i+1), stringArray, -1, SQLITE_TRANSIENT) != SQLITE_OK {
                print (val, i+1);
                return sendError(db!)
            }
        }
        else {
            if let number = val as? Int32 {
                if sqlite3_bind_int(statement, Int32(i+1), Int32(number)) != SQLITE_OK {
                    return sendError(db!)
                }
            }
            else {print ("not converted" , val)}
            
        }
        i += 1;
    }
        
    var res: Array = [[String : Any]]()
    while sqlite3_step(statement) == SQLITE_ROW {
        let row  = getSQLRow(statement!)
        res.append(row);
    }
    
    if sqlite3_finalize(statement) != SQLITE_OK {
        return sendError(db!)
    }
    
    let theJSONData = try? JSONSerialization.data(withJSONObject: res,
                                                  options: JSONSerialization.WritingOptions(rawValue: 0))
    if let json = theJSONData {
        let theJSONText = NSString(data: json, encoding: String.Encoding.ascii.rawValue)
        return (theJSONText as String?)!
    }
    
    return "error: unkonwn"
}


func getSQLRow (_ statement: OpaquePointer)-> [String: Any] {
    var dict = [String: Any]()
    let count = Int(sqlite3_column_count(statement))
    for i in 0  ..< count  {
        let key = sqlite3_column_name(statement, Int32(i))
        let content = sqlite3_column_text(statement, Int32(i))
        if content != nil {
            let skey = String(cString: UnsafePointer<Int8>(key!))
            let val = String(cString: content!)
            var jsonObject: Any?
            let utf8str = val.data(using: String.Encoding.utf8)!
            do {
             //   print(skey);
                jsonObject = try JSONSerialization.jsonObject(with: utf8str, options: JSONSerialization.ReadingOptions.mutableContainers) as Any? }
            catch {jsonObject = val}
            if let svalue = jsonObject as? NSDictionary {dict[skey] = svalue;}
            else {dict[skey] = val;}
        }
    }
    return dict;
}

