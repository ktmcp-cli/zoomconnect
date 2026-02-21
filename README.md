![Banner](https://raw.githubusercontent.com/ktmcp-cli/zoomconnect/main/banner.svg)

> "Six months ago, everyone was talking about MCPs. And I was like, screw MCPs. Every MCP would be better as a CLI."
>
> — [Peter Steinberger](https://twitter.com/steipete), Founder of OpenClaw
> [Watch on YouTube (~2:39:00)](https://www.youtube.com/@lexfridman) | [Lex Fridman Podcast #491](https://lexfridman.com/peter-steinberger/)

# Zoom Connect SMS CLI

> **⚠️ Unofficial CLI** - Not officially sponsored or affiliated with ZoomConnect.

A production-ready command-line interface for [Zoom Connect SMS API](https://www.zoomconnect.com/) — send SMS, manage contacts, and track your messaging campaigns directly from your terminal.

## Features

- **Send SMS** — Send single or bulk SMS messages
- **Contact Management** — Create, list, update, and delete contacts
- **Account Balance** — Check your SMS credit balance
- **Campaign Tracking** — View statistics and track message delivery
- **Bulk Messaging** — Send multiple messages from a JSON file
- **Scheduled Messages** — Schedule SMS for future delivery
- **JSON output** — All commands support `--json` for scripting
- **Colorized output** — Clean terminal output with chalk

## Installation

```bash
npm install -g @ktmcp-cli/zoomconnect
```

## Quick Start

```bash
# Get your API token at https://www.zoomconnect.com/app/api/rest
zoomconnect config set --email YOUR_EMAIL --token YOUR_API_TOKEN

# Send an SMS
zoomconnect sms send +61412345678 "Hello from the CLI!"

# Check your balance
zoomconnect account balance

# List contacts
zoomconnect contacts list
```

## Commands

### Config

```bash
zoomconnect config set --email <email> --token <token>
zoomconnect config show
```

### SMS

```bash
# Send a single SMS
zoomconnect sms send +61412345678 "Hello world"

# Send with campaign tracking
zoomconnect sms send +61412345678 "Promo message" --campaign "Summer Sale"

# Schedule for later (ISO format)
zoomconnect sms send +61412345678 "Reminder" --date "2026-03-01T10:00:00"

# Send bulk messages from JSON file
zoomconnect sms send-bulk messages.json
zoomconnect sms send-bulk messages.json --rate 60

# List sent messages (statistics)
zoomconnect sms list
zoomconnect sms list --from 01-02-2026 --to 20-02-2026
zoomconnect sms list --campaign "Summer Sale"
```

### Account

```bash
# Check credit balance
zoomconnect account balance

# View detailed statistics
zoomconnect account statistics
zoomconnect account statistics --from 01-01-2026 --to 31-01-2026
zoomconnect account statistics --campaign "Newsletter"
```

### Contacts

```bash
# List all contacts
zoomconnect contacts list
zoomconnect contacts list --json

# Create a new contact
zoomconnect contacts create --number +61412345678 --first-name John --last-name Doe

# Get contact details
zoomconnect contacts get <contact-id>

# Update a contact
zoomconnect contacts update <contact-id> --first-name Jane --title "Manager"

# Delete a contact
zoomconnect contacts delete <contact-id>
```

## Bulk Messaging

Create a JSON file with multiple messages:

```json
[
  {
    "recipientNumber": "+61412345678",
    "message": "Hello User 1"
  },
  {
    "recipientNumber": "+61487654321",
    "message": "Hello User 2",
    "campaign": "Newsletter"
  }
]
```

Send them all:

```bash
zoomconnect sms send-bulk messages.json --rate 100
```

## JSON Output

All commands support `--json` for structured output:

```bash
zoomconnect account balance --json | jq '.creditBalance'
zoomconnect contacts list --json | jq '.[] | select(.firstName == "John")'
zoomconnect sms send +61412345678 "Test" --json | jq '.messageId'
```

## Why CLI > MCP?

No server to run. No protocol overhead. Just install and go.

- **Simpler** — Just a binary you call directly
- **Composable** — Pipe to `jq`, `grep`, `awk`
- **Scriptable** — Works in cron jobs, CI/CD, shell scripts

## License

MIT — Part of the [Kill The MCP](https://killthemcp.com) project.


---

## Support KTMCP

If you find this CLI useful, we'd greatly appreciate your support! Share your experience on:
- Reddit
- Twitter/X
- Hacker News

**Incentive:** Users who can demonstrate that their support/advocacy helped advance KTMCP will have their feature requests and issues prioritized.

Just be mindful - these are real accounts and real communities. Authentic mentions and genuine recommendations go a long way!

## Support This Project

If you find this CLI useful, we'd appreciate support across Reddit, Twitter, Hacker News, or Moltbook. Please be mindful - these are real community accounts. Contributors who can demonstrate their support helped advance KTMCP will have their PRs and feature requests prioritized.
