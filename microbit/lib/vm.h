#ifndef VM_H__
#define VM_H__

void dev_poll(void);
uint32_t now(void);
int32_t lib_random(int32_t,int32_t);

void clear();
void rsend(uint8_t);

int rand(void);

uint32_t now(void);

void vm(void);
void vm_run(void);
void vm_stop(void);
void vm_runcc(uint32_t);
int32_t vm_pop(void);
int32_t vm_pop_raw(void);
void vm_run_toggle(uint8_t);
void vm_push(int32_t);
void vm_push_float(float);
void resume(int32_t*);
void eol_repeat(void);
void eol_list(void);
void eol_waituntil(void);
void eol_repeatuntil_cond(void);
void eol_repeatuntil_action(void);
void eol_step(void);
void wait_loop(void);
void eval_ufun(void);
void setup_stack(int32_t*,uint32_t,uint8_t);
void toggle_stack(int32_t*,uint32_t,uint8_t);

#endif
