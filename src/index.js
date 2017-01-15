/* eslint-disable no-param-reassign */

const hostname = require('os').hostname;
const hoek = require('hoek');
const Stream = require('stream');
const Raven = require('raven');

const internals = {
  defaults: {
    name: hostname(),
    logger: '',
    release: '',
    environment: '',
  },
};

class GoodSentry extends Stream.Writable {
  constructor({ dsn = null, config = {}, captureUncaught = false } = {}) {
    super({ objectMode: true, decodeStrings: false });

    const settings = hoek.applyToDefaults(internals.defaults, config);
    const args = (dsn === null) ? [settings] : [dsn, settings];

    this._client = Raven.config(...args);
    if (captureUncaught) {
      this._client.install();
    }
  }
  _write(data, encoding, cb) {
    const additionalData = {
      level: ((tags = []) => {
        tags = (typeof tags === 'string') ? [tags] : tags;
        if (hoek.contain(tags, ['fatal'], { part: true })) {
          return 'fatal';
        } else if (hoek.contain(tags, ['err', 'error'], { part: true })) {
          return 'error';
        } else if (hoek.contain(tags, ['warn', 'warning'], { part: true })) {
          return 'warning';
        } else if (hoek.contain(tags, ['info'], { part: true })) {
          return 'info';
        }

        return 'debug';
      })(data.tags),
      tags: ((tags = []) => tags.filter(
        (tag) => [
          'fatal',
          'error',
          'warning',
          'info',
          'debug',
        ].includes(tag) === false,
      ).reduce((acc, curr) => {
        acc[curr] = true;
        return acc;
      }, {}))(data.tags),
      extra: {
        event: data.event,
      },
    };

    this._client.captureMessage(data.data, additionalData, () => cb());
  }
}

module.exports = GoodSentry;
