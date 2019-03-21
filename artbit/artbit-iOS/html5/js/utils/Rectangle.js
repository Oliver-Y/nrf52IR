
/* 
Copyright (c) 2016 Playful Invention Company

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

	
////////////////////////////////////////
// Basic Matrix
////////////////////////////////////////


var Rectangle =function (x,y,w,h){
	this.x = x;
	this.y = y;
	this.width = w;
	this.height = h;
}

Rectangle.prototype.include =function (pt){
	var box = new Rectangle(0,0,0,0);
	box.x = Math.min(this.x, pt.x)
	box.y = Math.min(this.y, pt.y)
	box.width = Math.max(0, Math.max(this.width + this.x, pt.x) - box.x)
	box.height = Math.max (0, Math.max(this.height + this.y, pt.y)  - box.y)
	return box;
}

Rectangle.prototype.hitRect =function (pt){
	var x = pt.x; var y = pt.y;
 	if(x<this.x) return false;
	if(x>this.x+this.width) return false;
	if(y<this.y) return false;
	if(y>this.y + this.height) return false;
	return true;
}

Rectangle.prototype.intersects =function (r){
	var x0 = Math.max(this.x, r.x);
  var x1 = Math.min(this.x + this.width, r.x + r.width);
  if (x0 <= x1) {
    var y0 = Math.max(this.y, r.y);
    var y1 = Math.min(this.y + this.height, r.y + r.height);
    if (y0 <= y1) return true;
  }
  return false;
}

Rectangle.prototype.union =function (box2){
	var box = new Rectangle(0,0,0,0);
	box.x = (this.x < box2.x) ?  this.x : box2.x;
	box.y = (this.y < box2.y) ?  this.y : box2.y;
	this.extentsw = this.x+ this.width;
	this.extentsh = this.y+ this.height;
	box2.extentsw =  box2.x+ box2.width;;
	box2.extentsh =  box2.y+ box2.height;
	box.width = (this.extentsw > box2.extentsw) ?  this.extentsw : box2.extentsw;
	box.height = (this.extentsh > box2.extentsh) ? this.extentsh : box2.extentsh;
	box.width -= box.x;
	box.height -= box.y;
	if (box.isEmpty()) box = {x:0, y:0, width:0, height:0};
	return box;
}


Rectangle.prototype.overlapElemBy =function (box2,percent){return this.overlapElem(box2) >= percent;}

Rectangle.prototype.overlapElem =function (box2){
	var boxi = this.intersection(box2);
	if (boxi.isEmpty()) return 0;
	if (boxi.isEqual(box2)) return 1;
	if (boxi.isEqual(box1)) return 1;
	return (boxi.width * boxi.height) / (box2.width * box2.height);
}

Rectangle.prototype.intersection =function (box2){
	var dx = Math.max(this.x, box2.x);
  var dw = Math.min(this.x + this.width, box2.x + box2.width);  
  if (dx <= dw) {
    var dy = Math.max(this.y, box2.y);
    var dh = Math.min(this.y + this.height, box2.y + box2.height);
    if (dy > dh) return new Rectangle(0,0,0,0);
    return new Rectangle(dx,dy, dw - dx, dh - dy);
  }
  return new Rectangle(0,0,0,0);
}

Rectangle.prototype.isEqual =function (box2){
	return (this.x == box2.x ) &&  (this.y == box2.y ) && 
				(this.width == box2.width) &&  (this.height== box2.height);
};

Rectangle.prototype.isEmpty =function (){ return (this.x == 0) &&  (this.y == 0) &&  (this.width == 0) &&  (this.height== 0)};
