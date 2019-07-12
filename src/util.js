const fs = require('fs');

const _ = require('lodash');

module.exports = {
  getConfig,
};

/**
 * Merges all valid .gish.json files in the file system above the current node (up to a limit) together into one master
 * config and returns it
 * @todo Cache the config in memory
 */
function getConfig() {
  const RECURSION_LIMIT = 100;
  return _.merge(
    ..._.range(RECURSION_LIMIT)
      .map(i => `${'../'.repeat(i)}.gish.json`)
      .reverse()
      .map(configFileToData),
  );

  function configFileToData(configFile) {
    try {
      return JSON.parse(
        fs
          .readFileSync(configFile)
          .toString()
          .trim(),
      );
    } catch (e) {
      return {};
    }
  }
}
