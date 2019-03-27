#include <stdbool.h>
#include <stdint.h>
#include "nrf_gpio.h"
#include "nrf_delay.h"
#include "nrf_nvic.h"

#define MAJOR_VERSION 0
#define MINOR_VERSION 1

#define OP_ONBUTTONA 0x80
#define OP_ONBUTTONB 0x81

uint8_t code[128];
volatile uint32_t ticks = 0;
extern int btna_evt, btnb_evt;

uint8_t blebuf[64];
volatile uint8_t ble_inptr = 0;
uint8_t ble_outptr = 0;

void print(int32_t);
void prh(unsigned int);
void prs(char*);

void ble_init(void (*)(uint8_t*,uint16_t));

void vm_runcc(uint32_t);
void vm_run(void);
void vm_stop(void);
void vm_run_toggle(uint8_t);

void lib_init(void);
void lib_poll(void);
void lib_ticker(void);

void uart_init(void);
void uputc(uint8_t);
uint8_t ugetc(void);
bool uavail(void);

void bleputc(uint8_t);
uint8_t blegetc(void);

void ble_send_data(uint8_t*, uint8_t);

void flash_init(void);
void flash_word_write(uint32_t*, uint32_t*, uint32_t);
void flash_page_erase(uint32_t*);

uint32_t now(void);

void timer_init(void);

int usb_comms=0, ble_comms=0;

void xputc(uint8_t c){
  if(usb_comms) uputc(c);
  else if(ble_comms) bleputc(c);
}

uint8_t xgetc(){
  if(usb_comms) return ugetc();
  else if(ble_comms){return blegetc();}
  return 0;
}

void send(uint8_t *buf, int len){
  if(usb_comms){
    int i;
    for(i=0;i<len;i++) uputc(*buf++);
  } else if(ble_comms) ble_send_data(buf, len);
}

void sendresponse(uint8_t resp){
  uint8_t buf[3];
  buf[0] = resp;
  buf[1] = 0;
  buf[2] = 0xed;
  send(buf,3);
}

uint32_t read32(){
  uint8_t c1 = xgetc();
  uint8_t c2 = xgetc();
  uint8_t c3 = xgetc();
  uint8_t c4 = xgetc();
  return (c4<<24)+(c3<<16)+(c2<<8)+c1;
}

void ping(){
  uint8_t buf[5];
  buf[0] = 0xff;
  buf[1] = 2;
  buf[2] = MAJOR_VERSION;
  buf[3] = MINOR_VERSION;
  buf[4] = 0xed;
  send(buf,5);
}


void readmemory(){
  uint32_t addr = read32();
  uint32_t count = ugetc();
  uint32_t i;
  uputc(0xfe);
  uputc(count);
  for(i=0;i<count;i++) uputc(*((uint8_t*) addr++));
  uputc(0xed);
}

void writememory(){
  uint32_t addr = read32();
  uint32_t count = ugetc();
  uint32_t i;
  uputc(0xfd);
  uputc(count);
  for(i=0;i<count;i++){
      uint8_t c = ugetc();
      *((uint8_t*) addr++)=c;
      uputc(c);
  }
  uputc(0xed);
}

void writeflash(){
  uint32_t addr = read32();
  uint32_t count = xgetc();
  uint32_t i;
  for(i=0;i<count;i++){
    uint8_t c = xgetc();
    code[i] = c;
  }
  flash_word_write((uint32_t*)addr, (uint32_t*)code, count);
  sendresponse(0xfc);
}

void eraseflash(){
  uint32_t addr = read32();
  flash_page_erase((uint32_t*) addr);
  sendresponse(0xfb);
}

void runcc(){
  int i;
  uint32_t count = xgetc();
  for(i=0;i<count;i++){
    uint8_t c = xgetc();
    code[i] = c;
  }
  sendresponse(0xf8);
  vm_runcc((uint32_t)code);
}

void dispatch(uint8_t c){
  if(c==0xff) ping();
  else if(c==0xfe) readmemory();
  else if(c==0xfd) writememory();
  else if(c==0xfc) writeflash();
  else if(c==0xfb) eraseflash();
  else if(c==0xf8) runcc();
}

void ble_data_received(uint8_t *data, uint16_t length){
  int i;
//  print(length*100);
  for(i=0;i<length;i++){
    uint8_t newptr = ble_inptr;
    blebuf[ble_inptr] = data[i];
    newptr++; newptr%=64;
    if(newptr==ble_outptr) return;
    else ble_inptr = newptr;
  }
}

void bleputc(uint8_t c){
  ble_send_data(&c, 1);
}

uint8_t blegetc(){
  uint8_t res;
  while(ble_inptr==ble_outptr);
  res = blebuf[ble_outptr++];
  ble_outptr%=64;
  return res;
}

uint8_t bleavail(){return (ble_inptr==ble_outptr)?0:1;}

int main(void){
  uart_init();
  lib_init();
  ble_init(ble_data_received);
  flash_init();
  timer_init();
  prs("starting");
  vm_stop();

  uint32_t end = now()+50;
  while (1){
    while(now()<end){
      if(uavail()){usb_comms=1; dispatch(ugetc()); usb_comms=0;};
      if(bleavail()){ble_comms=1; dispatch(blegetc()); ble_comms=0;};
      if(btna_evt){btna_evt=0; vm_run_toggle(OP_ONBUTTONA);}
      if(btnb_evt){btnb_evt=0; vm_run_toggle(OP_ONBUTTONB);}
    }
    lib_poll();
    vm_run();
    end+=50;
  }
}


