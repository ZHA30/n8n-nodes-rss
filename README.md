# n8n-nodes-rss

Create and serve RSS 2.0 feeds from n8n workflow data.

> [!NOTE]
> Tested with n8n 2.47.3.

## Features

Build feeds with configurable URLs, channel metadata, article fields, categories, and enclosures.

- **RSS URL**: Expose a GET endpoint that starts the workflow and defines the feed's channel metadata.
- **RSS Respond**: Map incoming items to RSS articles, select which items to include, and return the feed as XML.

## References

- [n8n](https://github.com/n8n-io/n8n)
- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
