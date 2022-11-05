# ADS1015 Analog to Digital Converter

This is a Node.JS module for the [ADS1015](https://cdn-shop.adafruit.com/datasheets/ads1015.pdf) analog to
digital converter. Provides two simple asynchronous methods to interact with the device:

- `init(i2c_bus_number, device_address)` - initialises the device, both parameters are optional
- `measure(channel, gain)` - performs a single conversion on the given channel with the specified gain

## Constants

The two constants contain the default values for the I<sup>2</sup>C bus number and device address.

- `I2C_BUS` - defaults to bus number **1**
- `I2C_ADDRESS` - defaults to address **0x48**

## Enumerations

Two enumerations facilitate calls to the `measure(...)` method (see source code for details):

- `Gain` - controls the programmable gain amplifier of the device
- `Channel` - selects the device input

## Tests & Samples

The script [test.js](https://github.com/sailingscally/ads1015/blob/master/test.js) provides some sample
code which may be used to test connectivity to the device.

## Usage

This module isn't published to the NPM registry and needs to be installed from GitHub with the command:

```
npm install https://github.com/sailingscally/ads1015
```
