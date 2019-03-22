#ifndef LIB_H__
#define LIB_H__

void lib_init(void);
void lib_ticker(void);
void uputc(uint8_t);
void vm_push(int32_t);
uint32_t now(void);

void print(int32_t);

#endif
