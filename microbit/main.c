#include <stdint.h>

#include "nordic_common.h"
#include "nrf.h"
#include "nrf_soc.h"
#include "nrf_gpio.h"
#include "nrf_nvic.h"
#include "app_timer.h"
#include "softdevice_handler.h"

#include "microbit.h"
#include "lib/vm.h"
#include "lib/vm_uart.h"
#include "lib/vm_ble.h"

#define APP_TIMER_PRESCALER      0
#define APP_TIMER_OP_QUEUE_SIZE  4

#define MAJOR_VERSION 0
#define MINOR_VERSION 1

volatile uint32_t ticks = 0;

static uint8_t flash_busy;

static void cfg_led_row(uint32_t pin)
{
  nrf_gpio_cfg(
      pin,
      NRF_GPIO_PIN_DIR_OUTPUT,
      NRF_GPIO_PIN_INPUT_DISCONNECT,
      NRF_GPIO_PIN_NOPULL,
      NRF_GPIO_PIN_H0H1,
      NRF_GPIO_PIN_NOSENSE);
}

static void cfg_led_matrix(void)
{
  cfg_led_row(13);
  cfg_led_row(4);
  nrf_gpio_pin_clear(13);
  nrf_gpio_pin_set(4);
}

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
  NRF_TIMER1->PRESCALER = 5;
  NRF_TIMER1->TASKS_CLEAR = 1;
  NRF_TIMER1->EVENTS_COMPARE[0] = 0;
  NRF_TIMER1->EVENTS_COMPARE[1] = 0;
  NRF_TIMER1->CC[0] = 500;
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
    /* [> lib_ticker(); <] */
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

void writeflash(){
  uint32_t addr = read32();
  uint8_t count = ugetc();
  uint8_t i;
  for(i=0; i<count; i++) {
    flash_word_write((uint32_t*)addr, read32());
  }
  sendresponse(0xfc);
}

void dispatch(uint8_t c){
  if(c==0xff) ping();
  /* else if(c==0xfe) readmemory(); */
  /* else if(c==0xfd) writememory(); */
  else if(c==0xfc) writeflash();
  /* else if(c==0xfb) eraseflash(); */
  /* else if(c==0xf8) runcc(); */
}

static void sys_evt_dispatch(uint32_t sys_evt)
{
  if (sys_evt == NRF_EVT_FLASH_OPERATION_SUCCESS) {
    flash_busy = 0;
  }
}

int main(void)
{
	uint32_t err_code;

  APP_TIMER_INIT(APP_TIMER_PRESCALER, APP_TIMER_OP_QUEUE_SIZE, false);
  /* uart_init(uart_data_handle); */
  uart_init();
  timer_init();

  cfg_led_matrix();
  ble_init(ble_data_received);

  err_code = ble_begin();
  APP_ERROR_CHECK(err_code);

  err_code = softdevice_sys_evt_handler_set(sys_evt_dispatch);
  APP_ERROR_CHECK(err_code);

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
