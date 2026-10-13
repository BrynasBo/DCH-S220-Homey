'use strict';

const Homey = require('homey');

module.exports = class DchS220App extends Homey.App {
  async onInit() {
    this.log('D-Link DCH-S220 app started');

    this.homey.flow.getActionCard('siren_play').registerRunListener(async args => {
      return args.device.play({
        sound: Number(args.sound),
        volume: Number(args.volume),
        duration: Number(args.duration),
      });
    });

    this.homey.flow.getActionCard('siren_stop').registerRunListener(async args => {
      return args.device.stop();
    });

    this.homey.flow.getActionCard('siren_beep').registerRunListener(async args => {
      return args.device.beep(Number(args.times), Number(args.volume));
    });

    this.homey.flow.getActionCard('siren_chime_sequences').registerRunListener(async args => {
      return args.device.chimeSequences(Number(args.times), Number(args.volume));
    });
  }
};
