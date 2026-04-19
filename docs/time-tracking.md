# Time tracking guide

## Kimai API token

Kimai is the timesheet tool we use to log billable hours (hosted at clockit.xve-web.eu).

To get your API token:

1. Log in to Kimai
2. Click your name (top right) → **Profile**
3. Go to the **API access** tab
4. Copy the token — paste it as `CLOCKIT_TOKEN` in `~/.zshrc`

The token looks like a long string of random characters. It doesn't expire unless you regenerate it.

## What is ActivityWatch?

ActivityWatch runs in the background on your computer and automatically records what you're working on — which apps, websites, and files you have open, and for how long. It stores everything locally; nothing leaves your machine.

This data is used to:
- Suggest how many minutes to log to Kimai when you leave a client project
- Break down time per customer with `/aw` and `/aw-week`
- Catch gaps where you worked but forgot to log

**Install ActivityWatch:** [activitywatch.net](https://activitywatch.net)

After installing, also add these watchers for full coverage:
- **Browser** — install the [aw-watcher-web](https://activitywatch.net/watchers/) extension in Chrome or Firefox
- **VS Code** — install the `ActivityWatch` extension from the VS Code marketplace
- **Terminal** — run `/aw-setup` in Claude Code, it installs this automatically

## Troubleshooting

**Kimai commands not working**
- Check `CLOCKIT_TOKEN` is set: run `echo $CLOCKIT_TOKEN` in terminal
- Check `ENABLE_KIMAI=1` is in `~/.zshrc` and you've restarted your terminal or run `source ~/.zshrc`

**ActivityWatch shows no data**
- Make sure ActivityWatch is running (look for the icon in your menu bar)
- Run `/aw-setup` — it audits your watchers and tells you what's missing
- Check `ENABLE_ACTIVITYWATCH=1` is set in `~/.zshrc`

**Claude doesn't suggest logging time after working in a client repo**
- The Stop hook only fires when you end a Claude session in a matching repo
- Check your `XVE_CUSTOMER_N` vars include the right path hint for that repo
- Run `echo $XVE_CUSTOMER_1` etc. to verify they're loaded
