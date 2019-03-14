#define MAJOR_VERSION 0
#define MINOR_VERSION 1

#include <Arduino.h>
#include <SPI.h>
#include "Adafruit_BLE.h"
#include "Adafruit_BluefruitLE_SPI.h"
#include <stdint.h>
#include <FlashStorage.h>

#include "BluefruitConfig.h"

Adafruit_BluefruitLE_SPI ble(BLUEFRUIT_SPI_CS, BLUEFRUIT_SPI_IRQ, BLUEFRUIT_SPI_RST);
FlashClass flash;

#define OP_ONSTART 8
#define OP_ONFLAG 0xF0

uint8_t code[128];
int usb_comms=0, ble_comms=0;
int ble_connected=0;

void setup(void){
  pinMode(A0, INPUT_PULLUP);
  ble.begin();
  delay(2000);
  Serial.begin(115200);
  vm_stop();
  if(digitalRead(A0)) vm_start(OP_ONSTART);
}

void loop(void) {
  int32_t end = now()+50;
  while(now()<end){
    bleConnectCheck();
    if (Serial.available()){
      usb_comms = 1; 
      dispatch(Serial.read());
      usb_comms = 0;
    } 
    if (ble_connected&&ble.available()){
      ble_comms = 1; 
      dispatch(ble.read()); 
      ble_comms = 0;
    }
    vm_run();
  }
}

void dispatch(uint8_t c){
  if(c==0xff) ping();
  else if(c==0xfe) readmemory();
  else if(c==0xfd) writememory();
  else if(c==0xfc) writeflash();
  else if(c==0xfb) eraseflash();
  else if(c==0xfa) vm_start(OP_ONSTART);
  else if(c==0xf9) vm_stop();
  else if(c==0xf8) runcc();
}

void ping(){
  uint8_t buf[5];
//  vm_stop();
  buf[0] = 0xff;
  buf[1] = 2;
  buf[2] = MAJOR_VERSION;
  buf[3] = MINOR_VERSION;
  buf[4] = 0xed;
  send(buf,5);
}

void readmemory(){
  uint32_t addr = read32();
  uint32_t count = xgetc();
  uint32_t i;
  xputc(0xfe);
  xputc(count);
  for(i=0;i<count;i++) xputc(*((uint8_t*) addr++));
  xputc(0xed);
}

void writememory(){
  uint32_t addr = read32();
  uint32_t count = xgetc();
  uint32_t i;
  xputc(0xfd);
  xputc(count);
  for(i=0;i<count;i++){
      uint8_t c = xgetc();
      *((uint8_t*) addr++)=c;
      xputc(c);
  }
  xputc(0xed);
}

void writeflash(){
  uint32_t i;
  uint32_t dst = read32();
  uint32_t count = xgetc();
  for(i=0;i<count;i++){
      code[i]=xgetc();
  }
  flash.write((void*)dst, (void*)code, (uint32_t)count);    
  sendresponse(0xfc);
}

void eraseflash(){
  uint32_t addr = read32();
  flash.erase((uint8_t*)addr, 4096);
  sendresponse(0xfb);
}

void runcc(){
  uint32_t count = xgetc();
  xputc(0xf8);
  xputc(count);
  for(uint8_t i=0;i<count;i++){
    uint8_t c = xgetc();
    code[i] = c;
    xputc(c);
  }
  xputc(0xed);
  vm_runcc((uint32_t)code);
}


void bleConnectCheck(){
  if(ble.isConnected()&&!ble_connected){
    ble.setMode(BLUEFRUIT_MODE_DATA);
    ble_connected=1;
  } else if(ble_connected&&!ble.isConnected()){
    ble_connected=0;
  }
}

void xputc(uint8_t c){
  if(usb_comms) Serial.write(c);
  else if(ble_comms) ble.write(c);
}

uint8_t xgetc(){
  if(usb_comms) return Serial.read();
  else if(ble_comms){while(!ble.available()); return ble.read();}
  return 0;
}

uint32_t read32(){
    uint8_t c1 = xgetc();
    uint8_t c2 = xgetc();
    uint8_t c3 = xgetc();
    uint8_t c4 = xgetc();
    return (c4<<24)+(c3<<16)+(c2<<8)+c1;
}

void send(uint8_t * buf, int len){
  if(usb_comms) Serial.write(buf, len);
  else if(ble_comms) ble.write(buf,len);
}

void sendresponse(uint8_t resp){
  uint8_t buf[3];
  buf[0] = resp;
  buf[1] = 0;
  buf[2] = 0xed;
  send(buf,3);
}

uint32_t now(){return millis();}

