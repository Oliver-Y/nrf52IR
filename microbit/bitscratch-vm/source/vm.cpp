#include <stdint.h>

#define procs 0x30000
#define code ((uint8_t*)procs)
#define NSTACKS 8
#define STACKLEN 48
int32_t stacks[NSTACKS*STACKLEN];

#define OP_ONSTART 5
#define FIRST_FLAG 0xf0

void dev_poll(void);
int32_t now(void);
int32_t lib_random(int32_t,int32_t);

void clear();
void rsend(uint8_t);

extern void(*prims[])();
extern void(*libprims[])();

void vm(void);
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

int32_t *stack;
int32_t *sp;
uint8_t *ip;
int32_t *fp;
int32_t eoltype;

bool yieldnow;
int32_t boxes[20];

void vm_run(){
    int32_t *stack = stacks;
    for(int i=0;i<NSTACKS;i++){
        resume(stack);
        stack += STACKLEN;
    }
}

void vm_runcc(uint32_t startaddr){
    setup_stack(&stacks[STACKLEN*(NSTACKS-1)], startaddr, 0);
}

void vm_stop(){
    int32_t *stack = stacks;
    for(int i=0;i<NSTACKS;i++){
        *stack = 0;
        stack += STACKLEN;
    }
}

void vm_start(uint8_t type){
    int32_t *stack = stacks;
    uint32_t vector = procs;
    for(int i=0;i<NSTACKS;i++){
        setup_stack(stack, vector, type);
        stack += STACKLEN;
        vector += 4;
    }
}

void vm_run_toggle(uint8_t type){
    int32_t *stack = stacks;
    uint32_t vector = procs;
    for(int i=0;i<NSTACKS;i++){
        toggle_stack(stack, vector, type);
        stack += STACKLEN;
        vector += 4;
    }
}

void toggle_stack(int32_t *stack, uint32_t startaddr, uint8_t type){
    uint8_t firstop = *((uint8_t*) startaddr);
    if(type!=firstop) return;
    if((*stack)==0) setup_stack(stack,startaddr,type);
    else {*stack = 0; clear();}
}

void setup_stack(int32_t *stack, uint32_t startaddr, uint8_t type){
    uint8_t firstop = *((uint8_t*) startaddr);
    if((type!=0)&&(type!=firstop)) return;
    int32_t *sp = stack;
    sp += 1;                // leave space for the sp
    *sp++ = (int32_t) vm;   // continuation
    *sp++ = startaddr;
    *sp++ = 0;              // fp
    *sp++ = 0;              // eoltype
    *stack = (int32_t) sp;
}

void resume(int32_t *newstack){
    stack = newstack;
    sp = (int32_t*)*stack;
    if(sp==0) return;
    eoltype = *--sp;
    fp = (int32_t*)*--sp;
    ip = (uint8_t*)*--sp;
    yieldnow = false;
    ((void(*)())*--sp)();
}

void yield(int32_t continuation){
    *sp++ = continuation;
    *sp++ = (int32_t) ip;
    *sp++ = (int32_t) fp;
    *sp++ = eoltype;
    *stack = (int32_t) sp;
    yieldnow = true;
}

void vm(){
    while(1){
        dev_poll();
        uint8_t token = *ip++;
        if((token==0)||(token==0xff)){
            *stack=0;
            break;
        }
        if(token<0x40){
            void(*prim)() = prims[token];
            prim();
        } else if(token<0x80){
            void(*prim)() = libprims[token-0x40];
            prim();
        } else eval_ufun();
        if(yieldnow) break;
    }
}

void yield_vm(){yield((int32_t)vm);}

void eval_done(){}

void eval_byte(){
    *sp++ = (*ip++)*100;
}

void eval_num(){
    int32_t t0 = *ip++;
    t0 += (*ip++<<8);
    t0 += (*ip++<<16);
    t0 += (*ip++<<24);
    *sp++ = t0;
}

void eval_list(){
    uint8_t offset = *ip++;
    offset += *ip++<<8;
    *sp++ = (int32_t)ip;
    ip+=offset;
}

void eval_eol(){
    void(*fcn)() = (void(*)())eoltype;
    fcn();
}

int32_t *get_local_address(){
    int32_t t0 = (int8_t) *ip++;
    if(t0<0) return fp-t0-1;
    else return fp-t0-5;
}

