#include "nrf_gpio.h"

#define RX_PIN_NUMBER  25
#define TX_PIN_NUMBER  24

void uart_init()
{
	nrf_gpio_cfg_output(TX_PIN_NUMBER);
  nrf_gpio_cfg_input(RX_PIN_NUMBER, NRF_GPIO_PIN_NOPULL);

  NRF_UART0->PSELTXD = TX_PIN_NUMBER;
  NRF_UART0->PSELRXD = RX_PIN_NUMBER;

  NRF_UART0->BAUDRATE         = (UART_BAUDRATE_BAUDRATE_Baud19200 << UART_BAUDRATE_BAUDRATE_Pos);
  NRF_UART0->ENABLE           = (UART_ENABLE_ENABLE_Enabled << UART_ENABLE_ENABLE_Pos);
  NRF_UART0->TASKS_STARTTX    = 1;
  NRF_UART0->TASKS_STARTRX    = 1;
  NRF_UART0->EVENTS_RXDRDY    = 0;
}

uint8_t ugetc(void)
{
  while (NRF_UART0->EVENTS_RXDRDY!=1) {}
  NRF_UART0->EVENTS_RXDRDY=0;
  return (uint8_t) NRF_UART0->RXD;
}

void uputc(uint8_t c)
{
  NRF_UART0->TXD = c;
  while (NRF_UART0->EVENTS_TXDRDY!=1) {}
  NRF_UART0->EVENTS_TXDRDY = 0;
}
