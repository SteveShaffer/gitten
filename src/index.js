const yargs = require('yargs');

// noinspection BadExpressionStatementJS
yargs
  .scriptName('gitten')
  .commandDir('commands')
  .demandCommand()
  .help().argv;
