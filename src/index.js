const yargs = require('yargs');

// noinspection BadExpressionStatementJS
yargs
  .scriptName('gish') // TODO: Better name
  .commandDir('commands')
  .demandCommand()
  .help().argv;
