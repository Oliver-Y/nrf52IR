#ifndef LIB_H__
#define LIB_H__

extern int btna_evt, btnb_evt;

uint8_t *sensor_data[20];

void lib_init(void);
void lib_ticker(void);
void lib_poll(void);
void uputc(uint8_t);
void vm_push(int32_t);
uint32_t now(void);
uint8_t* poll_sensors(void);

void print(int32_t);

#endif
