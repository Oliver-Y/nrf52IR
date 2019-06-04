#ifndef VM_UART_H__
#define VM_UART_H__

void uart_init(void);
uint8_t ugetc(void);
void uputc(uint8_t c);

#endif

