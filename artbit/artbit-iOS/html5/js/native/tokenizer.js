/**
 * @license
 *
 * Copyright 2017 Playful Invention Company
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

/////////////////////////
//
// Tokenizer
//
/////////////////////////

function parse(s){
	var t = new Tokenizer(s);
	t.skipSpace();
	return t.readList();
}

class Tokenizer {

constructor(s){
this.str = s;
this.offset = 0;
}

readList(){
	var a = new Array();
	while(true){
		if(this.eof()) break;
		var token = this.readToken();
		if(token==null) break;
		a.push(token);
	}
	return a;
}

readToken(){
	var s = this.next();
	var n = Number(s);
	if(!isNaN(n)) return n;
	var first = s.charAt(0);
	if(first=="]") return null;
	if(first=="[") return this.readList();
	return s;
}

next(){
	if(this.peekChar()=="'") return this.readString();
	var res='';
	if(this.delim()) res=this.nextChar();
	else {
		while(true){
			if(this.eof()) break;
			if(this.delim()) break;
			else res+=this.nextChar();
	}}
	this.skipSpace();
	return res;
}

readString(){
	this.nextChar();
	var res="'";
	while (true){
		var c=this.nextChar();
		res+=c;
		if(c=="'") {this.skipSpace(); return res;}
		if(this.eof()) return res+"'";
	}
	return null;
}

nextLine(){
	var res='';
	while (true){
		if(this.eof()) return res;
		var c=this.nextChar();
		if(c=='\n') return res;
		res+=c;
	}
}


skipSpace(){
	while(true){
		if(this.eof()) return;
		var c = this.peekChar();
		if(" \t\r\n,".indexOf(c)==-1) return;
		this.nextChar();
	}	
}

delim(){return "()[] \t\r\n".indexOf(this.peekChar())!=-1;}
peekChar(){return this.str.charAt(this.offset);}
nextChar(){return this.str.charAt(this.offset++);}
eof() {return this.str.length==this.offset;}	

}

