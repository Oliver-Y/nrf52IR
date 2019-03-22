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

uint8_t code[128];
volatile uint32_t ticks = 0;

static uint8_t flash_busy;

void send(uint8_t *buf, int len)
{
  int i;
  for(i=0;i<len;i++) uputc(*buf++);
}

void sendresponse(uint8_t resp)
{
  uint8_t buf[3];
  buf[0] = resp;
  buf[1] = 0;
  buf[2] = 0xed;
  send(buf,3);
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

void ble_data_received(uint8_t *data, uint16_t length)
{
  /* vm_uart_print(data, length); */
}

void uart_data_handle(uint8_t *data, uint16_t length)
{
  uint32_t err_code = ble_send_data(data, length);
  APP_ERROR_CHECK(err_code);
}

void timer_init()
{
  NRF_TIMER1->MODE      = TIMER_MODE_MODE_Timer;
  NRF_TIMER1->BITMODE   = TIMER_BITMODE_BITMODE_16Bit;
  NRF_TIMER1->PRESCALER = 2;
  NRF_TIMER1->TASKS_CLEAR = 1;
  NRF_TIMER1->EVENTS_COMPARE[0] = 0;
  NRF_TIMER1->EVENTS_COMPARE[1] = 0;
  NRF_TIMER1->CC[0] = 4000;
  NRF_TIMER1->CC[1] = 25000;
  NRF_TIMER1->INTENSET = TIMER_INTENSET_COMPARE0_Enabled << TIMER_INTENSET_COMPARE0_Pos;
  NRF_TIMER1->SHORTS = (TIMER_SHORTS_COMPARE0_CLEAR_Enabled << TIMER_SHORTS_COMPARE0_CLEAR_Pos);
  NRF_TIMER1->INTENSET = TIMER_INTENSET_COMPARE1_Enabled << TIMER_INTENSET_COMPARE1_Pos;
  NRF_TIMER1->SHORTS = (TIMER_SHORTS_COMPARE1_CLEAR_Enabled << TIMER_SHORTS_COMPARE1_CLEAR_Pos);
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
  if ((NRF_TIMER1->EVENTS_COMPARE[1] != 0) &&
     ((NRF_TIMER1->INTENSET & TIMER_INTENSET_COMPARE1_Msk) != 0)) {
    NRF_TIMER1->EVENTS_COMPARE[1] = 0;
    vm_run();
  }
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
  uint8_t count = ugetc();
  uint32_t value;
  uint8_t i;
  for(i=0; i<count; i+=4) {
    value = read32();
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
  uint32_t count = ugetc();
  uputc(0xf8);
  uputc(count);
  for(uint8_t i=0;i<count;i++){
      uint8_t c = ugetc();
      code[i] = c;
      uputc(c);
    }
  uputc(0xed);
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

  ble_init(ble_data_received);

  err_code = ble_begin();
  APP_ERROR_CHECK(err_code);

  err_code = softdevice_sys_evt_handler_set(sys_evt_dispatch);
  APP_ERROR_CHECK(err_code);

	nrf_gpio_pin_set(ROW1);
  nrf_gpio_pin_clear(COL1);
  nrf_delay_ms(500);
  nrf_gpio_pin_clear(ROW1);
  nrf_gpio_pin_set(COL1);

  // Test flash write
  uint32_t *addr = (uint32_t *) 0x30000;
  uint32_t page = 0x30000 / 0x400;
  uint32_t *p_page = &page;
  uint32_t data = 0x31;
  flash_page_erase(p_page);
  flash_word_write(addr, data);
  uputc(*addr);

  vm_stop();

  for (;;)
  {
    if (NRF_UART0->EVENTS_RXDRDY==1) {
      dispatch(ugetc());
    }
  }
}
