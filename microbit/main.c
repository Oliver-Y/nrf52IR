#include <stdint.h>

#include "nordic_common.h"
#include "nrf.h"
#include "nrf_soc.h"
#include "nrf_gpio.h"
#include "nrf_nvic.h"
#include "nrf_delay.h"
#include "app_timer.h"
#include "softdevice_handler.h"

#include "microbit.h"
#include "lib/lib.h"
#include "lib/vm.h"
#include "lib/vm_uart.h"
#include "lib/vm_ble.h"

#define APP_TIMER_PRESCALER      0
#define APP_TIMER_OP_QUEUE_SIZE  4

#define MAJOR_VERSION 0
#define MINOR_VERSION 1

#define ROW1 13
#define COL1 4

#define OP_ONBUTTONA 0x80
#define OP_ONBUTTONB 0x81

uint8_t code[128];
volatile uint32_t ticks = 0;

static uint8_t flash_busy;

uint8_t ble_comms = 0;
uint8_t usb_comms = 0;

void send(uint8_t *buf, int len)
{
  int i;
  if (usb_comms) {
    for(i=0;i<len;i++) uputc(*buf++);
  } else if (ble_comms) {
    for (i=0; i<len; i+=20) {
      if (len-i < 20) {
        ble_send_data(buf+i, len-i);
      } else {
        ble_send_data(buf+i, 20);
      }
    }
  }
}

uint8_t xgetc()
{
  if (usb_comms) return ugetc();
  else if (ble_comms) return ble_ugetc();
  return 0;
}

uint32_t read32(void)
{
  uint8_t c1 = xgetc();
  uint8_t c2 = xgetc();
  uint8_t c3 = xgetc();
  uint8_t c4 = xgetc();
  return (c4<<24)+(c3<<16)+(c2<<8)+c1;
}

void sendresponse(uint8_t resp)
{
  uint8_t buf[3];
  buf[0] = resp;
  buf[1] = 0;
  buf[2] = 0xed;
  if (usb_comms) {
    send(buf,3);
  } else if (ble_comms) {
    ble_send_data((uint8_t *)buf, 3);
  }
}

void ping()
{
  nrf_gpio_pin_set(13);
  nrf_gpio_pin_clear(4);
  uint8_t buf[5];
  buf[0] = 0xff;
  buf[1] = 2;
  buf[2] = MAJOR_VERSION;
  buf[3] = MINOR_VERSION;
  buf[4] = 0xed;
  send(buf,5);
}

void timer_init()
{
  NRF_TIMER1->MODE      = TIMER_MODE_MODE_Timer;
  NRF_TIMER1->BITMODE   = TIMER_BITMODE_BITMODE_16Bit;
  NRF_TIMER1->PRESCALER = 1;
  NRF_TIMER1->TASKS_CLEAR = 1;
  NRF_TIMER1->EVENTS_COMPARE[0] = 0;
  /* NRF_TIMER1->EVENTS_COMPARE[1] = 0; */
  NRF_TIMER1->CC[0] = 8000;
  /* NRF_TIMER1->CC[1] = 25000; */
  NRF_TIMER1->INTENSET = TIMER_INTENSET_COMPARE0_Enabled << TIMER_INTENSET_COMPARE0_Pos;
  NRF_TIMER1->SHORTS = (TIMER_SHORTS_COMPARE0_CLEAR_Enabled << TIMER_SHORTS_COMPARE0_CLEAR_Pos);
  /* NRF_TIMER1->INTENSET = TIMER_INTENSET_COMPARE1_Enabled << TIMER_INTENSET_COMPARE1_Pos; */
  /* NRF_TIMER1->SHORTS = (TIMER_SHORTS_COMPARE1_CLEAR_Enabled << TIMER_SHORTS_COMPARE1_CLEAR_Pos); */
  sd_nvic_SetPriority(TIMER1_IRQn, 3);
  sd_nvic_EnableIRQ(TIMER1_IRQn);
  /* NVIC_EnableIRQ(TIMER1_IRQn); */
  NRF_TIMER1->TASKS_START = 1;
}

void TIMER1_IRQHandler()
{
  if ((NRF_TIMER1->EVENTS_COMPARE[0] != 0) &&
     ((NRF_TIMER1->INTENSET & TIMER_INTENSET_COMPARE0_Msk) != 0)) {
    NRF_TIMER1->EVENTS_COMPARE[0] = 0;
    ticks = (ticks+1)&0x7fffffff;
    lib_ticker();
  }
  /* if ((NRF_TIMER1->EVENTS_COMPARE[1] != 0) && */
     /* ((NRF_TIMER1->INTENSET & TIMER_INTENSET_COMPARE1_Msk) != 0)) { */
    /* NRF_TIMER1->EVENTS_COMPARE[1] = 0; */
    /* vm_run(); */
  /* } */
}

