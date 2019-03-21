/* #include "app_uart.h" */
/* #include "ble_nus.h" */

#include "microbit.h"

/* #define UART_TX_BUF_SIZE  256 */
/* #define UART_RX_BUF_SIZE  256 */

/* void (*uart_callback)(uint8_t *data, uint16_t length); */

/* void uart_event_handle(app_uart_evt_t * p_event) */
/* { */
	/* static uint8_t data[BLE_NUS_MAX_DATA_LEN]; */
	/* static uint8_t index = 0; */
	/* [> uint32_t       err_code; <] */

	/* switch (p_event->evt_type) */
	/* { */
		/* case APP_UART_DATA_READY: */
			/* UNUSED_VARIABLE(app_uart_get(&data[index])); */
			/* index++; */

			/* if ((data[index - 1] == '\n') || (index >= (BLE_NUS_MAX_DATA_LEN))) */
			/* { */
        /* (*uart_callback)(data, index); */
				/* index = 0; */
			/* } */
			/* break; */

		/* case APP_UART_COMMUNICATION_ERROR: */
			/* APP_ERROR_HANDLER(p_event->data.error_communication); */
			/* break; */

		/* case APP_UART_FIFO_ERROR: */
			/* APP_ERROR_HANDLER(p_event->data.error_code); */
			/* break; */

		/* default: */
			/* break; */
	/* } */
/* } */

/* void uart_init(void (*cb)(uint8_t *data, uint16_t length)) */
void uart_init()
{
	nrf_gpio_cfg_output(TX_PIN_NUMBER);
  nrf_gpio_cfg_input(RX_PIN_NUMBER, NRF_GPIO_PIN_NOPULL);

  NRF_UART0->PSELTXD = TX_PIN_NUMBER;
  NRF_UART0->PSELRXD = RX_PIN_NUMBER;

  NRF_UART0->BAUDRATE         = (UART_BAUDRATE_BAUDRATE_Baud115200 << UART_BAUDRATE_BAUDRATE_Pos);
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

uint32_t read32(void)
{
  uint8_t c1 = ugetc();
  uint8_t c2 = ugetc();
  uint8_t c3 = ugetc();
  uint8_t c4 = ugetc();
  return (c4<<24)+(c3<<16)+(c2<<8)+c1;
}

/* uint32_t vm_uart_put(uint8_t c) */
/* { */
  /* return app_uart_put(c); */
/* } */

/* uint32_t vm_uart_print(uint8_t *data, uint16_t length) */
/* { */
  /* for (uint32_t i = 0; i < length; i++) */
  /* { */
    /* while (app_uart_put(data[i]) != NRF_SUCCESS); */
  /* } */
  /* while (app_uart_put('\r') != NRF_SUCCESS); */
  /* while (app_uart_put('\n') != NRF_SUCCESS); */
  /* return 1; */
/* } */
