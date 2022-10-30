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

const { Gain } = require('./ads1015.js');
const { Channel } = require('./ads1015.js');

const ads1015 = require('./ads1015.js');

const test = async () => {
  console.log('------------- Constants -------------')

  console.log('Bus number: ' + ads1015.I2C_BUS);
  console.log('Device address: 0x' + ads1015.I2C_ADDRESS.toString(16));

  console.log('------------- Enums -------------')

  console.log('Gain ONE: ' + Gain.ONE.scale);
  console.log('Channel TWO: 0b' + Channel.TWO.toString(2).padStart(8, 0));

  await ads1015.init();

  console.log('------------- Channel ZERO -------------')

  console.log(await ads1015.measure(Channel.ZERO, Gain.TWO_THIRDS));
  console.log(await ads1015.measure(Channel.ZERO, Gain.ONE));
  console.log(await ads1015.measure(Channel.ZERO, Gain.TWO));
  console.log(await ads1015.measure(Channel.ZERO, Gain.FOUR));
  console.log(await ads1015.measure(Channel.ZERO, Gain.EIGHT));
  console.log(await ads1015.measure(Channel.ZERO, Gain.SIXTEEN));

  console.log('------------- Loop -------------')

  const job = setInterval(async () => {
    console.log(await ads1015.measure(Channel.ZERO, Gain.ONE));
  }, 500);
}

test();