void flash_word_write(uint32_t *p_address, uint32_t value)
{
  flash_busy = 1;
  sd_flash_write(p_address, (uint32_t*) &value, 1);
  while(flash_busy == 1){power_manage();}
}

void flash_page_erase(uint32_t *p_page)
{
  flash_busy = 1;
  sd_flash_page_erase(*p_page);
  while(flash_busy == 1){power_manage();}
}

void readmemory(){
  uint32_t addr = read32();
  uint32_t count = xgetc();
  uint32_t i;
  code[0] = 0xfe;
  code[1] = count;
  for(i=2; i<count+2; i++) {
    code[i] = *((uint8_t*) addr++);
  }
  code[i] = 0xed;
  send((uint8_t *)code, i+1);
}

void writememory(){
  uint32_t addr = read32();
  uint32_t count = xgetc();
  uint32_t i;
  code[0] = 0xfd;
  code[1] = count;
  for (i=2; i<count+2; i++) {
    uint8_t c = xgetc();
    *((uint8_t*) addr++)=c;
    code[i] = c;
  }
  code[i] = 0xed;
  send((uint8_t *)code, i+1);
}

void writeflash(){
  uint32_t addr = read32();
  uint8_t count = xgetc();
  uint32_t value;
  uint8_t i;
  if (ble_comms) {
    while (ble_uart_buff_length() < count) {power_manage();}
  }
  for(i=0; i<count; i++) {
    code[i] = xgetc();
  }
  for (i=0; i<count; i+=4) {
    value = (code[i+3]<<24)+(code[i+2]<<16)+(code[i+1]<<8)+code[i];
    flash_word_write((uint32_t*)addr, value);
    addr+=4;
  }
  sendresponse(0xfc);
}

void eraseflash(){
  uint32_t addr = read32();
  uint32_t page = addr / 0x400;
  uint32_t *p_page = &page;
  flash_page_erase(p_page);
  sendresponse(0xfb);
}

void runcc(){
  uint8_t i;
  uint32_t count = xgetc();
  code[0] = 0xf8;
  code[1] = count;
  for (i=2; i<count+2; i++){
    uint8_t c = xgetc();
    code[i] = c;
  }
  code[i] = 0xed;
  send((uint8_t *)code, i+1);
  vm_runcc((uint32_t)code+2);
}

void ble_dispatch(uint8_t c)
{
  ble_comms = 1;
  if(c==0xff) ping();
  else if(c==0xfe) readmemory();
  else if(c==0xfd) writememory();
  else if(c==0xfc) writeflash();
  else if(c==0xfb) eraseflash();
  else if(c==0xf8) runcc();
  ble_comms = 0;
}

void dispatch(uint8_t c)
{
  usb_comms = 1;
  if(c==0xff) ping();
  else if(c==0xfe) readmemory();
  else if(c==0xfd) writememory();
  else if(c==0xfc) writeflash();
  else if(c==0xfb) eraseflash();
  else if(c==0xf8) runcc();
  usb_comms = 0;
}

static void sys_evt_dispatch(uint32_t sys_evt)
{
  if (sys_evt == NRF_EVT_FLASH_OPERATION_SUCCESS) {
    flash_busy = 0;
  }
}

uint32_t now(){return ticks;}

int main(void)
{
	uint32_t err_code;

  APP_TIMER_INIT(APP_TIMER_PRESCALER, APP_TIMER_OP_QUEUE_SIZE, false);
  uart_init();
  lib_init();
  timer_init();

  ble_init();
  err_code = ble_begin();
  APP_ERROR_CHECK(err_code);

  err_code = softdevice_sys_evt_handler_set(sys_evt_dispatch);
  APP_ERROR_CHECK(err_code);

	nrf_gpio_pin_set(ROW1);
  nrf_gpio_pin_clear(COL1);
  nrf_delay_ms(500);
  nrf_gpio_pin_clear(ROW1);
  nrf_gpio_pin_set(COL1);

  vm_stop();

  uint32_t end = now() + 50;
  for (;;)
  {
    while (now()<end) {
      if (NRF_UART0->EVENTS_RXDRDY==1) {
        dispatch(ugetc());
      }
      if (ble_uart_available()) {
        ble_dispatch(ble_ugetc());
      }
      if(btna_evt){btna_evt=0; vm_run_toggle(OP_ONBUTTONA);}
      if(btnb_evt){btnb_evt=0; vm_run_toggle(OP_ONBUTTONB);}
    }
    lib_poll();
    vm_run();
    end+=50;
  }
}
