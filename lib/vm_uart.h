#ifndef VM_UART_H__
#define VM_UART_H__

// #include "app_uart.h"

void uart_init(void);
uint8_t ugetc(void);
void uputc(uint8_t c);
// void uart_event_handle(app_uart_evt_t * p_event);
// void uart_init(void (*cb)(uint8_t *data, uint16_t length));
// uint32_t vm_uart_put(uint8_t c);
// uint32_t vm_uart_print(uint8_t *data, uint16_t length);

#endif

