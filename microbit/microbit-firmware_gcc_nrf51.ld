/* Linker script to configure memory regions. */

SEARCH_DIR(.)
GROUP(-lgcc -lc -lnosys)

MEMORY
{
  /* S130 v 2.0 uses 104kB (0x1b000 bytes) of flash */
  FLASH (rx) : ORIGIN = 0x1b000, LENGTH = 0x25000
  /* 8kB RAM for SD and 8kB for user */
  RAM (rwx) :  ORIGIN = 0x20001fe8, LENGTH = 0x2018
}

SECTIONS
{
  .fs_data :
  {
    PROVIDE(__start_fs_data = .);
    KEEP(*(.fs_data))
    PROVIDE(__stop_fs_data = .);
  } > RAM
  .pwr_mgmt_data :
  {
    PROVIDE(__start_pwr_mgmt_data = .);
    KEEP(*(.pwr_mgmt_data))
    PROVIDE(__stop_pwr_mgmt_data = .);
  } > RAM
} INSERT AFTER .data;

INCLUDE "nrf5x_common.ld"
