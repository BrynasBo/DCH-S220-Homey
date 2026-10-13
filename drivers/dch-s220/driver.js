'use strict';

const Homey = require('homey');
const { HnapClient } = require('../../lib/hnap-client');

module.exports = class DchS220Driver extends Homey.Driver {
  async onPair(session) {
    let credentials = null;

    session.setHandler('credentials', async data => {
      const ip = String(data.ip || '').trim();
      const username = String(data.username || 'Admin').trim();
      const pin = String(data.pin || '').trim();
      if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) throw new Error('Ogiltig IP-adress');
      if (!username) throw new Error('Användarnamn saknas');
      if (!/^\d{6}$/.test(pin)) throw new Error('PIN-koden måste bestå av sex siffror');

      this.log(`Testing DCH-S220 connection at ${ip}`);
      const client = new HnapClient({ ip, username, pin });
      await client.login();
      await client.getPlayingStatus();
      credentials = { ip, username, pin };
      this.log(`DCH-S220 connection at ${ip} succeeded`);
      return true;
    });

    session.setHandler('list_devices', async () => {
      if (!credentials) throw new Error('Fyll i och testa anslutningen först');
      return [{
        name: 'D-Link DCH-S220',
        data: { id: `dch-s220-${credentials.ip}` },
        settings: { ...credentials, poll_interval: 15 },
        capabilities: ['onoff', 'siren_sound', 'siren_volume', 'siren_duration'],
        store: { model: 'DCH-S220' },
      }];
    });
  }
};
