
import yargs from 'yargs';

// noinspection BadExpressionStatementJS
yargs
  .scriptName('gitten')
  .commandDir('commands')
  .demandCommand()
  .help().argv;
