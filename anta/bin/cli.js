#!/usr/bin/env node
// Copyright 2016 Google Inc. All Rights Reserved.
// Licensed under the Apache License, Version 2.0. See LICENSE
'use strict';

const yargs = require('yargs');
const PWMetrics = require('../lib/index');
const { getConfigFromFile, writeToDisk } = require('../lib/utils/fs');
let config;

const cliFlags = yargs
  .help('help')
  .version(() => require('../package').version)
  .showHelpOnFail(false, 'Specify --help for available options')
  .wrap(yargs.terminalWidth())
  .usage('Usage: $0 <url>')
  .command('url', 'URL to test')
  .option('json', {
    'describe': 'Output as json',
    'type': 'boolean',
    'default': 'false',
    'group': 'Output:'
  })
  .option('output-path', {
    'describe': 'The file path to output the results',
    'type': 'string',
    'default': 'stdout',
    'group': 'Output:'
  })
  .option('runs', {
    'describe': 'Does n runs (eg. 3, 5), and reports the median run\'s numbers.',
    'type': 'number',
    'default': 1,
  })
  .option('expectations', {
    'describe': 'Expectations from metrics results. Useful for CI. Config required.',
    'type': 'boolean',
    'default': false
  })
  .option('config', {
    'describe': 'Path to config file',
    'type': 'string'
  })
  .check((argv) => {
    // Make sure pwmetrics has been passed a url, either from cli or config fileg()

    // Test if flag was explicitly set, yargs default will always assume flag is called, lack of optional support
    if (argv.config !== undefined) {
      config = argv.config.length ? getConfigFromFile(argv.config) : getConfigFromFile();
    }

    if (argv._.length === 0 && (config === undefined || !config.url))
      throw new Error('ERROR: NO_URL');

    return true;
  })
  .epilogue('For more Lighthouse CLI options see https://github.com/GoogleChrome/lighthouse/#lighthouse-cli-options')
  .argv;

// Merge options from all sources. Order indicates precedence (last one wins)
const options = Object.assign({}, {flags: cliFlags}, config);

// Get url first from cmd line then from config file.
options.url = cliFlags._[0] || options.url;

if (!options.url || !options.url.length)
  throw new Error('NO_URL');

const pwMetrics = new PWMetrics(options.url, options);
pwMetrics.start()
  .then(data => {
    if (options.flags.json) {
      // serialize accordingly
      data = JSON.stringify(data, null, 2) + '\n';
      // output to file.
      if (options.flags.outputPath != 'stdout')
        return writeToDisk(options.flags.outputPath, data);
      // output to stdout
      else if (data)
        process.stdout.write(data);
    }
  }).then(() => {
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
