/*
 * Copyright 2022 Luis Martins <luis.martins@gmail.com>
 * 
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 */

const i2c = require('i2c-bus');

/**
 * Datasheet for the ADS1015 can be found at: https://cdn-shop.adafruit.com/datasheets/ads1015.pdf
 */

const Mode = {
  CONTINUOUS: 0b0,
  SINGLE: 0b1
}

/**
 * The programmable gain amplifier (PGA) is configured by three bits in the config register.
 *
 * A gain of 2/3 allows input measurement to extend up to the supply voltage when VDD is larger than 4V.
 * Although in this case, as well as for PGA = 1 and VDD < 4V, it is not possible to reach a full-scale
 * output code on the ADC.
 *
 * The scale is used to calculate the true voltage from the raw ADC value.
 */
const Gain = {
  TWO_THIRDS: { option: 0b00000000, scale: 6.144 }, // default, input range of +/- 6.144V
  ONE: { option: 0b00000010, scale: 4.096 }, // input range of +/- 4.096V
  TWO: { option: 0b00000100, scale: 2.048 }, // input range of +/- 2.048V
  FOUR: { option: 0b00000110, scale: 1.024 }, // input range of +/- 1.024V
  EIGHT: { option: 0b00001000, scale: 0.512 }, // input range of +/- 0.512V
  SIXTEEN: { option: 0b00001010, scale: 0.256 } // input range of +/- 0.256V
}

const Channel = {
  ZERO: 0b01000000, // ZERO to THREE are single ended channels
  ONE: 0b01010000,
  TWO: 0b01100000,
  THREE: 0b01110000,
  ZERO_ONE: 0b00000000, // (default) differential channels, channel 0 is the positive
  TWO_THREE: 0b00110000 // channel 2 is the positive
}

const I2C_BUS = 1; // default to bus number 1
const I2C_ADDRESS = 0x48; // default device address when the ADDR pin is connected to GND

/**
 * The ADS1015 contains two 16 bit registers:
 *   - 0b00 is the conversion register where data is stored after an ADC operation
 *   - 0b01 is the configuration register
 */
const CONVERSION_REGISTER = 0b00;
const CONFIG_REGISTER = 0b01;

/**
 * The ADS1015 has a conversion delay of 1ms.
 * We can afford to wait for a little longer and be sure the conversion has finished.
 */
const CONVERSION_DELAY = 100;

/**
 * These are the LSB of the 16 bit config register and represent:
 *   - data rate of 128 samples per second (bits 7 to 5)
 *   - traditional comparator mode with hysteresis (bit 4)
 *   - comparator polarity with active low (bit 3)
 *   - non latching comparator (bit 2)
 *   - disable comparator (bits 1 and 0)
 */
const DEFAULT_OPTIONS = 0b00000011;

/**
 * Write 1 to bit 15 of the config register to start a conversion.
 */
const BEGIN_SINGLE_CONVERSION = 0b10000000;

let _bus;
let _address;

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const open = (number) => {
  return new Promise((resolve, reject) => {
    const bus = i2c.open(number, (error) => {
      if(error) {
        reject(error);
      } else {
        resolve(bus);
      }
    });
  });
}

const scan = () => {
  return new Promise((resolve, reject) => {
    _bus.scan((error, devices) => {
		if(error) {
		  reject(error);
		} else {
		  resolve(devices);
		}
    });
  });
}

/**
 * When reading data from the conversion register, first we need to write one byte to the device
 * to tell it from which register we want to read from. 
 */
const read = async (register, length) => {
  return new Promise((resolve, reject) => {
    _bus.i2cWrite(_address, 1, Buffer.from([register]), (error) => {
		if(error) {
		  reject(error);
		} else {
          _bus.i2cRead(_address, length, Buffer.alloc(length), (error, bytes, buffer) => {
            if(error) {
              reject(error);
            } else {
              resolve(buffer);
            }
          });
		}
    });
  });
}

/**
 * When writing data to the config register, first we need to tell the device which register
 * we want to write to, this is done by the first byte in the payload.
 */
const write = async (register, data) => {
  data.unshift(register);

  return new Promise((resolve, reject) => {
    _bus.i2cWrite(_address, data.length, Buffer.from(data), (error) => {
		if(error) {
		  reject(error);
		} else {
		  resolve();
		}
    });
  });
}

const measure = async (channel, gain) => {
  const options = BEGIN_SINGLE_CONVERSION | channel | gain.option | Mode.SINGLE;

  // write two bytes to the config register, first is specific options and second is default options
  await write(CONFIG_REGISTER, [options, DEFAULT_OPTIONS]);
  await sleep(CONVERSION_DELAY); // wait for conversion

  // read two bytes, this is a 12 bit ADC so it will need two bytes to represent the value
  const data = await read(CONVERSION_REGISTER, 2);

  // the first byte contains the 8 most significant bits, these need to be shifted to the left
  // the second byte contains the 4 lest significan bits, the last four bits are always zero
  // and reserved for internal use, these need to be shifted to the right
  let value = data[0] << 4 | data[1] >> 4;

  if(value == 0x07ff || value == 0x0800) {
    console.log('WARN: full scale reached!'); // either positive or negative
  }

  if(value > 0x07ff) {
    value |= 0xf000; // negative number, extend the sign to the 16th bit
  }

  return gain.scale * value / 2048; // 11 bits (2048) value since the first bit is the sign bit
}

const init = async (number = I2C_BUS, address = I2C_ADDRESS) => {
  _bus = await open(number);

  const devices = await scan(_bus);

  if(devices.indexOf(address) == -1) {
    throw new Error('Device not found at the specified address.');
  }

  _address = address;
}

exports.Gain = Gain;
exports.Channel = Channel;

exports.init = init;
exports.measure = measure;

exports.I2C_BUS = I2C_BUS;
exports.I2C_ADDRESS = I2C_ADDRESS;
