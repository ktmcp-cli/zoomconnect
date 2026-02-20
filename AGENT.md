# AGENT.md — Zoom Connect SMS CLI for AI Agents

This document explains how to use the Zoom Connect SMS CLI as an AI agent.

## Overview

The `zoomconnect` CLI provides SMS messaging capabilities via the Zoom Connect API. Use it to send SMS messages, manage contacts, and track messaging campaigns.

## Prerequisites

```bash
zoomconnect config set --email <email> --token <token>
```

Get your credentials at: https://www.zoomconnect.com/app/api/rest

## All Commands

### Config

```bash
zoomconnect config set --email <email> --token <token>
zoomconnect config show
```

### SMS

```bash
# Send single SMS
zoomconnect sms send +61412345678 "Your message"
zoomconnect sms send +61412345678 "Promo" --campaign "Sale2026"
zoomconnect sms send +61412345678 "Reminder" --date "2026-03-01T10:00:00"

# Send bulk messages from JSON file
zoomconnect sms send-bulk messages.json
zoomconnect sms send-bulk messages.json --rate 100  # 100 msgs/min

# List sent messages (via statistics)
zoomconnect sms list
zoomconnect sms list --from 01-02-2026 --to 20-02-2026
zoomconnect sms list --campaign "Newsletter"
```

### Account

```bash
# Check balance
zoomconnect account balance
zoomconnect account balance --json

# View statistics
zoomconnect account statistics
zoomconnect account statistics --from 01-01-2026 --to 31-01-2026
zoomconnect account statistics --campaign "Promo"
```

### Contacts

```bash
# List all contacts
zoomconnect contacts list
zoomconnect contacts list --json

# Create contact
zoomconnect contacts create --number +61412345678 --first-name John --last-name Doe --title "Customer"

# Get contact details
zoomconnect contacts get <contact-id>

# Update contact
zoomconnect contacts update <contact-id> --first-name Jane --last-name Smith

# Delete contact
zoomconnect contacts delete <contact-id>
```

## Bulk Messaging Format

Create a JSON file for bulk sends:

```json
[
  {
    "recipientNumber": "+61412345678",
    "message": "Hello User 1"
  },
  {
    "recipientNumber": "+61487654321",
    "message": "Hello User 2",
    "campaign": "Newsletter",
    "dataField": "custom-data"
  }
]
```

Then send:

```bash
zoomconnect sms send-bulk messages.json --rate 100
```

## Tips for Agents

1. Always use `--json` when parsing results programmatically
2. Date format for `--from` and `--to` is `dd-MM-yyyy` (e.g., "15-02-2026")
3. Date format for `--date` (scheduling) is ISO 8601 (e.g., "2026-03-01T10:00:00")
4. Phone numbers should include country code (e.g., +61 for Australia)
5. The `creditBalance` field in balance response shows remaining credits
6. Use campaigns to organize and track different message types
7. Message statistics are grouped by user and campaign
8. Rate limiting with `--rate` controls messages per minute for bulk sends

## Example Workflows

### Send promotional SMS to contacts
```bash
# Get all contacts
zoomconnect contacts list --json > contacts.json

# Create bulk message file from contacts
# ... process with jq or similar

# Send messages
zoomconnect sms send-bulk messages.json --rate 60
```

### Check balance before sending
```bash
BALANCE=$(zoomconnect account balance --json | jq -r '.creditBalance')
if (( $(echo "$BALANCE > 10" | bc -l) )); then
  zoomconnect sms send +61412345678 "Message"
fi
```

### Track campaign performance
```bash
zoomconnect account statistics --campaign "Summer2026" --from 01-01-2026 --to 28-02-2026 --json
```
