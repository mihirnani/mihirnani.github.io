<?xml version="1.0" encoding="UTF-8"?>
<!-- feed.xsl – makes feed.xml readable when opened in a browser. Feed readers ignore it. -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="light dark"/>
  <title><xsl:value-of select="/rss/channel/title"/> · RSS</title>
  <link rel="stylesheet" href="style.css"/>
  <style>
    .feednote { border: 1px solid var(--line, #d8d0c3); padding: 1rem 1.2rem; margin: 0 0 2rem; color: var(--muted, #6f685d); font-size: 0.95rem; }
    .feednote code { font-size: 0.9em; word-break: break-all; }
  </style>
</head>
<body>
  <div class="page">
    <header class="top">
      <nav><a href="https://naniwadekar.com/">Curiosities</a><a href="index.html">Essays</a></nav>
    </header>
    <main>
      <p class="eyebrow">RSS feed</p>
      <h1><xsl:value-of select="/rss/channel/title"/></h1>
      <div class="feednote">
        <p>This is an RSS feed. To follow the essays, copy this page’s address into a feed reader – NetNewsWire, Feedly, Inoreader, Miniflux, Newsboat, or an email client with feed support such as Thunderbird:</p>
        <p><code><xsl:value-of select="/rss/channel/atom:link/@href"/></code></p>
        <p>The feed carries the full text of each essay.</p>
      </div>
      <ul class="essays">
        <xsl:for-each select="/rss/channel/item">
          <li>
            <span class="d"><xsl:value-of select="substring(pubDate, 6, 11)"/></span>
            <h2><a href="{link}"><xsl:value-of select="title"/></a></h2>
            <p><xsl:value-of select="description"/></p>
          </li>
        </xsl:for-each>
      </ul>
    </main>
    <footer class="bottom">Part of <a href="https://naniwadekar.com/">Curiosities</a>.</footer>
  </div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