void eval_lthing(){
    *sp++ = *get_local_address();
}

void eval_lset(){
    *get_local_address() = *--sp;
}

void eval_lchange(){
    *get_local_address() += *--sp;
}

void eval_ufun(){
    uint32_t newip = *ip++;
    newip += *ip++<<8;
    *sp++ = (int32_t)ip;
    ip = (uint8_t*)(newip+code);
    *sp++ = *ip++;
    *sp++ = (int32_t)fp;
    *sp++ = eoltype;
    fp = sp;
}

void prim_stop(){
    int32_t t0;
    if(fp==0) return;
    sp = fp;
    eoltype = *--sp;
    fp = (int32_t*) *--sp;
    t0 = *--sp;
    ip = (uint8_t*)*--sp;
    sp-= t0;
}

void prim_output(){
    int32_t t0;
    int32_t res = *--sp;
    sp = fp;
    eoltype = *--sp;
    fp = (int32_t*) *--sp;
    t0 = *--sp;
    ip = (uint8_t*)*--sp;
    sp-= t0;
    *sp++ = res;
}

void prim_stopall(){
    vm_stop();
    yieldnow = true;
}

void prim_stopothers(){
    vm_stop();
}


void prim_repeat(){
    *sp++ = (int32_t)ip;
    *sp++ = eoltype;
    eoltype = (int32_t)eol_repeat;
    eol_repeat();
}

void eol_repeat(){
    if(*(sp-4)<=50) {
        eoltype = *--sp;
        ip = (uint8_t*)(*--sp);
        sp-=2;
    }
    else {
        (*(sp-4))-=100;
        ip=(uint8_t*)(*(sp-3));
        yield((int32_t)vm);
    }
}

void prim_step(){
    int32_t boxindex = (*(sp-4))/100;
    int32_t from = (*(sp-3))/100;
    int32_t to = (*(sp-2))/100;
    if(from<=to){
        *(sp-3) = 100;
        boxes[boxindex] = (from-1)*100;
    } else {
        *(sp-3) = -100;
        boxes[boxindex] = (from+1)*100;
    }
    *sp++ = (int32_t)ip;
    *sp++ = eoltype;
    eoltype = (int32_t)eol_step;
    eol_step();
}

void eol_step(){
    int32_t boxindex = (*(sp-6))/100;
    int32_t delta = *(sp-5);
    int32_t to = *(sp-4);
    uint8_t *newip = (uint8_t*)(*(sp-3));
    int32_t val = boxes[boxindex];
    int done = (delta>0) ? val>=to : val<=to;
    if(done) {
        eoltype = *--sp;
        ip = (uint8_t*)(*--sp);
        sp-=4;
    }
    else {
        boxes[boxindex] +=  delta;
        ip = newip;
        yield((int32_t)vm);
    }
}

void prim_repeatuntil(){
    *sp++ = (int32_t) ip;
    *sp++ = eoltype;
    eoltype = (int32_t)eol_repeatuntil_cond;
    ip=(uint8_t*)(*(sp-4));
}

void eol_repeatuntil_cond(){
    int32_t res = *--sp;
    if(!res){
        eoltype = (int32_t)eol_repeatuntil_action;
        ip=(uint8_t*)(*(sp-3));
//        yield((int32_t)vm);
    } else {
        eoltype = *--sp;
        ip = (uint8_t*)(*--sp);
        sp-=2;
        yield((int32_t)vm);
    }
}

void eol_repeatuntil_action(){
    eoltype = (int32_t)eol_repeatuntil_cond;
    ip=(uint8_t*)(*(sp-4));
    yield((int32_t)vm);
}

void prim_waituntil(){
    *sp++ = (int32_t) ip;
    *sp++ = eoltype;
    eoltype = (int32_t)eol_waituntil;
    ip=(uint8_t*)(*(sp-3));
}

void eol_waituntil(){
    int32_t res = *--sp;
    if(!res){
        ip=(uint8_t*)(*(sp-3));
        yield((int32_t)vm);
    } else {
        eoltype = *--sp;
        ip = (uint8_t*)(*--sp);
        sp-=1;
        yield((int32_t)vm);
    }
}

