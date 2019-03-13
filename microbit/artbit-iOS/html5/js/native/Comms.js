/**
 * @license
 *
 * Copyright 2017 Playful Invention Company
 * Modifications Copyright 2018 Kids Code Jeunesse
 * All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
 
class Comms{

constructor(){
	this.CC = 0x20003000
	this.FONT = 0x31000;
	this.PROCS = 0x30000;
	this.packetcallback = undefined;
	this.packet = [];
}

 download(bytes, shapes, fcn){
  var t = this;
 	t.dowloaddata(bytes,t.PROCS, doShapes);	
 	function doShapes(){t.dowloaddata(shapes, t.FONT, fcn);}
}

dowloaddata(l, addr, fcn){
 	var t = this;
	t.flasherase(addr, download2);

	function download2(){
		//console.log("download2", l);
		if(l.length==0) fcn()
		else {
			t.flashwrite(addr, l.slice(0,128), download2);
			addr+=128;
			l=l.slice(128);
		}
	}
}

flasherase(addr,fcn){
	var cmd = [].concat([0xfb], this.fourbytes(addr));
	this.sendReceive(cmd,fcn);
}

flashwrite(dst, list, fcn){
	var cmd = [].concat([0xfc], this.fourbytes(dst), list.length, list)
	this.sendReceive(cmd,fcn);
}

twobytes(n){return [n&0xff, (n>>8)&0xff];}
fourbytes(n){return [n&0xff, (n>>8)&0xff, (n>>16)&0xff, (n>>24)&0xff];}
	
sendReceive(l, fcn){
//	console.log('sendReceive:',l);
	this.packetcallback = fcn;
	this.sendl(l);
}

sendl(l){
//	console.log(l);
	var comm = this;
	while(l.length>0){
		comm.send(l.slice(0,8));
		l=l.slice(8);
	}
}

send (data) {iOS.sendwithhandshake(iOS.devices[0], data);}

}


