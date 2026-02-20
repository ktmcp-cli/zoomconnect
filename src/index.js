import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig, setConfig, isConfigured } from './config.js';
import { makeRequest } from './api.js';

const program = new Command();

// ============================================================
// Helpers
// ============================================================

function printSuccess(message) {
  console.log(chalk.green('✓') + ' ' + message);
}

function printError(message) {
  console.error(chalk.red('✗') + ' ' + message);
}

function printTable(data, columns) {
  if (!data || data.length === 0) {
    console.log(chalk.yellow('No results found.'));
    return;
  }

  const widths = {};
  columns.forEach(col => {
    widths[col.key] = col.label.length;
    data.forEach(row => {
      const val = String(col.format ? col.format(row[col.key], row) : (row[col.key] ?? ''));
      if (val.length > widths[col.key]) widths[col.key] = val.length;
    });
    widths[col.key] = Math.min(widths[col.key], 50);
  });

  const header = columns.map(col => col.label.padEnd(widths[col.key])).join('  ');
  console.log(chalk.bold(chalk.cyan(header)));
  console.log(chalk.dim('─'.repeat(header.length)));

  data.forEach(row => {
    const line = columns.map(col => {
      const val = String(col.format ? col.format(row[col.key], row) : (row[col.key] ?? ''));
      return val.substring(0, widths[col.key]).padEnd(widths[col.key]);
    }).join('  ');
    console.log(line);
  });

  console.log(chalk.dim(`\n${data.length} result(s)`));
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

async function withSpinner(message, fn) {
  const spinner = ora(message).start();
  try {
    const result = await fn();
    spinner.stop();
    return result;
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

function requireAuth() {
  if (!isConfigured()) {
    printError('API credentials not configured.');
    console.log('\nRun the following to configure:');
    console.log(chalk.cyan('  zoomconnect config set --email YOUR_EMAIL --token YOUR_API_TOKEN'));
    console.log('\nGet your API token at: https://www.zoomconnect.com/app/api/rest');
    process.exit(1);
  }
}

// ============================================================
// Program metadata
// ============================================================

program
  .name('zoomconnect')
  .description(chalk.bold('Zoom Connect SMS CLI') + ' - Send SMS from your terminal')
  .version('1.0.0');

// ============================================================
// CONFIG
// ============================================================

const configCmd = program.command('config').description('Manage CLI configuration');

configCmd
  .command('set')
  .description('Set configuration values')
  .option('--email <email>', 'Your ZoomConnect account email')
  .option('--token <token>', 'Your ZoomConnect REST API token')
  .action((options) => {
    let updated = false;
    if (options.email) {
      setConfig('email', options.email);
      printSuccess('Email set');
      updated = true;
    }
    if (options.token) {
      setConfig('token', options.token);
      printSuccess('API token set');
      updated = true;
    }
    if (!updated) {
      printError('No options provided. Use --email or --token');
    }
  });

configCmd
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const email = getConfig('email');
    const token = getConfig('token');
    console.log(chalk.bold('\nZoom Connect SMS CLI Configuration\n'));
    console.log('Email: ', email ? chalk.green(email) : chalk.red('not set'));
    console.log('Token: ', token ? chalk.green(token.substring(0, 8) + '...' + token.slice(-4)) : chalk.red('not set'));
    console.log('');
  });

// ============================================================
// SMS
// ============================================================

const smsCmd = program.command('sms').description('Send and manage SMS messages');

smsCmd
  .command('send <to> <message>')
  .description('Send an SMS message')
  .option('--campaign <name>', 'Campaign name')
  .option('--date <datetime>', 'Schedule message for later (ISO format)')
  .option('--data-field <data>', 'Custom data field')
  .option('--json', 'Output as JSON')
  .action(async (to, message, options) => {
    requireAuth();

    try {
      const payload = {
        recipientNumber: to,
        message: message
      };

      if (options.campaign) payload.campaign = options.campaign;
      if (options.date) payload.dateToSend = options.date;
      if (options.dataField) payload.dataField = options.dataField;

      const data = await withSpinner(
        `Sending SMS to ${to}...`,
        () => makeRequest('POST', '/api/rest/v1/sms/send', payload)
      );

      if (options.json) {
        printJson(data);
        return;
      }

      console.log(chalk.bold('\nSMS Sent\n'));
      console.log('Recipient:  ', chalk.cyan(to));
      console.log('Message:    ', message);
      console.log('Message ID: ', chalk.green(data.messageId || data.id || 'Success'));
      console.log('');
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

smsCmd
  .command('send-bulk <file>')
  .description('Send multiple SMS from a JSON file')
  .option('--rate <number>', 'Messages per minute limit')
  .option('--json', 'Output as JSON')
  .action(async (file, options) => {
    requireAuth();

    try {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(file, 'utf8');
      const messages = JSON.parse(fileContent);

      const payload = {
        messages: messages
      };

      if (options.rate) payload.messagesPerMinute = parseInt(options.rate);

      const data = await withSpinner(
        `Sending ${messages.length} SMS messages...`,
        () => makeRequest('POST', '/api/rest/v1/sms/send-bulk', payload)
      );

      if (options.json) {
        printJson(data);
        return;
      }

      console.log(chalk.bold('\nBulk SMS Sent\n'));
      console.log('Total messages: ', chalk.cyan(messages.length));
      console.log('');

      if (Array.isArray(data)) {
        const successful = data.filter(r => r.messageId || r.success).length;
        const failed = data.length - successful;
        console.log('Successful: ', chalk.green(successful));
        console.log('Failed:     ', chalk.red(failed));
      }
      console.log('');
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

smsCmd
  .command('list')
  .description('List sent messages (via statistics)')
  .option('--from <date>', 'Start date (dd-MM-yyyy)')
  .option('--to <date>', 'End date (dd-MM-yyyy)')
  .option('--campaign <name>', 'Filter by campaign')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();

    try {
      const params = {};
      if (options.from) params.from = options.from;
      if (options.to) params.to = options.to;
      if (options.campaign) params.campaign = options.campaign;

      const data = await withSpinner(
        'Fetching message statistics...',
        () => makeRequest('GET', '/api/rest/v1/account/statistics', null, params)
      );

      if (options.json) {
        printJson(data);
        return;
      }

      console.log(chalk.bold('\nMessage Statistics\n'));

      if (data.userStatistics && Array.isArray(data.userStatistics)) {
        const tableData = data.userStatistics.map(stat => ({
          user: stat.userEmailAddress || 'N/A',
          sent: stat.messagesSent || 0,
          delivered: stat.messagesDelivered || 0,
          failed: stat.messagesFailed || 0
        }));

        printTable(tableData, [
          { key: 'user', label: 'User' },
          { key: 'sent', label: 'Sent' },
          { key: 'delivered', label: 'Delivered' },
          { key: 'failed', label: 'Failed' }
        ]);
      } else {
        console.log(chalk.yellow('No statistics available'));
        console.log('');
      }
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

// ============================================================
// ACCOUNT
// ============================================================

const accountCmd = program.command('account').description('Manage account and view balance');

accountCmd
  .command('balance')
  .description('Get account credit balance')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();

    try {
      const data = await withSpinner(
        'Fetching account balance...',
        () => makeRequest('GET', '/api/rest/v1/account/balance')
      );

      if (options.json) {
        printJson(data);
        return;
      }

      console.log(chalk.bold('\nAccount Balance\n'));
      console.log('Credits: ', chalk.green(data.creditBalance || data.balance || '0'));
      console.log('');
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

accountCmd
  .command('statistics')
  .description('View account statistics')
  .option('--from <date>', 'Start date (dd-MM-yyyy)')
  .option('--to <date>', 'End date (dd-MM-yyyy)')
  .option('--campaign <name>', 'Filter by campaign')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();

    try {
      const params = {};
      if (options.from) params.from = options.from;
      if (options.to) params.to = options.to;
      if (options.campaign) params.campaign = options.campaign;

      const data = await withSpinner(
        'Fetching statistics...',
        () => makeRequest('GET', '/api/rest/v1/account/statistics', null, params)
      );

      if (options.json) {
        printJson(data);
        return;
      }

      console.log(chalk.bold('\nAccount Statistics\n'));

      if (data.userStatistics && Array.isArray(data.userStatistics)) {
        data.userStatistics.forEach(stat => {
          console.log(chalk.cyan(stat.userEmailAddress || 'Unknown User'));
          console.log('  Messages Sent:      ', stat.messagesSent || 0);
          console.log('  Messages Delivered: ', stat.messagesDelivered || 0);
          console.log('  Messages Failed:    ', stat.messagesFailed || 0);
          if (stat.creditValue) {
            console.log('  Credit Value:       ', stat.creditValue);
          }
          console.log('');
        });
      } else {
        console.log(chalk.yellow('No statistics available'));
        console.log('');
      }
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

// ============================================================
// CONTACTS
// ============================================================

const contactsCmd = program.command('contacts').description('Manage contacts');

contactsCmd
  .command('list')
  .description('List all contacts')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();

    try {
      const data = await withSpinner(
        'Fetching contacts...',
        () => makeRequest('GET', '/api/rest/v1/contacts/all')
      );

      if (options.json) {
        printJson(data);
        return;
      }

      console.log(chalk.bold('\nContacts\n'));

      if (Array.isArray(data)) {
        const tableData = data.map(contact => ({
          id: contact.contactId || contact.id,
          name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          number: contact.contactNumber || contact.phoneNumber,
          title: contact.title || ''
        }));

        printTable(tableData, [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'number', label: 'Number' },
          { key: 'title', label: 'Title' }
        ]);
      } else {
        console.log(chalk.yellow('No contacts found'));
        console.log('');
      }
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

contactsCmd
  .command('create')
  .description('Create a new contact')
  .option('--first-name <name>', 'First name')
  .option('--last-name <name>', 'Last name')
  .option('--number <phone>', 'Contact number (required)')
  .option('--title <title>', 'Title')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();

    if (!options.number) {
      printError('Contact number is required. Use --number');
      process.exit(1);
    }

    try {
      const payload = {
        contactNumber: options.number
      };

      if (options.firstName) payload.firstName = options.firstName;
      if (options.lastName) payload.lastName = options.lastName;
      if (options.title) payload.title = options.title;

      const data = await withSpinner(
        'Creating contact...',
        () => makeRequest('POST', '/api/rest/v1/contacts/create', payload)
      );

      if (options.json) {
        printJson(data);
        return;
      }

      console.log(chalk.bold('\nContact Created\n'));
      console.log('ID:     ', chalk.green(data.contactId || data.id || 'Success'));
      console.log('Name:   ', `${options.firstName || ''} ${options.lastName || ''}`.trim() || 'N/A');
      console.log('Number: ', options.number);
      if (options.title) console.log('Title:  ', options.title);
      console.log('');

      printSuccess('Contact created successfully');
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

contactsCmd
  .command('get <id>')
  .description('Get contact details')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    requireAuth();

    try {
      const data = await withSpinner(
        `Fetching contact ${id}...`,
        () => makeRequest('GET', `/api/rest/v1/contacts/${id}`)
      );

      if (options.json) {
        printJson(data);
        return;
      }

      console.log(chalk.bold('\nContact Details\n'));
      console.log('ID:     ', chalk.cyan(data.contactId || data.id));
      console.log('Name:   ', `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A');
      console.log('Number: ', data.contactNumber || data.phoneNumber || 'N/A');
      console.log('Title:  ', data.title || 'N/A');
      console.log('');
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

contactsCmd
  .command('update <id>')
  .description('Update a contact')
  .option('--first-name <name>', 'First name')
  .option('--last-name <name>', 'Last name')
  .option('--number <phone>', 'Contact number')
  .option('--title <title>', 'Title')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    requireAuth();

    const payload = {};
    if (options.firstName) payload.firstName = options.firstName;
    if (options.lastName) payload.lastName = options.lastName;
    if (options.number) payload.contactNumber = options.number;
    if (options.title) payload.title = options.title;

    if (Object.keys(payload).length === 0) {
      printError('No fields to update. Use --first-name, --last-name, --number, or --title');
      process.exit(1);
    }

    try {
      const data = await withSpinner(
        `Updating contact ${id}...`,
        () => makeRequest('POST', `/api/rest/v1/contacts/${id}`, payload)
      );

      if (options.json) {
        printJson(data);
        return;
      }

      console.log(chalk.bold('\nContact Updated\n'));
      printSuccess(`Contact ${id} updated successfully`);
      console.log('');
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

contactsCmd
  .command('delete <id>')
  .description('Delete a contact')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    requireAuth();

    try {
      const data = await withSpinner(
        `Deleting contact ${id}...`,
        () => makeRequest('DELETE', `/api/rest/v1/contacts/${id}`)
      );

      if (options.json) {
        printJson(data);
        return;
      }

      console.log(chalk.bold('\nContact Deleted\n'));
      printSuccess(`Contact ${id} deleted successfully`);
      console.log('');
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

// ============================================================
// Parse
// ============================================================

program.parse(process.argv);

if (process.argv.length <= 2) {
  program.help();
}