void prim_forever(){
    eoltype = (int32_t)prim_forever;
    ip=(uint8_t*)(*(sp-1));
    yield((int32_t)vm);
}

void prim_if(){
    int32_t addr = *--sp;
    if(!*--sp) return;
    *sp++ = eoltype;
    *sp++ = (int32_t)ip;
    eoltype = (int32_t)eol_list;
    ip = (uint8_t*)addr;
}

void prim_ifelse(){
    int32_t addr;
    int32_t faddr = *--sp;
    int32_t taddr = *--sp;
    if(*--sp) addr = taddr;
    else addr = faddr;
    *sp++ = eoltype;
    *sp++ = (int32_t)ip;
    eoltype = (int32_t)eol_list;
    ip = (uint8_t*)addr;
}

void eol_list(){
    ip = (uint8_t*)(*--sp);
    eoltype = *--sp;
}

void prim_add(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1+t0;}
void prim_subtract(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1-t0;}
void prim_multiply(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = (int32_t)(((double)t1)*((double)t0)/100);}
void prim_divide(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = (int32_t)(((double)t1)/((double)t0)*100);}

void prim_mod(){
    int32_t t0 = (int32_t)(((float)*--sp)/100);
    int32_t t1 = (int32_t)(((float)*--sp)/100);
    int32_t res = t1%t0;
    if(res<0) res+= t0;
    *sp++=res*100;
}

void prim_equal(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = (t1==t0)*100;}
void prim_ne(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = (t1!=t0)*100;}
void prim_greater(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = (t1>t0)*100;}
void prim_less(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = (t1<t0)*100;}

void prim_and(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1&t0;}
void prim_or(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1|t0;}
void prim_xor(){int32_t t0 = *--sp; int32_t t1 = *--sp; *sp++ = t1^t0;}
void prim_not(){if(*--sp) *sp++=0; else *sp++=100;}

void prim_setbox(){
    int32_t t0 = *--sp;
    int32_t t1 = *--sp;
    boxes[t1/100] = t0;
}

void prim_box(){
    int32_t t0 = *--sp;
    *sp++ = boxes[t0/100];
}

void prim_changebox(){
    int32_t t0 = *--sp;
    int32_t t1 = *--sp;
    boxes[t1/100] += t0;
}

void prim_random(){
    int32_t max = (int32_t)(((float)*--sp)/100);
    int32_t min = (int32_t)(((float)*--sp)/100);
    if(max>min) *sp++ = lib_random(min,max)*100;
    else *sp++ = lib_random(max,min)*100;
}

void prim_broadcast(){
    int32_t n = (int32_t)(((float)*--sp)/100);
    vm_start(FIRST_FLAG+n);
    rsend(n);
}

void prim_wait(){
    if((*(sp-1))>2){
        *(sp-1) *= 10;
        (*(sp-1)) += now();
        wait_loop();
    } else sp--;
}

void wait_loop(){
    int32_t delta = (*(sp-1))-now();
    if(delta<80) {sp-=1; yield((int32_t)vm);}
    else yield((int32_t)wait_loop);
}


void vm_wait(float secs){
    *sp++ = (int32_t)(secs*100);
    prim_wait();
}

int32_t vm_pop(){
    int32_t n = *--sp;
    int32_t d = (n<0)?-50:50;
    return (int32_t)((((float)n)+d)/100);
}

void vm_push(int32_t x){*sp++=x*100;}
int32_t vm_pop_raw(){return *--sp;}
void vm_push_float(float n){*sp++=(int32_t)(n*100);} 
float vm_pop_float(){return ((float)*--sp)/100;}

void(*prims[])() = {
    eval_done,
    eval_byte, eval_num,
    eval_list, eval_eol,
    eval_lthing, eval_lset, eval_lchange,
    eval_ufun,
    prim_stop, prim_output,
    prim_stopall, prim_stopothers,
    prim_repeat, prim_forever, prim_if, prim_ifelse,
    prim_waituntil, prim_repeatuntil, prim_step,
    prim_add, prim_subtract, prim_multiply, prim_divide,
    prim_mod,
    prim_equal, prim_ne, prim_greater, prim_less,
    prim_and, prim_or, prim_xor,
    prim_not,
    prim_setbox, prim_box, prim_changebox,
    prim_broadcast,
    prim_random, prim_wait, 
};
